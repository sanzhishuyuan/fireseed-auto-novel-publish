import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { type Role, ROLE_LABELS, getAssignableRoles, isRoleAtLeast } from '@/lib/permissions';
import { logAdminAction } from '@/lib/audit';

/**
 * PATCH /api/admin/users/[id]
 * 修改用户角色（仅 super_admin 可操作）
 * body: { role: 'viewer' | 'editor' | 'admin' | 'super_admin' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request, 'admin.manage');
  if (admin instanceof Response) return admin;

  const { id } = await params;

  try {
    const bodyText = await request.text();
    let body;
    try { body = JSON.parse(bodyText); } catch {
      return NextResponse.json({ success: false, error: '请求体格式错误' }, { status: 400 });
    }

    const { role: newRole } = body;

    // 校验角色值
    const validRoles = ['viewer', 'editor', 'admin', 'super_admin'];
    if (!newRole || !validRoles.includes(newRole)) {
      return NextResponse.json({ success: false, error: '无效的角色值' }, { status: 400 });
    }

    // 查找目标用户
    const targetUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as any;
    if (!targetUser) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    // 不能修改自己的角色（防止误操作）
    if (targetUser.id === admin.id) {
      return NextResponse.json({ success: false, error: '不能修改自己的角色，请联系其他超级管理员' }, { status: 400 });
    }

    // 只能对权限不高于自己的用户操作
    if (isRoleAtLeast(targetUser.role as Role, admin.role)) {
      return NextResponse.json({ success: false, error: '不能修改同级或更高级管理员的角色' }, { status: 403 });
    }

    // 更新角色
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, id);

    // 审计日志
    logAdminAction({
      adminId: admin.id,
      adminUsername: admin.username,
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

    return NextResponse.json({
      success: true,
      message: `${targetUser.username} 的角色已更新为 ${ROLE_LABELS[newRole as Role]}`,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        role: newRole,
        roleLabel: ROLE_LABELS[newRole as Role],
      },
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json({ success: false, error: '修改失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * 移除管理员权限（降级为 reader）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request, 'admin.manage');
  if (admin instanceof Response) return admin;

  const { id } = await params;

  try {
    const targetUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as any;
    if (!targetUser) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    if (targetUser.id === admin.id) {
      return NextResponse.json({ success: false, error: '不能移除自己的管理权限' }, { status: 400 });
    }

    if (isRoleAtLeast(targetUser.role as Role, admin.role)) {
      return NextResponse.json({ success: false, error: '不能操作同级或更高级管理员' }, { status: 403 });
    }

    // 降级为 reader
    db.prepare("UPDATE users SET role = 'reader' WHERE id = ?").run(id);

    logAdminAction({
      adminId: admin.id,
      adminUsername: admin.username,
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

    return NextResponse.json({
      success: true,
      message: `${targetUser.username} 的管理权限已移除`,
    });
  } catch (error) {
    console.error('Remove admin error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}
