import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // 获取用户 VIP 信息
    const userData = db.prepare(`
      SELECT id, username, nickname, vip_type, vip_expires_at, vip_auto_renew
      FROM users
      WHERE id = ?
    `).get(user.userId) as {
      id: string;
      username: string;
      nickname: string | null;
      vip_type: string;
      vip_expires_at: string | null;
      vip_auto_renew: number;
    };

    if (!userData) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
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
        `).run(user.userId);
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
    `).get(user.userId) as {
      id: string;
      plan_type: string;
      start_date: string;
      end_date: string;
      status: string;
      payment_method: string;
      amount: number;
    } | undefined;

    return NextResponse.json({
      success: true,
      data: {
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
      }
    });

  } catch (error) {
    console.error('VIP status error:', error);
    return NextResponse.json(
      { error: '获取VIP状态失败' },
      { status: 500 }
    );
  }
}
