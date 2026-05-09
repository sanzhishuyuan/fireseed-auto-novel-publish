import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';
import db from '@/lib/db';
import type { Role } from '@/lib/permissions';
import { ROLE_LABELS } from '@/lib/permissions';

/**
 * GET /api/admin/me
 * 获取当前管理员信息（用于前端角色判断）
 */
export async function GET(request: NextRequest) {
  try {
    // 优先 Cookie
    const cookieToken = request.cookies.get('admin_token')?.value;

    // 支持 ?admin_key= 参数
    const adminKey = request.nextUrl?.searchParams?.get('admin_key');

    const token = cookieToken || adminKey;

    if (!token) {
      return NextResponse.json({ admin: null, loggedIn: false });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      type: string;
      userId?: string;
      username?: string;
      role?: string;
    };

    if (decoded.type !== 'admin' || !decoded.userId || !decoded.role) {
      return NextResponse.json({ admin: null, loggedIn: false });
    }

    // 从数据库获取最新信息
    const user = db.prepare('SELECT id, username, nickname, role FROM users WHERE id = ?').get(decoded.userId) as any;

    if (!user || !['viewer', 'editor', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ admin: null, loggedIn: false });
    }

    return NextResponse.json({
      admin: {
        id: user.id,
        username: user.username,
        nickname: user.nickname || user.username,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role as Role] || user.role,
      },
      loggedIn: true,
    });
  } catch {
    return NextResponse.json({ admin: null, loggedIn: false });
  }
}
