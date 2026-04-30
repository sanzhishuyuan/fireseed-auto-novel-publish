import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, generateAdminToken } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // P0-4: 速率限制（每分钟最多5次 Admin 登录尝试）
  const rateLimit = checkRateLimit(request, undefined, 'auth');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  try {
    const { password } = await request.json();

    if (!verifyAdminPassword(password)) {
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
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
