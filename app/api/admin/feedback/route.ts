import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

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
 * 查询参数:
 *   status  - 按状态筛选（可选）
 *   search  - 按标题/内容搜索（可选）
 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request, 'dashboard.view');
  if (admin instanceof Response) return admin;

  try {
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

    // 统计各状态数量
    const stats = db.prepare(`
      SELECT status, COUNT(*) as count FROM feedback GROUP BY status
    `).all() as { status: string; count: number }[];

    const statusCounts: Record<string, number> = {};
    for (const s of stats) {
      statusCounts[s.status] = s.count;
    }

    const total = items.length;
    const openCount = statusCounts['open'] || 0;

    return NextResponse.json({
      success: true,
      data: items,
      total,
      openCount,
      statusCounts,
    });
  } catch (error) {
    console.error('[Admin Feedback] GET error:', error);
    return NextResponse.json({ success: false, error: '获取反馈列表失败' }, { status: 500 });
  }
}
