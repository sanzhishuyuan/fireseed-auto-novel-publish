import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/profile
 * 获取当前用户的个人资料（含昵称）
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const profile = db.prepare(
      'SELECT id, username, nickname, role, created_at FROM users WHERE id = ?'
    ).get(user.userId) as any;

    if (!profile) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.username,
        nickname: profile.nickname || profile.username,
        role: profile.role,
        createdAt: profile.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * 修改用户昵称
 * Body: { nickname: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.text();
    const { nickname } = JSON.parse(body);

    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json({ error: '昵称不能为空' }, { status: 400 });
    }

    const trimmed = nickname.trim();
    if (trimmed.length < 1 || trimmed.length > 30) {
      return NextResponse.json({ error: '昵称需在 1-30 个字符之间' }, { status: 400 });
    }

    db.prepare('UPDATE users SET nickname = ? WHERE id = ?')
      .run(trimmed, user.userId);

    return NextResponse.json({
      success: true,
      nickname: trimmed
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: '修改失败' }, { status: 500 });
  }
}
