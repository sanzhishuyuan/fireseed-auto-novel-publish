import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { logAdminAction } from '@/lib/audit';

export const PUT = withRoute({ auth: 'admin', permission: 'content.edit', body: true }, async (request, ctx: AdminContext) => {
  const { id: novelId } = ctx.params!;
  const { orders } = ctx.body as { orders?: Record<string, number> };

  // 校验参数
  if (!orders || typeof orders !== 'object' || Object.keys(orders).length === 0) {
    return apiError('BAD_REQUEST', '请提供 orders 参数（章节ID到排序号的映射）', 400);
  }

  // 校验排序号必须为正整数
  for (const [id, order] of Object.entries(orders)) {
    if (!Number.isInteger(order) || order < 1) {
      return apiError('BAD_REQUEST', `章节 ${id} 的排序号无效（必须为正整数）`, 400);
    }
  }

  // 获取小说所有章节（按当前 order_num 排序）
  const allChapters = db.prepare(
    `SELECT id, order_num FROM chapters WHERE novel_id = ? ORDER BY order_num ASC, created_at ASC`
  ).all(novelId) as { id: string; order_num: number }[];

  // 校验用户指定的章节 ID 确实属于该小说
  const allIds = new Set(allChapters.map(c => c.id));
  const invalidIds = Object.keys(orders).filter(id => !allIds.has(id));
  if (invalidIds.length > 0) {
    return apiError('BAD_REQUEST', `以下章节ID不存在于该小说中: ${invalidIds.join(', ')}`, 400);
  }

  // ===== 插入排序算法 =====
  const orderedList: string[] = allChapters.map(c => c.id);

  const userMoves = Object.entries(orders)
    .map(([id, target]) => ({ id, target }))
    .sort((a, b) => a.target - b.target);

  const movedIds = new Set(Object.keys(orders));
  for (let i = orderedList.length - 1; i >= 0; i--) {
    if (movedIds.has(orderedList[i])) {
      orderedList.splice(i, 1);
    }
  }

  const inserted = new Set<string>();
  for (const { id, target } of userMoves) {
    const insertIndex = Math.min(Math.max(target - 1, 0), orderedList.length);
    orderedList.splice(insertIndex, 0, id);
    inserted.add(id);
  }

  const finalOrders: Record<string, number> = {};
  orderedList.forEach((id, idx) => {
    finalOrders[id] = idx + 1;
  });

  // ===== 更新数据库 =====
  const updateStmt = db.prepare('UPDATE chapters SET order_num = ? WHERE id = ? AND novel_id = ?');
  const transaction = db.transaction(() => {
    for (const [chapterId, newOrder] of Object.entries(finalOrders)) {
      updateStmt.run(newOrder, chapterId, novelId);
    }
  });
  transaction();

  // ===== 同步文件系统 =====
  const chaptersDir = path.join(process.cwd(), 'content', 'novels', novelId, 'chapters');
  if (fs.existsSync(chaptersDir)) {
    const fileSystemFiles = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
    if (fileSystemFiles.length > 0) {
      for (const [chapterId, newOrder] of Object.entries(finalOrders)) {
        const oldData = allChapters.find(c => c.id === chapterId);
        if (!oldData) continue;
        const oldPrefix = String(oldData.order_num) + '-';
        const newPrefix = String(newOrder) + '-';
        const matchingFile = fileSystemFiles.find(f => f.startsWith(oldPrefix));
        if (matchingFile) {
          const newFileName = matchingFile.replace(oldPrefix, newPrefix);
          try {
            fs.renameSync(
              path.join(chaptersDir, matchingFile),
              path.join(chaptersDir, newFileName)
            );
          } catch (e) {
            // 文件可能已被其他操作删除，忽略
          }
        }
      }
    }
  }

  // ===== 审计日志 =====
  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'edit_chapter',
      targetType: 'chapter',
      targetId: novelId,
      detail: {
        action: 'reorder_chapters',
        movedCount: Object.keys(orders).length,
        moveSummary: orders as Record<string, unknown>,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });
  } catch (e) {
    // 审计日志写入失败不影响主流程
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({
    message: `章节排序已更新（${Object.keys(orders).length} 个章节移动，共 ${orderedList.length} 章重新编号）`,
    updated: orderedList.length,
  });
});
