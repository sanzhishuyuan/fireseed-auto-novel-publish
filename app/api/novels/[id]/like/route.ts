import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { transferBetweenUsers, transferSeed, getBalance } from '@/lib/seed';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/novels/[id]/like — 点赞小说（消耗1 SEED）
 */
export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { id: novelId } = ctx.params!;
  const userId = ctx.user.id;

  // 检查小说存在
  const novel = db.prepare('SELECT id, title, author_id FROM novels WHERE id = ?').get(novelId) as any;
  if (!novel) {
    return apiError('NOT_FOUND', '小说不存在', 404);
  }

  // 不能给自己的作品点赞
  if (novel.author_id && novel.author_id === userId) {
    return apiError('VALIDATION_SELF_LIKE', '不能给自己的作品点赞', 400);
  }

  // 检查余额
  const balance = getBalance(userId);
  if (balance < 1) {
    return apiError('SEED_INSUFFICIENT', '🌱 余额不足，需要 1 SEED', 400);
  }

  // 记录点赞
  const likeId = uuidv4();
  db.prepare('INSERT INTO novel_likes (id, user_id, novel_id) VALUES (?, ?, ?)').run(likeId, userId, novelId);

  // 🌱 SEED 转账：用户 -1，作者 +1
  if (novel.author_id) {
    transferBetweenUsers(userId, novel.author_id, 1, 'like', {
      refId: novelId,
      description: `点赞作品《${novel.title}》`,
    });
  } else {
    // 作者未关联用户，只扣用户
    transferSeed(userId, -1, 'like', {
      refId: novelId,
      description: `点赞作品《${novel.title}》（作者未关联）`,
    });
  }

  // 统计总点赞数
  const totalLikes = db.prepare('SELECT COUNT(*) as c FROM novel_likes WHERE novel_id = ?').get(novelId) as any;
  const userBalance = getBalance(userId);

  return apiSuccess({
    total_likes: totalLikes.c,
    balance: userBalance,
    message: '👍 点赞成功！消耗 1 🌱',
  });
});

/**
 * GET /api/novels/[id]/like — 获取点赞数
 */
export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  const { id: novelId } = ctx.params!;
  const totalLikes = db.prepare('SELECT COUNT(*) as c FROM novel_likes WHERE novel_id = ?').get(novelId) as any;
  return apiSuccess({ total_likes: totalLikes.c });
});
