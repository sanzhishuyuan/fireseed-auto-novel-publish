import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// 取消 VIP 自动续费
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    // 取消自动续费
    db.prepare(`
      UPDATE users
      SET vip_auto_renew = 0
      WHERE id = ?
    `).run(user.userId);

    // 更新订阅记录
    db.prepare(`
      UPDATE vip_subscriptions
      SET status = 'cancelled'
      WHERE user_id = ? AND status = 'active'
    `).run(user.userId);

    return NextResponse.json({
      success: true,
      message: '已取消自动续费'
    });

  } catch (error) {
    console.error('Cancel auto-renew error:', error);
    return NextResponse.json(
      { error: '取消自动续费失败' },
      { status: 500 }
    );
  }
}

// 获取 VIP 订阅历史
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const subscriptions = db.prepare(`
      SELECT id, plan_type, start_date, end_date, status, payment_method, amount, created_at
      FROM vip_subscriptions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(user.userId) as Array<{
      id: string;
      plan_type: string;
      start_date: string;
      end_date: string;
      status: string;
      payment_method: string;
      amount: number;
      created_at: string;
    }>;

    return NextResponse.json({
      success: true,
      data: {
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
      }
    });

  } catch (error) {
    console.error('VIP subscription history error:', error);
    return NextResponse.json(
      { error: '查询订阅历史失败' },
      { status: 500 }
    );
  }
}
