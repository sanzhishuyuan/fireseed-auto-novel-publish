import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';
import db from '@/lib/db';
import { logAdminAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    // 记录审计日志
    const token = request.cookies.get('admin_token')?.value;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; username?: string };
        if (decoded.userId && decoded.username) {
          logAdminAction({
            adminId: decoded.userId,
            adminUsername: decoded.username,
            action: 'logout',
          });
        }
      } catch {
        // token 已过期，忽略
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json({ success: true });
  }
}
