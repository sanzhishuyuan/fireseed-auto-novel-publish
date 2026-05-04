import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-novel-secret-key-2024';

export async function POST(request: NextRequest) {
  // P0-4: 速率限制（每分钟最多10次注册尝试）
  const rateLimit = checkRateLimit(request, undefined, 'auth');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  try {
    const body = await request.text();
    const { username, password } = JSON.parse(body);

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

    // === 自动创建 JWT Token（免二次登录）===
    const jwtToken = jwt.sign(
      { userId, username, role: 'reader', type: 'access' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

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

    return NextResponse.json({
      success: true,
      userId,
      jwt_token: jwtToken,
      api_token: apiTokenRaw,
      username
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
