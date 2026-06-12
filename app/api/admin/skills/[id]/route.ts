import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';
import { logAdminAction } from '@/lib/audit';

export const PATCH = withRoute({ auth: 'admin', permission: 'skill.manage', body: true }, async (request, ctx: AdminContext) => {
  const updates = ctx.body;
  const { id } = ctx.params!;

  const mission = db.prepare('SELECT id FROM skill_missions WHERE id = ?').get(id);
  if (!mission) {
    return apiError('NOT_FOUND', '任务不存在', 404);
  }

  const allowedFields = ['type', 'title', 'description', 'link', 'icon_emoji', 'priority', 'user_filter', 'is_active'];
  const setClauses: string[] = [];
  const setValues: any[] = [];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      setValues.push(updates[field]);
    }
  }

  if (setClauses.length === 0) {
    return apiError('BAD_REQUEST', '没有要更新的字段', 400);
  }

  setValues.push(id);
  db.prepare(`UPDATE skill_missions SET ${setClauses.join(', ')} WHERE id = ?`).run(...setValues);

  // 审计日志
  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'edit_skill_mission',
      targetType: 'skill_mission',
      targetId: id,
      detail: { updatedFields: allowedFields.filter(f => updates[f] !== undefined) },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
  } catch (e) {
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({ message: '任务已更新' });
});

export const DELETE = withRoute({ auth: 'admin', permission: 'skill.manage' }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;
  db.prepare('DELETE FROM skill_missions WHERE id = ?').run(id);

  // 审计日志
  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'delete_skill_mission',
      targetType: 'skill_mission',
      targetId: id,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
  } catch (e) {
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({ message: '任务已删除' });
});
