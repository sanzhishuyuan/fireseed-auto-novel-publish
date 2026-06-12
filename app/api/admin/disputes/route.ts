/**
 * GET/POST /api/admin/disputes — 争议管理
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { refundCommission } from '@/lib/rpg/economy';

export const dynamic = 'force-dynamic';

/** GET — 列出争议中的任务 */
export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request, 'content.edit');
    if (admin instanceof Response) return admin;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'disputed';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const total = (db.prepare("SELECT COUNT(*) as c FROM rpg_commission_tasks WHERE status = ?").get(status) as any).c;
    const tasks = db.prepare(`
      SELECT ct.*, r.username as requester_name, a.username as assignee_name
      FROM rpg_commission_tasks ct
      LEFT JOIN users r ON ct.requester_id = r.id
      LEFT JOIN users a ON ct.assignee_id = a.id
      WHERE ct.status = ?
      ORDER BY ct.created_at DESC LIMIT ? OFFSET ?
    `).all(status, limit, offset);

    return NextResponse.json({ success: true, data: { tasks, total, page, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** POST — 处理争议 */
export async function POST(request: NextRequest) {
  try {
    const admin = requireAdmin(request, 'content.edit');
    if (admin instanceof Response) return admin;

    const body = await request.json();
    const { action, commission_id } = body;

    if (!action || !commission_id) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }

    switch (action) {
      case 'refund':
        refundCommission(commission_id);
        break;
      case 'release':
        // 强制完成并释放资金给创作者
        const task = db.prepare("SELECT * FROM rpg_commission_tasks WHERE id = ?").get(commission_id) as any;
        if (!task || task.status !== 'disputed') {
          return NextResponse.json({ success: false, error: '任务不存在或状态不正确' }, { status: 400 });
        }
        db.prepare("UPDATE rpg_commission_tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(commission_id);
        break;
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
