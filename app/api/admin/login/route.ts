import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyAdminPassword, generateAdminToken } from '@/lib/auth';
import db from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // P0-4: 速率限制（每分钟最多5次 Admin 登录尝试）
  const rateLimit = checkRateLimit(request, undefined, 'auth');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  try {
    // 修复: request.json() 在 Node 18 + Next 14 standalone 下解析异常
    const body = await request.text();
    const { password } = JSON.parse(body);

    let authed = false;

    // 方式1: ADMIN_PASSWORD 环境变量（兼容现有方式）
    if (verifyAdminPassword(password)) {
      authed = true;
    }

    // 方式2: 数据库中 role='admin' 的用户（使用 bcrypt 密码）
    if (!authed) {
      const adminUsers = db.prepare('SELECT * FROM users WHERE role = ?').all('admin') as any[];
      for (const user of adminUsers) {
        if (await bcrypt.compare(password, user.password)) {
          authed = true;
          break;
        }
      }
    }

    if (!authed) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    const adminToken = generateAdminToken();
    const response = NextResponse.json({ success: true });

    response.cookies.set('admin_token', adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
