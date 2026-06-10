import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { safeParseJSON } from '@/lib/request-parser';
import { getBalance, transferBetweenUsers, transferSeed } from '@/lib/seed';

export const dynamic = 'force-dynamic';

// 获取收藏列表
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const favorites = db.prepare(`
      SELECT f.id, f.novel_id, f.created_at, n.title, n.author, n.description, n.tags, n.status
      FROM favorites f
      JOIN novels n ON f.novel_id = n.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(user.userId);

    return NextResponse.json(favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// 添加/删除收藏
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

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
      .get(user.userId, novelId);

    if (existing) {
      // 取消收藏
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND novel_id = ?')
        .run(user.userId, novelId);
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // 添加收藏
      const novel = db.prepare('SELECT id, title, author_id FROM novels WHERE id = ?').get(novelId) as any;
      if (!novel) {
        return NextResponse.json({ error: '小说不存在' }, { status: 404 });
      }

      // 检查余额（需要 10 SEED）
      const balance = getBalance(user.userId);
      if (balance < 10) {
        return NextResponse.json({ error: `🌱 余额不足，收藏需要 10 SEED（当前 ${balance} 🌱）` }, { status: 400 });
      }

      db.prepare('INSERT INTO favorites (id, user_id, novel_id) VALUES (?, ?, ?)')
        .run(uuidv4(), user.userId, novelId);

      // 🌱 SEED 转移：用户-10，作者+8，平台+2
      if (novel.author_id) {
        transferBetweenUsers(user.userId, novel.author_id, 10, 'favorite', {
          refId: novelId,
          platformShare: 2,
          description: `收藏作品《${novel.title}》`,
        });
      } else {
        transferSeed(user.userId, -10, 'favorite', {
          refId: novelId,
          description: `收藏作品《${novel.title}》（作者未关联）`,
        });
      }

      return NextResponse.json({ success: true, action: 'added', balance: getBalance(user.userId) });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
