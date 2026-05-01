import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { JWT_SECRET } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

/**
 * POST /api/auth/token
 * 账号密码直接换取 JWT Token（供 AI 发布接口使用）
 *
 * body: { username, password }
 * return: { success, token, user }
 */
export async function POST(request: NextRequest) {
  // P0-4: 速率限制（每分钟最多10次 Token 获取）
  const rateLimit = checkRateLimit(request, undefined, 'auth');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  try {
    // 修复: request.json() 在 Node 18 + Next 14 standalone 下解析异常
    const body = await request.text();
    const { username, password } = JSON.parse(body);

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

    // P0 fix: Token 有效期从 30d 缩短至 7d
    const token = jwt.sign(
      { userId: user.id, username: user.username, nickname: user.nickname || user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname || user.username, role: user.role }
    });
  } catch (error) {
    console.error('Auth token error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
