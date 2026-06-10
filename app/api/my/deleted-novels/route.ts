import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/my/deleted-novels
 * 查看用户已删除的小说（可恢复）
 * 需要登录
 */
export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  const deletedNovels = db.prepare(`
    SELECT id, title, author, deleted_at, retention_days,
      datetime(deleted_at, '+' || retention_days || ' days') as cleanup_date,
      CASE 
        WHEN datetime(deleted_at, '+' || retention_days || ' days') <= datetime('now') 
        THEN 1 ELSE 0 
      END as ready_to_cleanup
    FROM novels 
    WHERE author_id = ? AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `).all(ctx.user.id);

  return apiSuccess({
    novels: deletedNovels,
    count: (deletedNovels as any[]).length
  });
});

/**
 * POST /api/my/deleted-novels
 * 恢复已删除的小说
 * Body: { novel_id: string }
 */
export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { novel_id } = ctx.body;

  if (!novel_id) {
    return apiError('VALIDATION_REQUIRED', '请提供小说ID', 400);
  }

  // 检查小说是否存在且属于当前用户
  const novel = db.prepare(`
    SELECT id, title, deleted_at 
    FROM novels 
    WHERE id = ? AND author_id = ? AND deleted_at IS NOT NULL
  `).get(novel_id, ctx.user.id) as { id: string; title: string; deleted_at: string } | undefined;

  if (!novel) {
    return apiError('NOT_FOUND', '小说不存在或无权恢复', 404);
  }

  // 恢复小说：清除 deleted_at
  db.prepare(`
    UPDATE novels 
    SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(novel_id);

  return apiSuccess({
    message: `《${novel.title}》已恢复`,
    novel_id: novel_id
  });
});
