import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess } from '@/lib/api-response';
import db from '@/lib/db';

export const PATCH = withRoute({ auth: 'admin', permission: 'token.manage', body: true }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;
  const { is_active } = ctx.body;
  db.prepare('UPDATE ai_tokens SET is_active = ? WHERE id = ?').run(is_active, id);
  return apiSuccess({ updated: true });
});

export const DELETE = withRoute({ auth: 'admin', permission: 'token.manage' }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;
  db.prepare('DELETE FROM ai_tokens WHERE id = ?').run(id);
  return apiSuccess({ deleted: true });
});
