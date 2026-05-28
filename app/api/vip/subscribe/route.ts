import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const body = await request.json();
    const { planType, paymentMethod = 'seed' } = body;

    // 验证套餐类型
    if (!['monthly', 'yearly'].includes(planType)) {
      return NextResponse.json({ error: '无效的套餐类型' }, { status: 400 });
    }

    // 检查用户当前 VIP 状态
    const userData = db.prepare(`
      SELECT vip_type, vip_expires_at
      FROM users
      WHERE id = ?
    `).get(user.userId) as {
      vip_type: string;
      vip_expires_at: string | null;
    };

    // 计算价格和时间
    const amount = planType === 'monthly' ? 990 : 9900; // 单位：分
    const now = new Date();
    let startDate = now;
    let endDate = new Date(now);

    if (planType === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // 如果用户已有有效 VIP，则延期
    if (userData.vip_type !== 'free' && userData.vip_expires_at) {
      const expiresAt = new Date(userData.vip_expires_at);
      if (expiresAt > now) {
        startDate = expiresAt;
        endDate = new Date(expiresAt);
        if (planType === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
      }
    }

    // 使用 SEED 代币支付
    if (paymentMethod === 'seed') {
      // 获取用户 SEED 余额
      const seedBalance = db.prepare(`
        SELECT COALESCE(SUM(
          CASE WHEN type = 'credit' THEN amount
               WHEN type = 'debit' THEN -amount
               ELSE 0
          END
        ), 0) as balance
        FROM tokens
        WHERE user_id = ?
      `).get(user.userId) as { balance: number };

      if (!seedBalance || seedBalance.balance < amount) {
        return NextResponse.json(
          { error: 'SEED 余额不足' },
          { status: 400 }
        );
      }

      // 扣除 SEED
      const transactionId = uuidv4();
      db.prepare(`
        INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
        VALUES (?, ?, 'debit', ?, 'VIP订阅', CURRENT_TIMESTAMP)
      `).run(transactionId, user.userId, amount);

      // 创建 VIP 订阅记录
      const subscriptionId = uuidv4();
      db.prepare(`
        INSERT INTO vip_subscriptions (
          id, user_id, plan_type, start_date, end_date,
          status, payment_method, amount, transaction_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'active', 'seed', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        subscriptionId,
        user.userId,
        planType,
        startDate.toISOString(),
        endDate.toISOString(),
        amount,
        transactionId
      );

      // 更新用户 VIP 状态
      db.prepare(`
        UPDATE users
        SET vip_type = ?, vip_expires_at = ?
        WHERE id = ?
      `).run(planType, endDate.toISOString(), user.userId);

      return NextResponse.json({
        success: true,
        data: {
          subscriptionId,
          planType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          amount,
          paymentMethod: 'seed'
        }
      });
    }

    // 其他支付方式（微信、支付宝等）- 创建待支付订单
    const orderNo = `VIP${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
    const transactionId = uuidv4();

    db.prepare(`
      INSERT INTO payment_transactions (
        id, user_id, order_no, amount, currency,
        payment_method, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'CNY', ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(transactionId, user.userId, orderNo, amount, paymentMethod);

    // 返回支付信息（实际项目中这里应该调用支付 SDK）
    return NextResponse.json({
      success: true,
      data: {
        orderNo,
        amount,
        paymentMethod,
        qrCodeUrl: `/api/payment/qrcode?order=${orderNo}`, // 模拟支付二维码
        payUrl: `/api/payment/pay?order=${orderNo}` // 模拟支付链接
      }
    });

  } catch (error) {
    console.error('VIP subscribe error:', error);
    return NextResponse.json(
      { error: '订阅失败' },
      { status: 500 }
    );
  }
}
