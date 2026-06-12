import { NextRequest, NextResponse } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { logAdminAction } from '@/lib/audit';

export const GET = withRoute({ auth: 'admin', permission: 'skill.manage' }, async (request, ctx: AdminContext) => {
  const missions = db.prepare('SELECT * FROM skill_missions ORDER BY priority ASC').all();
  return NextResponse.json({ missions });
});

export const POST = withRoute({ auth: 'admin', permission: 'skill.manage', body: true }, async (request, ctx: AdminContext) => {
  const { type, title, description, link, icon_emoji, priority, user_filter } = ctx.body;

  if (!type || !title) {
    return apiError('BAD_REQUEST', 'type 和 title 是必填项', 400);
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO skill_missions (id, type, title, description, link, icon_emoji, priority, user_filter, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, type, title, description || '', link || '', icon_emoji || '📌', priority || 0, user_filter || 'all');

  // 审计日志
  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'create_skill_mission',
      targetType: 'skill_mission',
      targetId: id,
      detail: { type, title },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
  } catch (e) {
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({ id });
});
