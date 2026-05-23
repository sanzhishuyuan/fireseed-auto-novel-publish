import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'verified', 'rejected'];

interface ResourceRow {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  tags: string;
  provider_id: string | null;
  provider_name: string;
  status: string;
  useful_count: number;
  useless_count: number;
  verified_count: number;
  last_verified_at: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/admin/resources
 * 管理员获取资源列表
 *
 * Query: ?status=pending|verified|rejected&page=1&limit=20
 * Auth: requireAdmin (viewer role)
 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request, 'content.view');
  if (admin instanceof Response) return admin;

  try {
    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
      whereSql += ' AND status = ?';
      params.push(statusFilter);
    }

    // 查询总数
    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM trusted_resources ${whereSql}`
    ).get(...params) as { total: number };

    // 查询资源列表
    const resources = db.prepare(
      `SELECT * FROM trusted_resources ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as ResourceRow[];

    // 统计各状态数量（用于 dashboard）
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count FROM trusted_resources GROUP BY status
    `).all() as { status: string; count: number }[];

    const statusCountMap: Record<string, number> = {};
    for (const item of statusCounts) {
      statusCountMap[item.status] = item.count;
    }

    // 同时统计活跃/非活跃
    const activeCount = db.prepare(
      'SELECT COUNT(*) as c FROM trusted_resources WHERE is_active = 1'
    ).get() as { c: number };
    const inactiveCount = db.prepare(
      'SELECT COUNT(*) as c FROM trusted_resources WHERE is_active = 0'
    ).get() as { c: number };

    return apiSuccess(resources, {
      page,
      page_size: limit,
      total: countResult.total,
      has_more: offset + limit < countResult.total,
    });
  } catch (error) {
    console.error('[Admin Resources] GET error:', error);
    return apiError('INTERNAL_ERROR', '获取资源列表失败', 500);
  }
}
