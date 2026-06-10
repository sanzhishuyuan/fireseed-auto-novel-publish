import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

// 查询用户订单列表
export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 可选过滤条件
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = `
    SELECT id, order_no, amount, payment_method, status, paid_at, created_at
    FROM payment_transactions
    WHERE user_id = ?
  `;
  const params: any[] = [ctx.user.id];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const transactions = db.prepare(query).all(...params) as Array<{
    id: string;
    order_no: string;
    amount: number;
    payment_method: string;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>;

  // 获取总数
  let countQuery = `
    SELECT COUNT(*) as total
    FROM payment_transactions
    WHERE user_id = ?
  `;
  const countParams: any[] = [ctx.user.id];

  if (status) {
    countQuery += ` AND status = ?`;
    countParams.push(status);
  }

  const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

  return apiSuccess({
    transactions: transactions.map(t => ({
      id: t.id,
      orderNo: t.order_no,
      amount: t.amount,
      paymentMethod: t.payment_method,
      status: t.status,
      paidAt: t.paid_at,
      createdAt: t.created_at
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + transactions.length < total
    }
  });
});
