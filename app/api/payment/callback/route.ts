import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNo, transactionId, status = 'success' } = body;

    if (!orderNo) {
      return NextResponse.json({ error: '订单号不能为空' }, { status: 400 });
    }

    // 查询订单
    const transaction = db.prepare(`
      SELECT id, user_id, order_no, amount, status
      FROM payment_transactions
      WHERE order_no = ?
    `).get(orderNo) as {
      id: string;
      user_id: string;
      order_no: string;
      amount: number;
      status: string;
    } | undefined;

    if (!transaction) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (transaction.status === 'paid') {
      return NextResponse.json({
        success: true,
        message: '订单已支付'
      });
    }

    // 更新交易状态
    db.prepare(`
      UPDATE payment_transactions
      SET status = 'paid',
          transaction_id = ?,
          paid_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE order_no = ?
    `).run(transactionId || uuidv4(), orderNo);

    // 如果是 VIP 订阅订单，激活 VIP
    if (orderNo.startsWith('VIP')) {
      // 解析订单号获取套餐类型（实际应该从数据库查询）
      const userData = db.prepare(`
        SELECT vip_type, vip_expires_at
        FROM users
        WHERE id = ?
      `).get(transaction.user_id) as {
        vip_type: string;
        vip_expires_at: string | null;
      };

      // 根据金额判断套餐类型
      let planType = 'monthly';
      if (transaction.amount >= 9900) {
        planType = 'yearly';
      }

      // 计算到期时间
      const now = new Date();
      let endDate = new Date(now);

      if (userData.vip_type !== 'free' && userData.vip_expires_at) {
        const expiresAt = new Date(userData.vip_expires_at);
        if (expiresAt > now) {
          endDate = expiresAt;
        }
      }

      if (planType === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // 创建 VIP 订阅记录
      const subscriptionId = uuidv4();
      db.prepare(`
        INSERT INTO vip_subscriptions (
          id, user_id, plan_type, start_date, end_date,
          status, payment_method, amount, transaction_id, created_at, updated_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, 'active', 'online', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        subscriptionId,
        transaction.user_id,
        planType,
        endDate.toISOString(),
        transaction.amount,
        transactionId || uuidv4()
      );

      // 更新用户 VIP 状态
      db.prepare(`
        UPDATE users
        SET vip_type = ?, vip_expires_at = ?
        WHERE id = ?
      `).run(planType, endDate.toISOString(), transaction.user_id);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderNo,
        status: 'paid',
        paidAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json(
      { error: '支付回调处理失败' },
      { status: 500 }
    );
  }
}

// 查询订单状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNo = searchParams.get('orderNo');

    if (!orderNo) {
      return NextResponse.json({ error: '订单号不能为空' }, { status: 400 });
    }

    const transaction = db.prepare(`
      SELECT id, user_id, order_no, amount, payment_method, status, paid_at, created_at
      FROM payment_transactions
      WHERE order_no = ?
    `).get(orderNo) as {
      id: string;
      user_id: string;
      order_no: string;
      amount: number;
      payment_method: string;
      status: string;
      paid_at: string | null;
      created_at: string;
    } | undefined;

    if (!transaction) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        orderNo: transaction.order_no,
        amount: transaction.amount,
        paymentMethod: transaction.payment_method,
        status: transaction.status,
        paidAt: transaction.paid_at,
        createdAt: transaction.created_at
      }
    });

  } catch (error) {
    console.error('Payment query error:', error);
    return NextResponse.json(
      { error: '查询订单失败' },
      { status: 500 }
    );
  }
}
