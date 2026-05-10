import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { safeParseJSON } from '@/lib/request-parser';
import { getBalance, transferBetweenUsers, transferSeed } from '@/lib/seed';

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

    // 修复: request.json() 解析异常兼容
    const bodyText = await request.text();
      const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const { novelId } = parsed.data;
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
      // 检查小说是否存在并有作者
      const novel = db.prepare('SELECT id, title, author_id FROM novels WHERE id = ?').get(novelId) as any;
      if (!novel) {
        return NextResponse.json({ error: '小说不存在' }, { status: 404 });
      }

      // 检查余额（需要 10 SEED）
      const balance = getBalance(payload.userId);
      if (balance < 10) {
        return NextResponse.json({ error: `🌱 余额不足，收藏需要 10 SEED（当前 ${balance} 🌱）` }, { status: 400 });
      }

      db.prepare('INSERT INTO favorites (id, user_id, novel_id) VALUES (?, ?, ?)')
        .run(uuidv4(), payload.userId, novelId);

      // 🌱 SEED 转移：用户-10，作者+8，平台+2
      if (novel.author_id) {
        transferBetweenUsers(payload.userId, novel.author_id, 10, 'favorite', {
          refId: novelId,
          platformShare: 2,
          description: `收藏作品《${novel.title}》`,
        });
      } else {
        transferSeed(payload.userId, -10, 'favorite', {
          refId: novelId,
          description: `收藏作品《${novel.title}》（作者未关联）`,
        });
      }

      return NextResponse.json({ success: true, action: 'added', balance: getBalance(payload.userId) });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
