import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 获取收藏列表
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const favorites = db.prepare(`
      SELECT f.id, f.novel_id, f.created_at, n.title, n.author, n.description, n.tags, n.status
      FROM favorites f
      JOIN novels n ON f.novel_id = n.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(payload.userId);

    return NextResponse.json(favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// 添加/删除收藏
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const { novelId } = await request.json();
    if (!novelId) {
      return NextResponse.json({ error: '缺少小说ID' }, { status: 400 });
    }

    // 检查是否已收藏
    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND novel_id = ?')
      .get(payload.userId, novelId);

    if (existing) {
      // 取消收藏
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND novel_id = ?')
        .run(payload.userId, novelId);
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // 添加收藏
      db.prepare('INSERT INTO favorites (user_id, novel_id) VALUES (?, ?)')
        .run(payload.userId, novelId);
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
