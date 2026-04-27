import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null, loggedIn: false });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null, loggedIn: false });
    }

    // 获取用户最新信息
    const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?')
      .get(payload.userId) as any;

    if (!user) {
      return NextResponse.json({ user: null, loggedIn: false });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      loggedIn: true
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ user: null, loggedIn: false, error: '获取用户信息失败' }, { status: 500 });
  }
}
