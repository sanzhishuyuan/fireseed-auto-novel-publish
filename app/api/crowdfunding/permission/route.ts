import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ADMIN_ROLES, type Role } from '@/lib/permissions';

/**
 * GET /api/crowdfunding/permission
 * 检查当前用户是否有权发起众筹
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({
        success: true,
        canCreate: false,
        reason: '未登录',
        reasonCode: 'NOT_LOGGED_IN',
      });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({
        success: true,
        canCreate: false,
        reason: '登录已过期',
        reasonCode: 'TOKEN_EXPIRED',
      });
    }

    // 管理员始终可以
    const isAdmin = ADMIN_ROLES.includes(user.role as Role);
    if (isAdmin) {
      return NextResponse.json({
        success: true,
        canCreate: true,
        via: 'admin',
        role: user.role,
      });
    }

    // 检查 VIP
    const userData = db.prepare(
      'SELECT vip_type, vip_expires_at FROM users WHERE id = ?'
    ).get(user.userId) as { vip_type: string; vip_expires_at: string | null } | undefined;

    if (userData && userData.vip_type !== 'free' && userData.vip_expires_at) {
      const expiresAt = new Date(userData.vip_expires_at);
      if (expiresAt > new Date()) {
        return NextResponse.json({
          success: true,
          canCreate: true,
          via: 'vip',
          vipType: userData.vip_type,
          vipExpiresAt: userData.vip_expires_at,
        });
      }
    }

    return NextResponse.json({
      success: true,
      canCreate: false,
      reason: '发起众筹需要 VIP 会员权限',
      reasonCode: 'VIP_REQUIRED',
      currentVipType: userData?.vip_type || 'free',
    });

  } catch (error) {
    console.error('Crowdfunding permission check error:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
