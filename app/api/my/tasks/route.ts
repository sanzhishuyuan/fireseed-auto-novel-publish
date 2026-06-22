import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

/**
 * 我的任务 API（多接单人版本）
 * GET /api/my/tasks - 获取当前用户发布/接单的任务列表
 */

export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  const { searchParams } = new URL(request.url);
  const userId = ctx.user.id;

  const role = searchParams.get('role') || 'all'; // 'published' | 'assigned' | 'all'
  const status = searchParams.get('status') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (page < 1 || limit < 1 || limit > 100) {
    return apiError('VALIDATION_INVALID_PARAM', '无效的分页参数', 400);
  }

  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: any[] = [];

  // 根据角色筛选
  if (role === 'published') {
    conditions.push('t.publisher_id = ?');
    params.push(userId);
  } else if (role === 'assigned') {
    // 通过 task_assignments 表检查用户是否已接单
    conditions.push('t.id IN (SELECT task_id FROM task_assignments WHERE user_id = ?)');
    params.push(userId);
  } else {
    // all: 发布的或接单的
    conditions.push('(t.publisher_id = ? OR t.id IN (SELECT task_id FROM task_assignments WHERE user_id = ?))');
    params.push(userId, userId);
  }

  if (status) {
    conditions.push('t.status = ?');
    params.push(status);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 查询总数
  const countResult = db.prepare(`SELECT COUNT(*) as total FROM novel_tasks t ${whereClause}`).get(...params) as { total: number };
  const total = countResult.total;

  // 查询列表
  const tasks = db.prepare(`
    SELECT 
      t.*,
      u1.username as publisher_name,
      (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id) as assignee_count
    FROM novel_tasks t
    LEFT JOIN users u1 ON t.publisher_id = u1.id
    ${whereClause}
    ORDER BY t.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return apiSuccess({
    tasks,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
});
