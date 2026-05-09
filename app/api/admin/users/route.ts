import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { checkPermission, type Role, ROLE_LABELS, getAssignableRoles } from '@/lib/permissions';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * 获取用户列表（仅 super_admin 可查看完整信息）
 * Viewer/Editor/Admin 只能看到 basic 字段
 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request, 'admin.manage');
  if (admin instanceof Response) return admin;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = (page - 1) * limit;

  try {
    // 构建查询
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

    // 总数
    const total = (db.prepare(`SELECT COUNT(*) as count FROM users u ${where}`).get(...params) as { count: number }).count;

    // 用户列表（含作品数统计）
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

    // 格式化输出
    const result = users.map(u => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname || u.username,
      role: u.role,
      roleLabel: ROLE_LABELS[u.role as Role] || u.role,
      novelsCount: u.novels_count,
      registeredAt: u.created_at,
    }));

    return NextResponse.json({
      success: true,
      users: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ success: false, error: '获取用户列表失败' }, { status: 500 });
  }
}
