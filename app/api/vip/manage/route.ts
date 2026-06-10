import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

// 取消 VIP 自动续费
export const POST = withRoute({ auth: 'user' }, async (request, ctx) => {
  // 取消自动续费
  db.prepare(`
    UPDATE users
    SET vip_auto_renew = 0
    WHERE id = ?
  `).run(ctx.user.id);

  // 更新订阅记录
  db.prepare(`
    UPDATE vip_subscriptions
    SET status = 'cancelled'
    WHERE user_id = ? AND status = 'active'
  `).run(ctx.user.id);

  return apiSuccess({ message: '已取消自动续费' });
});

// 获取 VIP 订阅历史
export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  const subscriptions = db.prepare(`
    SELECT id, plan_type, start_date, end_date, status, payment_method, amount, created_at
    FROM vip_subscriptions
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(ctx.user.id) as Array<{
    id: string;
    plan_type: string;
    start_date: string;
    end_date: string;
    status: string;
    payment_method: string;
    amount: number;
    created_at: string;
  }>;

  return apiSuccess({
    subscriptions: subscriptions.map(s => ({
      id: s.id,
      planType: s.plan_type,
      startDate: s.start_date,
      endDate: s.end_date,
      status: s.status,
      paymentMethod: s.payment_method,
      amount: s.amount,
      createdAt: s.created_at
    }))
  });
});
