import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 兑换推广码（注册时调用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, newUserId } = body;

    if (!code || !newUserId) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 查找推广码
    const referral = db.prepare(`
      SELECT id, user_id, code, successful_uses
      FROM referral_codes
      WHERE code = ? AND is_active = 1
    `).get(code) as {
      id: string;
      user_id: string;
      code: string;
      successful_uses: number;
    } | undefined;

    if (!referral) {
      return NextResponse.json({ error: '无效的推广码' }, { status: 404 });
    }

    // 不能自己推广自己
    if (referral.user_id === newUserId) {
      return NextResponse.json({ error: '不能使用自己的推广码' }, { status: 400 });
    }

    // 检查是否已经使用过推广码
    const existingRedemption = db.prepare(`
      SELECT id FROM referral_redemptions
      WHERE new_user_id = ?
    `).get(newUserId) as { id: string } | undefined;

    if (existingRedemption) {
      return NextResponse.json({ error: '该用户已使用过推广码' }, { status: 400 });
    }

    // 获取推荐人的VIP状态（影响奖励倍率）
    const referrer = db.prepare(`
      SELECT vip_type, vip_expires_at
      FROM users WHERE id = ?
    `).get(referral.user_id) as { vip_type: string; vip_expires_at: string | null };

    let bonusMultiplier = 1;
    if (referrer.vip_type === 'monthly' && referrer.vip_expires_at) {
      const expires = new Date(referrer.vip_expires_at);
      if (expires > new Date()) bonusMultiplier = 1.5;
    } else if (referrer.vip_type === 'yearly' && referrer.vip_expires_at) {
      const expires = new Date(referrer.vip_expires_at);
      if (expires > new Date()) bonusMultiplier = 2;
    }

    const baseReward = 50; // 基础奖励 50 SEED
    const referrerReward = Math.floor(baseReward * bonusMultiplier);
    const newUserReward = 30; // 新用户奖励 30 SEED
    const redemptionId = uuidv4();

    // 事务：发放奖励 + 更新统计
    const txn = db.transaction(() => {
      // 1. 发放推荐人奖励
      db.prepare(`
        INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
        VALUES (?, ?, 'credit', ?, ?, CURRENT_TIMESTAMP)
      `).run(uuidv4(), referral.user_id, referrerReward,
        `推广奖励(x${bonusMultiplier}): ${code}`);

      // 2. 发放新用户奖励
      db.prepare(`
        INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
        VALUES (?, ?, 'credit', ?, ?, CURRENT_TIMESTAMP)
      `).run(uuidv4(), newUserId, newUserReward,
        `注册推广奖励: ${code}`);

      // 3. 记录兑换
      db.prepare(`
        INSERT INTO referral_redemptions (id, referral_code, referrer_id, new_user_id, status, reward_given)
        VALUES (?, ?, ?, ?, 'completed', ?)
      `).run(redemptionId, code, referral.user_id, newUserId, referrerReward + newUserReward);

      // 4. 更新推广码统计
      db.prepare(`
        UPDATE referral_codes
        SET total_uses = total_uses + 1, successful_uses = successful_uses + 1
        WHERE id = ?
      `).run(referral.id);

      // 5. 更新推荐人统计
      db.prepare(`
        UPDATE users
        SET referral_count = referral_count + 1,
            referral_earnings = referral_earnings + ?
        WHERE id = ?
      `).run(referrerReward, referral.user_id);

      // 6. 给新用户赠送3天VIP试用
      const vipEnd = new Date();
      vipEnd.setDate(vipEnd.getDate() + 3);
      db.prepare(`
        UPDATE users
        SET vip_type = 'monthly', vip_expires_at = ?
        WHERE id = ? AND (vip_type = 'free' OR vip_expires_at IS NULL OR vip_expires_at < CURRENT_TIMESTAMP)
      `).run(vipEnd.toISOString(), newUserId);
    });

    txn();

    return NextResponse.json({
      success: true,
      data: {
        redemptionId,
        referrerReward,
        newUserReward,
        bonusMultiplier,
        vipTrialDays: 3,
        code
      }
    });

  } catch (error) {
    console.error('Referral redeem error:', error);
    return NextResponse.json({ error: '兑换推广码失败' }, { status: 500 });
  }
}
