import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserIdFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ user: null, loggedIn: false });
    }

    const token = request.cookies.get('auth_token')?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ user: null, loggedIn: false });
    }

    // 获取用户最新信息
    const user = db.prepare('SELECT id, username, nickname, role, created_at FROM users WHERE id = ?')
      .get(payload.userId) as any;

    if (!user) {
      return NextResponse.json({ user: null, loggedIn: false });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname || user.username,
        role: user.role
      },
      loggedIn: true
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ user: null, loggedIn: false, error: '获取用户信息失败' }, { status: 500 });
  }
}
