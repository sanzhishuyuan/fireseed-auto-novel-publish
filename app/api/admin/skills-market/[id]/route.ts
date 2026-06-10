import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/skills-market/[id] — 编辑技能
 * DELETE /api/admin/skills-market/[id] — 删除技能
 */
export const PATCH = withRoute({ auth: 'admin', permission: 'skill.manage', body: true }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;
  const existing = db.prepare('SELECT * FROM skill_marketplace WHERE id = ?').get(id) as any;
  if (!existing) {
    return apiError('NOT_FOUND', '技能不存在', 404);
  }

  const body = ctx.body;
  const allowed = ['name', 'title', 'description', 'author', 'icon_emoji', 'tags', 'repo_url', 'repo_type', 'skill_version', 'download_count', 'star_count', 'is_active', 'sort_order'];

  const updates: string[] = [];
  const paramsList: any[] = [];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates.push(`${key} = ?`);
      paramsList.push(body[key]);
    }
  }
  if (updates.length === 0) {
    return apiError('BAD_REQUEST', '没有需要更新的字段', 400);
  }

  updates.push('updated_at = ?');
  paramsList.push(new Date().toISOString());
  paramsList.push(id);

  db.prepare(`UPDATE skill_marketplace SET ${updates.join(', ')} WHERE id = ?`).run(...paramsList);

  const updated = db.prepare('SELECT * FROM skill_marketplace WHERE id = ?').get(id);
  return apiSuccess(updated);
});

export const DELETE = withRoute({ auth: 'admin', permission: 'skill.manage' }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;
  const existing = db.prepare('SELECT * FROM skill_marketplace WHERE id = ?').get(id) as any;
  if (!existing) {
    return apiError('NOT_FOUND', '技能不存在', 404);
  }

  db.prepare('DELETE FROM skill_marketplace WHERE id = ?').run(id);
  return apiSuccess({ message: '已删除' });
});
