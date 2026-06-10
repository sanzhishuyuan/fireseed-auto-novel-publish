import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';
import { type Role, ROLE_LABELS, isRoleAtLeast } from '@/lib/permissions';
import { logAdminAction } from '@/lib/audit';

/**
 * PATCH /api/admin/users/[id]
 * 修改用户角色（仅 super_admin 可操作）
 */
export const PATCH = withRoute({ auth: 'admin', permission: 'admin.manage', body: true }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;
  const { role: newRole } = ctx.body;

  const validRoles = ['viewer', 'editor', 'admin', 'super_admin'];
  if (!newRole || !validRoles.includes(newRole)) {
    return apiError('BAD_REQUEST', '无效的角色值', 400);
  }

  const targetUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as any;
  if (!targetUser) {
    return apiError('NOT_FOUND', '用户不存在', 404);
  }

  if (targetUser.id === ctx.admin.id) {
    return apiError('BAD_REQUEST', '不能修改自己的角色，请联系其他超级管理员', 400);
  }

  if (isRoleAtLeast(targetUser.role as Role, ctx.admin.role)) {
    return apiError('FORBIDDEN', '不能修改同级或更高级管理员的角色', 403);
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, id);

  logAdminAction({
    adminId: ctx.admin.id,
    adminUsername: ctx.admin.username,
    action: 'update_admin_role',
    targetType: 'user',
    targetId: id,
    detail: {
      username: targetUser.username,
      oldRole: targetUser.role,
      newRole,
    },
    ipAddress: request.headers.get('x-forwarded-for') || '',
  });

  return apiSuccess({
    message: `${targetUser.username} 的角色已更新为 ${ROLE_LABELS[newRole as Role]}`,
    user: {
      id: targetUser.id,
      username: targetUser.username,
      role: newRole,
      roleLabel: ROLE_LABELS[newRole as Role],
    },
  });
});

/**
 * DELETE /api/admin/users/[id]
 * 移除管理员权限（降级为 reader）
 */
export const DELETE = withRoute({ auth: 'admin', permission: 'admin.manage' }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;

  const targetUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as any;
  if (!targetUser) {
    return apiError('NOT_FOUND', '用户不存在', 404);
  }

  if (targetUser.id === ctx.admin.id) {
    return apiError('BAD_REQUEST', '不能移除自己的管理权限', 400);
  }

  if (isRoleAtLeast(targetUser.role as Role, ctx.admin.role)) {
    return apiError('FORBIDDEN', '不能操作同级或更高级管理员', 403);
  }

  db.prepare("UPDATE users SET role = 'reader' WHERE id = ?").run(id);

  logAdminAction({
    adminId: ctx.admin.id,
    adminUsername: ctx.admin.username,
    action: 'remove_admin',
    targetType: 'user',
    targetId: id,
    detail: {
      username: targetUser.username,
      oldRole: targetUser.role,
      newRole: 'reader',
    },
    ipAddress: request.headers.get('x-forwarded-for') || '',
  });

  return apiSuccess({
    message: `${targetUser.username} 的管理权限已移除`,
  });
});
