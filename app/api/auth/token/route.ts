import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-novel-secret-key-2024';

/**
 * POST /api/auth/token
 * 账号密码直接换取 JWT Token（供 AI 发布接口使用）
 *
 * body: { username, password }
 * return: { success, token, user }
 */
export async function POST(request: NextRequest) {
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

    // 签发 JWT Token（供 API 发布使用）
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Auth token error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
