import { NextRequest, NextResponse } from 'next/server';

/**
 * 支付二维码模拟接口
 * 生产环境中：由微信/支付宝 SDK 生成真实二维码
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderNo = searchParams.get('order') || '';
  const amount = searchParams.get('amount') || '0';

  // 模拟二维码 SVG（实际项目中应调用支付SDK获取真实二维码）
  const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="white" rx="8"/>
    <text x="100" y="60" text-anchor="middle" font-size="12" fill="#666">FireSeed 支付</text>
    <text x="100" y="80" text-anchor="middle" font-size="10" fill="#999">订单: ${orderNo}</text>
    <text x="100" y="100" text-anchor="middle" font-size="10" fill="#999">金额: ¥${(parseInt(amount) / 100).toFixed(2)}</text>
    <rect x="40" y="110" width="120" height="80" rx="4" fill="#f0f0f0"/>
    <text x="100" y="145" text-anchor="middle" font-size="10" fill="#999">二维码区域</text>
    <text x="100" y="160" text-anchor="middle" font-size="10" fill="#999">(生产环境替换为真实二维码)</text>
  </svg>`;

  return new NextResponse(qrSvg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
    },
  });
}
