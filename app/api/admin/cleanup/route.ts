import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/cleanup
 * 列出待清理的小说（已软删除超过保留期）
 */
export const GET = withRoute({ auth: 'admin', permission: 'cleanup.execute' }, async (request, ctx: AdminContext) => {
  const now = new Date();
  const novelsToCleanup = db.prepare(`
    SELECT 
      id, title, author, author_id,
      deleted_at,
      retention_days,
      datetime(deleted_at, '+' || retention_days || ' days') as cleanup_date,
      CASE 
        WHEN datetime(deleted_at, '+' || retention_days || ' days') <= datetime('now') 
        THEN 1 ELSE 0 
      END as ready_to_cleanup
    FROM novels 
    WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at ASC
  `).all() as Array<{
    id: string;
    title: string;
    author: string;
    author_id: string;
    deleted_at: string;
    retention_days: number;
    cleanup_date: string;
    ready_to_cleanup: number;
  }>;

  const contentDir = path.join(process.cwd(), 'content', 'novels');
  const novelsWithFileStatus = novelsToCleanup.map(novel => {
    const novelDir = path.join(contentDir, novel.id);
    const metaPath = path.join(novelDir, 'meta.md');
    const hasFiles = fs.existsSync(metaPath);
    return {
      ...novel,
      has_files: hasFiles,
      days_since_deleted: Math.floor((now.getTime() - new Date(novel.deleted_at).getTime()) / (1000 * 60 * 60 * 24))
    };
  });

  const readyToCleanup = novelsWithFileStatus.filter(n => n.ready_to_cleanup && n.has_files);
  const pending = novelsWithFileStatus.filter(n => !n.ready_to_cleanup);

  return apiSuccess({
    summary: {
      total_deleted: novelsToCleanup.length,
      ready_to_cleanup: readyToCleanup.length,
      pending: pending.length
    },
    ready_to_cleanup: readyToCleanup,
    pending: pending
  });
});

/**
 * DELETE /api/admin/cleanup
 * 执行清理：永久删除已过保留期的小说
 */
export const DELETE = withRoute({ auth: 'admin', permission: 'cleanup.execute' }, async (request, ctx: AdminContext) => {
  const url = new URL(request.url);
  const novelId = url.searchParams.get('novel_id');

  const contentDir = path.join(process.cwd(), 'content', 'novels');
  const deletedRecords: string[] = [];

  if (novelId) {
    const novel = db.prepare(`
      SELECT id, title, deleted_at, retention_days
      FROM novels 
      WHERE id = ? AND deleted_at IS NOT NULL
    `).get(novelId) as { id: string; title: string; deleted_at: string; retention_days: number } | undefined;

    if (!novel) {
      return apiError('NOT_FOUND', '小说不存在或未标记删除', 404);
    }

    const cleanupDate = new Date(new Date(novel.deleted_at).getTime() + novel.retention_days * 24 * 60 * 60 * 1000);
    if (cleanupDate > new Date()) {
      return apiError('BAD_REQUEST', `小说仍在保留期内，将在 ${cleanupDate.toLocaleDateString('zh-CN')} 后可清理`, 400);
    }

    const novelDir = path.join(contentDir, novel.id);
    if (fs.existsSync(novelDir)) {
      fs.rmSync(novelDir, { recursive: true });
    }

    db.prepare('DELETE FROM novels WHERE id = ?').run(novelId);
    deletedRecords.push(novel.id);
  } else {
    const novelsToDelete = db.prepare(`
      SELECT id, deleted_at, retention_days
      FROM novels 
      WHERE deleted_at IS NOT NULL
      AND datetime(deleted_at, '+' || retention_days || ' days') <= datetime('now')
    `).all() as Array<{ id: string; deleted_at: string; retention_days: number }>;

    for (const novel of novelsToDelete) {
      const novelDir = path.join(contentDir, novel.id);
      if (fs.existsSync(novelDir)) {
        fs.rmSync(novelDir, { recursive: true });
      }
      db.prepare('DELETE FROM novels WHERE id = ?').run(novel.id);
      deletedRecords.push(novel.id);
    }
  }

  // 审计日志
  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'cleanup_novel',
      targetType: 'novel',
      targetId: deletedRecords.length === 1 ? deletedRecords[0] : undefined,
      detail: { deletedCount: deletedRecords.length, deletedIds: deletedRecords },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
  } catch (e) {
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({
    message: `已永久删除 ${deletedRecords.length} 篇小说`,
    deleted_novels: deletedRecords
  });
});
