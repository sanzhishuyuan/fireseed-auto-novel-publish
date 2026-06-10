import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    // 获取用户信息
    const userData = db.prepare(`
      SELECT id, username, nickname, email, role, vip_type, vip_expires_at, created_at
      FROM users
      WHERE id = ?
    `).get(user.userId) as {
      id: string;
      username: string;
      nickname: string | null;
      email: string | null;
      role: string;
      vip_type: string;
      vip_expires_at: string | null;
      created_at: string;
    } | undefined;

    if (!userData) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查 VIP 是否过期
    let isVipActive = false;
    if (userData.vip_type !== 'free' && userData.vip_expires_at) {
      const expiresAt = new Date(userData.vip_expires_at);
      const now = new Date();
      isVipActive = expiresAt > now;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: userData.id,
        username: userData.username,
        nickname: userData.nickname,
        email: userData.email,
        role: userData.role,
        vipType: isVipActive ? userData.vip_type : 'free',
        vipExpiresAt: isVipActive ? userData.vip_expires_at : null,
        createdAt: userData.created_at
      }
    });

  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
