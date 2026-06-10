import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess } from '@/lib/api-response';
import db from '@/lib/db';

interface FeedbackRow {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  contact: string | null;
  status: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

/**
 * GET /api/admin/feedback
 * 管理员查看反馈列表
 */
export const GET = withRoute({ auth: 'admin', permission: 'dashboard.view' }, async (request, ctx: AdminContext) => {
  const { searchParams } = request.nextUrl;
  const statusFilter = searchParams.get('status') || '';
  const searchQuery = (searchParams.get('search') || '').trim();

  let sql = 'SELECT * FROM feedback WHERE 1=1';
  const params: any[] = [];

  if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
    sql += ' AND status = ?';
    params.push(statusFilter);
  }

  if (searchQuery) {
    sql += ' AND (title LIKE ? OR message LIKE ?)';
    const like = `%${searchQuery}%`;
    params.push(like, like);
  }

  sql += ' ORDER BY created_at DESC';

  const items = db.prepare(sql).all(...params) as FeedbackRow[];

  const stats = db.prepare(`
    SELECT status, COUNT(*) as count FROM feedback GROUP BY status
  `).all() as { status: string; count: number }[];

  const statusCounts: Record<string, number> = {};
  for (const s of stats) {
    statusCounts[s.status] = s.count;
  }

  const total = items.length;
  const openCount = statusCounts['open'] || 0;

  return apiSuccess({ data: items, total, openCount, statusCounts });
});
