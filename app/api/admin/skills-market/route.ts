import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/skills-market — 管理员查看所有技能（含未激活）
 * POST /api/admin/skills-market — 管理员添加技能
 */
export const GET = withRoute({ auth: 'admin', permission: 'skill.manage' }, async (request, ctx: AdminContext) => {
  const items = db.prepare('SELECT * FROM skill_marketplace ORDER BY sort_order ASC, created_at DESC').all();
  return apiSuccess(items);
});

export const POST = withRoute({ auth: 'admin', permission: 'skill.manage', body: true }, async (request, ctx: AdminContext) => {
  const { name, title, description, author, icon_emoji, tags, repo_url, repo_type, skill_version, download_count, star_count, is_active, sort_order } = ctx.body;

  if (!name || !title) {
    return apiError('BAD_REQUEST', '名称和标题不能为空', 400);
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO skill_marketplace (id, name, title, description, author, icon_emoji, tags, repo_url, repo_type, skill_version, download_count, star_count, is_active, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, title, description || '', author || '', icon_emoji || '📦', tags || '',
    repo_url || '', repo_type || 'github', skill_version || '',
    download_count || 0, star_count || 0, is_active ?? 1, sort_order || 0, now, now
  );

  const created = db.prepare('SELECT * FROM skill_marketplace WHERE id = ?').get(id);
  return apiSuccess(created);
});
