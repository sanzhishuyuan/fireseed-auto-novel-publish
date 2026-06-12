import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { safeParseJSON } from '@/lib/request-parser';
import { getOrCreateWallet, transferSeed } from '@/lib/seed';
import { sendNewUserNotification, sendWelcomeEmail } from '@/lib/mail';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-novel-secret-key-2024';

export async function POST(request: NextRequest) {
  // P0-4: 速率限制（每分钟最多10次注册尝试）
  const rateLimit = checkRateLimit(request, undefined, 'auth');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  try {
    const bodyText = await request.text();
    // 安全解析 JSON
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const { username, password, referralCode } = parsed.data;

    if (!username || !password) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: '用户名需3-20位' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    }

    // 检查用户是否存在
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // 创建用户
    db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)')
      .run(userId, username, hashedPassword, 'reader');

    // 🌱 创建 SEED 钱包并赠送 100 注册红包
    getOrCreateWallet(userId);
    transferSeed(userId, 100, 'register_bonus', {
      description: '🎉 注册成功，赠送 100 🌱 新手红包！可用于点赞、收藏等互动~'
    });

    // === 处理推广码 ===
    if (referralCode) {
      try {
        const referral = db.prepare(`
          SELECT id, user_id, code FROM referral_codes WHERE code = ? AND is_active = 1
        `).get(referralCode) as { id: string; user_id: string; code: string } | undefined;

        if (referral && referral.user_id !== userId) {
          const alreadyUsed = db.prepare(`
            SELECT id FROM referral_redemptions WHERE new_user_id = ?
          `).get(userId) as { id: string } | undefined;

          if (!alreadyUsed) {
            const referrer = db.prepare(`
              SELECT vip_type, vip_expires_at FROM users WHERE id = ?
            `).get(referral.user_id) as { vip_type: string; vip_expires_at: string | null };

            let bonusMultiplier = 1;
            if (referrer.vip_type === 'monthly' && referrer.vip_expires_at) {
              const expires = new Date(referrer.vip_expires_at);
              if (expires > new Date()) bonusMultiplier = 1.5;
            } else if (referrer.vip_type === 'yearly' && referrer.vip_expires_at) {
              const expires = new Date(referrer.vip_expires_at);
              if (expires > new Date()) bonusMultiplier = 2;
            }

            const baseReward = 50;
            const referrerReward = Math.floor(baseReward * bonusMultiplier);
            const newUserReward = 30;

            db.transaction(() => {
              db.prepare(`INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
                VALUES (?, ?, 'credit', ?, ?, CURRENT_TIMESTAMP)`)
                .run(uuidv4(), referral.user_id, referrerReward, `推广奖励(x${bonusMultiplier}): ${referralCode}`);

              db.prepare(`INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
                VALUES (?, ?, 'credit', ?, ?, CURRENT_TIMESTAMP)`)
                .run(uuidv4(), userId, newUserReward, `注册推广奖励: ${referralCode}`);

              db.prepare(`INSERT INTO referral_redemptions
                (id, referral_code, referrer_id, new_user_id, status, reward_given)
                VALUES (?, ?, ?, ?, 'completed', ?)`)
                .run(uuidv4(), referralCode, referral.user_id, userId, referrerReward + newUserReward);

              db.prepare(`UPDATE referral_codes SET total_uses = total_uses + 1,
                successful_uses = successful_uses + 1 WHERE id = ?`).run(referral.id);

              db.prepare(`UPDATE users SET referral_count = referral_count + 1,
                referral_earnings = referral_earnings + ? WHERE id = ?`)
                .run(referrerReward, referral.user_id);

              // 新用户3天VIP试用
              const vipEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
              db.prepare(`UPDATE users SET vip_type = 'monthly', vip_expires_at = ?
                WHERE id = ? AND (vip_type = 'free' OR vip_expires_at IS NULL OR vip_expires_at < CURRENT_TIMESTAMP)`)
                .run(vipEnd.toISOString(), userId);
            })();
          }
        }
      } catch (e) {
        console.warn('Referral processing failed (non-blocking):', e);
      }
    }

    // === 自动创建 JWT Token（免二次登录）===
    const jwtToken = jwt.sign(
      { userId, username, role: 'reader', type: 'access' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // === 设置 auth_token cookie，使注册后立即处于登录状态 ===
    // 注意：需要在 NextResponse.json 之前设置，因为 cookies().set 在 RSC 中才可用
    // 这里直接构建 response 并设置 cookie

    // === 自动创建永久的 API Token（给 AI 用）===
    const apiTokenRaw = 'fs_' + uuidv4().replace(/-/g, '') + '_' + Date.now().toString(36);
    const tokenId = uuidv4();
    db.prepare(`
      INSERT INTO user_tokens (id, user_id, token, name, permissions, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(tokenId, userId, apiTokenRaw, '默认 Token（注册自动生成）', '["create_novel","create_chapter"]');

    // 记录激活
    try {
      db.prepare(`
        INSERT INTO skill_activations (id, user_id, skill_version, client_type)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), userId, 'register-auto', 'web-register');
    } catch (_) { /* 忽略 */ }

    // 异步发送管理员通知（SMTP 未配置时静默跳过）
    sendNewUserNotification({
      username,
      userId,
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    // 异步发送欢迎邮件给新用户（SMTP 未配置时静默跳过）
    sendWelcomeEmail({
      username,
      userId,
    }).catch(() => {});

    const response = NextResponse.json({
      success: true,
      userId,
      jwt_token: jwtToken,
      api_token: apiTokenRaw,
      username
    });

    // 设置 auth_token cookie，使注册后立即处于登录状态
    response.cookies.set('auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
