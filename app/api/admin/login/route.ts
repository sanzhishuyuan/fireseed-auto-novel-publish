import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_PASSWORD } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_auth', ADMIN_PASSWORD, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24小时
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
