import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  // 获取用户 VIP 信息
  const userData = db.prepare(`
    SELECT id, username, nickname, vip_type, vip_expires_at, vip_auto_renew
    FROM users
    WHERE id = ?
  `).get(ctx.user.id) as {
    id: string;
    username: string;
    nickname: string | null;
    vip_type: string;
    vip_expires_at: string | null;
    vip_auto_renew: number;
  };

  if (!userData) {
    return apiError('NOT_FOUND', '用户不存在', 404);
  }

  // 检查 VIP 是否过期
  let isVipActive = false;
  let vipStatus = 'free';

  if (userData.vip_type !== 'free' && userData.vip_expires_at) {
    const expiresAt = new Date(userData.vip_expires_at);
    const now = new Date();
    isVipActive = expiresAt > now;

    if (!isVipActive) {
      // VIP 已过期，重置为免费用户
      db.prepare(`
        UPDATE users
        SET vip_type = 'free', vip_expires_at = NULL, vip_auto_renew = 0
        WHERE id = ?
      `).run(ctx.user.id);
      vipStatus = 'free';
    } else {
      vipStatus = userData.vip_type;
    }
  }

  // 获取 VIP 权益
  const benefits = db.prepare(`
    SELECT benefit_key, benefit_value, description
    FROM vip_benefits
    WHERE plan_type = ?
  `).all(vipStatus) as Array<{
    benefit_key: string;
    benefit_value: string;
    description: string;
  }>;

  // 获取订阅记录
  const subscription = db.prepare(`
    SELECT id, plan_type, start_date, end_date, status, payment_method, amount
    FROM vip_subscriptions
    WHERE user_id = ? AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(ctx.user.id) as {
    id: string;
    plan_type: string;
    start_date: string;
    end_date: string;
    status: string;
    payment_method: string;
    amount: number;
  } | undefined;

  return apiSuccess({
    vipType: vipStatus,
    isVipActive,
    vipExpiresAt: userData.vip_expires_at,
    vipAutoRenew: userData.vip_auto_renew === 1,
    benefits: benefits.map(b => ({
      key: b.benefit_key,
      value: b.benefit_value,
      description: b.description
    })),
    subscription: subscription || null
  });
});
