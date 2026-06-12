import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess } from '@/lib/api-response';
import db from '@/lib/db';
import { logAdminAction } from '@/lib/audit';

export const PATCH = withRoute({ auth: 'admin', permission: 'token.manage', body: true }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;
  const { is_active } = ctx.body;
  db.prepare('UPDATE ai_tokens SET is_active = ? WHERE id = ?').run(is_active, id);

  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'toggle_ai_token',
      targetType: 'ai_token',
      targetId: id,
      detail: { is_active: !!is_active },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
  } catch (e) {
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({ updated: true });
});

export const DELETE = withRoute({ auth: 'admin', permission: 'token.manage' }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;
  db.prepare('DELETE FROM ai_tokens WHERE id = ?').run(id);

  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'delete_ai_token',
      targetType: 'ai_token',
      targetId: id,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
  } catch (e) {
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({ deleted: true });
});
