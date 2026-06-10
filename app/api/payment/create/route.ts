import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { amount, paymentMethod = 'wechat', description = 'VIP订阅' } = ctx.body;

  if (!amount || amount <= 0) {
    return apiError('VALIDATION_INVALID_PARAM', '无效的金额', 400);
  }

  // 创建支付订单
  const orderNo = `PAY${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
  const transactionId = uuidv4();

  db.prepare(`
    INSERT INTO payment_transactions (
      id, user_id, order_no, amount, currency,
      payment_method, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'CNY', ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(transactionId, ctx.user.id, orderNo, amount, paymentMethod);

  // 根据支付方式返回不同的支付信息
  let paymentData: any = {
    orderNo,
    amount,
    paymentMethod
  };

  if (paymentMethod === 'wechat') {
    // 微信支付 - 返回二维码链接
    paymentData.qrCodeUrl = `/api/payment/qrcode?order=${orderNo}`;
    paymentData.payUrl = `weixin://pay?order=${orderNo}`;
  } else if (paymentMethod === 'alipay') {
    // 支付宝 - 返回支付表单 URL
    paymentData.payUrl = `/api/payment/alipay?order=${orderNo}`;
  } else if (paymentMethod === 'seed') {
    // SEED 代币支付 - 直接扣款
    const seedBalance = db.prepare(`
      SELECT COALESCE(SUM(
        CASE WHEN type = 'credit' THEN amount
             WHEN type = 'debit' THEN -amount
             ELSE 0
        END
      ), 0) as balance
      FROM tokens
      WHERE user_id = ?
    `).get(ctx.user.id) as { balance: number };

    if (!seedBalance || seedBalance.balance < amount) {
      return apiError('SEED_INSUFFICIENT', 'SEED 余额不足', 400);
    }

    // 扣除 SEED
    db.prepare(`
      INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
      VALUES (?, ?, 'debit', ?, ?, CURRENT_TIMESTAMP)
    `).run(uuidv4(), ctx.user.id, amount, description);

    // 更新交易状态为已支付
    db.prepare(`
      UPDATE payment_transactions
      SET status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE order_no = ?
    `).run(orderNo);

    paymentData.paid = true;
    paymentData.paidAt = new Date().toISOString();
  }

  return apiSuccess(paymentData);
});
