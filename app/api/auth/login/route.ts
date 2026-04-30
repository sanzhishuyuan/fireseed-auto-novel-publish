import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { JWT_SECRET } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // P0-4: 速率限制（每分钟最多10次登录尝试）
  const rateLimit = checkRateLimit(request, undefined, 'auth');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({ 
      success: true, 
      user: { id: user.id, username: user.username, role: user.role }
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
