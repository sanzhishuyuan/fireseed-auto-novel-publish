import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

/**
 * PATCH /api/admin/feedback/[id]
 * 管理员更新反馈状态和回复
 */
export const PATCH = withRoute({ auth: 'admin', permission: 'dashboard.view', body: true }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;

  const existing = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id) as any;
  if (!existing) {
    return apiError('NOT_FOUND', '反馈不存在', 404);
  }

  const { status: newStatus, admin_reply } = ctx.body;

  const updates: string[] = [];
  const updateParams: any[] = [];

  if (newStatus && VALID_STATUSES.includes(newStatus)) {
    updates.push('status = ?');
    updateParams.push(newStatus);
  }

  if (admin_reply !== undefined) {
    updates.push('admin_reply = ?');
    updateParams.push((admin_reply || '').trim().slice(0, 5000));
  }

  if (updates.length === 0) {
    return apiError('BAD_REQUEST', '没有需要更新的字段', 400);
  }

  updates.push('updated_at = ?');
  updateParams.push(new Date().toISOString());
  updateParams.push(id);

  db.prepare(`UPDATE feedback SET ${updates.join(', ')} WHERE id = ?`).run(...updateParams);

  const updated = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);

  return apiSuccess({ message: '更新成功', data: updated });
});
