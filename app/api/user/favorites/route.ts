import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getBalance, transferBetweenUsers, transferSeed } from '@/lib/seed';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// 获取收藏列表
export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  const favorites = db.prepare(`
    SELECT f.id, f.novel_id, f.created_at, n.title, n.author, n.description, n.tags, n.status
    FROM favorites f
    JOIN novels n ON f.novel_id = n.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(ctx.user.id);

  return apiSuccess(favorites);
});

// 添加/删除收藏
export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { novelId } = ctx.body;
  if (!novelId) {
    return apiError('VALIDATION_REQUIRED', '缺少小说ID', 400);
  }

  // 检查是否已收藏
  const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND novel_id = ?')
    .get(ctx.user.id, novelId);

  if (existing) {
    // 取消收藏
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND novel_id = ?')
      .run(ctx.user.id, novelId);
    return apiSuccess({ action: 'removed' });
  } else {
    // 添加收藏
    const novel = db.prepare('SELECT id, title, author_id FROM novels WHERE id = ?').get(novelId) as any;
    if (!novel) {
      return apiError('NOT_FOUND', '小说不存在', 404);
    }

    // 检查余额（需要 10 SEED）
    const balance = getBalance(ctx.user.id);
    if (balance < 10) {
      return apiError('SEED_INSUFFICIENT', `🌱 余额不足，收藏需要 10 SEED（当前 ${balance} 🌱）`, 400);
    }

    db.prepare('INSERT INTO favorites (id, user_id, novel_id) VALUES (?, ?, ?)')
      .run(uuidv4(), ctx.user.id, novelId);

    // 🌱 SEED 转移：用户-10，作者+8，平台+2
    if (novel.author_id) {
      transferBetweenUsers(ctx.user.id, novel.author_id, 10, 'favorite', {
        refId: novelId,
        platformShare: 2,
        description: `收藏作品《${novel.title}》`,
      });
    } else {
      transferSeed(ctx.user.id, -10, 'favorite', {
        refId: novelId,
        description: `收藏作品《${novel.title}》（作者未关联）`,
      });
    }

    return apiSuccess({ action: 'added', balance: getBalance(ctx.user.id) });
  }
});
