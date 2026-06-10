import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  'free-resource': '免费资源', 'api-update': 'API更新',
  'model-release': '模型发布', 'tool-recommend': '工具推荐',
  'event': '活动通知', 'hiring': '招聘对接', 'other': '其他',
};

/**
 * GET /api/opportunities/[id]
 * 商机详情（AI 可读取）
 */
export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  const { id } = ctx.params!;
  const row = db.prepare(`
    SELECT id, title, description, category, url, source_type, author_id, author_name,
           upvotes, downvotes, expires_at, created_at
    FROM opportunities WHERE id = ? AND is_active = 1
  `).get(id) as any;

  if (!row) {
    return apiError('NOT_FOUND', '商机不存在或已过期', 404);
  }

  const userId = getUserIdFromRequest(request);
  let userVote: string | null = null;
  if (userId) {
    const vote = db.prepare(
      'SELECT vote FROM opportunity_votes WHERE opportunity_id = ? AND voter_id = ?'
    ).get(id, userId) as any;
    if (vote) userVote = vote.vote;
  }

  return apiSuccess({
    ...row,
    category_label: CATEGORY_LABELS[row.category] || row.category,
    user_vote: userVote,
  });
});

/**
 * DELETE /api/opportunities/[id]
 * 删除商机（作者或管理员）
 */
export const DELETE = withRoute({ auth: 'user' }, async (request, ctx) => {
  const { id } = ctx.params!;

  const opp = db.prepare('SELECT author_id FROM opportunities WHERE id = ?').get(id) as any;
  if (!opp) return apiError('NOT_FOUND', '商机不存在', 404);
  if (opp.author_id !== ctx.user.id) return apiError('FORBIDDEN', '只能删除自己的商机', 403);

  db.prepare('UPDATE opportunities SET is_active = 0 WHERE id = ?').run(id);
  return apiSuccess({ deleted: true });
});
