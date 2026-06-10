import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { createPaymentOrder, PaymentMethod, simulatePayment, PAYMENT_CONFIG } from '@/lib/payment';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

// VIP 套餐价格（单位：分）
const PLAN_PRICES: Record<string, number> = {
  monthly: 990,   // ¥9.9
  yearly: 9900,   // ¥99
};

const PLAN_NAMES: Record<string, string> = {
  monthly: '高级会员',
  yearly: '年度会员',
};

export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { planType, paymentMethod } = ctx.body;

  // 验证套餐类型
  if (!['monthly', 'yearly'].includes(planType)) {
    return apiError('VALIDATION_INVALID_PARAM', '无效的套餐类型', 400);
  }

  // 验证支付方式
  const validMethods = ['seed', 'wechat', 'alipay', 'simulate'];
  if (!validMethods.includes(paymentMethod)) {
    return apiError('VALIDATION_INVALID_PARAM', '不支持的支付方式', 400);
  }

  const amount = PLAN_PRICES[planType];
  const planName = PLAN_NAMES[planType];

  // 检查用户当前 VIP 状态
  const userData = db.prepare(`
    SELECT vip_type, vip_expires_at
    FROM users WHERE id = ?
  `).get(ctx.user.id) as { vip_type: string; vip_expires_at: string | null };

  // 计算有效期
  const now = new Date();
  let startDate = now;
  let endDate = new Date(now);

  if (planType === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  // 已有有效 VIP 则延期
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

  // ========== 1. SEED 代币支付（即时到账） ==========
  if (paymentMethod === 'seed') {
    // 查余额（使用 wallet 系统）
    const wallet = db.prepare(`
      SELECT balance FROM wallets WHERE user_id = ?
    `).get(ctx.user.id) as { balance: number } | undefined;

    if (!wallet || wallet.balance < amount) {
      return apiError('SEED_INSUFFICIENT', 'SEED 余额不足', 400);
    }

    const transactionId = uuidv4();

    // SEED 扣款
    db.prepare(`UPDATE wallets SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?`)
      .run(amount, amount, ctx.user.id);
    db.prepare(`INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
      VALUES (?, ?, 'debit', ?, 'VIP订阅', CURRENT_TIMESTAMP)`)
      .run(uuidv4(), ctx.user.id, amount);

    // 创建 VIP 订阅记录
    const subscriptionId = uuidv4();
    db.prepare(`INSERT INTO vip_subscriptions
      (id, user_id, plan_type, start_date, end_date, status, payment_method, amount, transaction_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', 'seed', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .run(subscriptionId, ctx.user.id, planType, startDate.toISOString(), endDate.toISOString(), amount, transactionId);

    // 更新用户 VIP
    db.prepare(`UPDATE users SET vip_type = ?, vip_expires_at = ? WHERE id = ?`)
      .run(planType, endDate.toISOString(), ctx.user.id);

    return apiSuccess({
      paymentMethod: 'seed',
      planType,
      subscriptionId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      amount,
      paid: true
    });
  }

  // ========== 2. 在线支付（微信/支付宝/模拟） ==========
  const orderNo = `VIP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const transactionId = uuidv4();

  // 创建支付订单
  const paymentOrder = createPaymentOrder(paymentMethod as PaymentMethod, amount, `VIP订阅-${planName}`);

  // 写入数据库
  db.prepare(`
    INSERT INTO payment_transactions (id, user_id, order_no, amount, currency, payment_method, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'CNY', ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(transactionId, ctx.user.id, orderNo, amount, paymentMethod);

  // 保存订单与 VIP 订阅的关联
  db.prepare(`
    INSERT INTO vip_subscriptions
    (id, user_id, plan_type, start_date, end_date, status, payment_method, amount, transaction_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(uuidv4(), ctx.user.id, planType, startDate.toISOString(), endDate.toISOString(), paymentMethod, amount, transactionId);

  // ========== 3. 模拟支付（测试用） ==========
  if (paymentMethod === 'simulate') {
    // 模拟支付成功
    simulatePayment(orderNo);

    // 更新交易状态
    db.prepare(`UPDATE payment_transactions SET status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE order_no = ?`)
      .run(orderNo);

    // 更新 VIP 订阅状态
    db.prepare(`UPDATE vip_subscriptions SET status = 'active' WHERE transaction_id = ?`)
      .run(transactionId);

    // 激活 VIP
    db.prepare(`UPDATE users SET vip_type = ?, vip_expires_at = ? WHERE id = ?`)
      .run(planType, endDate.toISOString(), ctx.user.id);

    return apiSuccess({
      paymentMethod: 'simulate',
      planType,
      orderNo,
      amount,
      paid: true
    });
  }

  // 微信/支付宝 - 返回支付信息
  return apiSuccess({
    paymentMethod,
    planType,
    orderNo,
    amount,
    qrCodeUrl: paymentOrder.qrCodeUrl,
    payUrl: paymentOrder.payUrl,
    paid: false,
    payTip: paymentMethod === 'wechat'
      ? '请使用微信扫一扫支付'
      : paymentMethod === 'alipay'
      ? '请使用支付宝扫一扫支付'
      : '请完成支付'
  });
});
