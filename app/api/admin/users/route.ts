import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';
import { type Role, ROLE_LABELS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * 获取用户列表（仅 super_admin 可查看完整信息）
 */
export const GET = withRoute({ auth: 'admin', permission: 'admin.manage' }, async (request, ctx: AdminContext) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push('(u.username LIKE ? OR u.nickname LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role) {
    conditions.push('u.role = ?');
    params.push(role);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const total = (db.prepare(`SELECT COUNT(*) as count FROM users u ${where}`).get(...params) as { count: number }).count;

  const users = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.nickname,
      u.role,
      u.created_at,
      (SELECT COUNT(*) FROM novels WHERE author_id = u.id AND deleted_at IS NULL) as novels_count
    FROM users u
    ${where}
    ORDER BY
      CASE u.role
        WHEN 'super_admin' THEN 0
        WHEN 'admin' THEN 1
        WHEN 'editor' THEN 2
        WHEN 'viewer' THEN 3
        ELSE 4
      END,
      u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  const result = users.map(u => ({
    id: u.id,
    username: u.username,
    nickname: u.nickname || u.username,
    role: u.role,
    roleLabel: ROLE_LABELS[u.role as Role] || u.role,
    novelsCount: u.novels_count,
    registeredAt: u.created_at,
  }));

  return apiSuccess({
    users: result,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});
