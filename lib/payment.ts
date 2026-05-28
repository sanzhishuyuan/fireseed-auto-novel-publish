/**
 * FireSeed Payment Gateway
 * 支付网关：支持 SEED、微信支付、支付宝、模拟支付
 */

export type PaymentMethod = 'seed' | 'wechat' | 'alipay' | 'simulate';

export interface PaymentOrder {
  orderNo: string;
  amount: number;       // 单位：分（CNY）
  method: PaymentMethod;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  qrCodeUrl?: string;   // 支付二维码（微信/支付宝）
  payUrl?: string;       // 支付链接
  paidAt?: string;
}

// 支付配置（生产环境替换为真实商户号）
export const PAYMENT_CONFIG = {
  wechat: {
    appId: process.env.WECHAT_APP_ID || 'wx_simulate',
    mchId: process.env.WECHAT_MCH_ID || 'simulate_mch',
    apiKey: process.env.WECHAT_API_KEY || 'simulate_key',
    // 正式环境: 调用微信支付统一下单 API
    // 测试环境: 生成模拟二维码
  },
  alipay: {
    appId: process.env.ALIPAY_APP_ID || 'alipay_simulate',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    // 正式环境: 调用支付宝当面付 API
    // 测试环境: 生成模拟支付表单
  },
  siteUrl: 'https://fireseed.online',
};

/**
 * 创建支付订单
 */
export function createPaymentOrder(
  method: PaymentMethod,
  amount: number,
  description: string
): PaymentOrder {
  const orderNo = `PAY${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  switch (method) {
    case 'wechat':
      return {
        orderNo,
        amount,
        method: 'wechat',
        status: 'pending',
        // 微信 Native 支付返回 code_url，前端生成二维码
        qrCodeUrl: `/api/payment/qrcode?order=${orderNo}&amount=${amount}`,
        payUrl: `weixin://wxpay/bizpayurl?pr=${orderNo}`,
      };

    case 'alipay':
      return {
        orderNo,
        amount,
        method: 'alipay',
        status: 'pending',
        // 支付宝返回付款链接
        payUrl: `/api/payment/alipay/form?order=${orderNo}&amount=${amount}`,
      };

    case 'simulate':
      return {
        orderNo,
        amount,
        method: 'simulate',
        status: 'pending',
        qrCodeUrl: `/api/payment/qrcode?order=${orderNo}&amount=${amount}`,
      };

    default:
      throw new Error(`不支持的支付方式: ${method}`);
  }
}

/**
 * 模拟支付（仅开发/测试环境）
 * 在生产环境中应由支付回调处理
 */
export function simulatePayment(orderNo: string): boolean {
  console.log(`[Payment Simulate] 模拟支付完成: ${orderNo}`);
  return true;
}

/**
 * 获取支付方式的中文名称
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    seed: 'SEED 代币',
    wechat: '微信支付',
    alipay: '支付宝',
    simulate: '模拟支付（测试）',
  };
  return labels[method];
}

/**
 * 格式化金额（分 → 元）
 */
export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}
