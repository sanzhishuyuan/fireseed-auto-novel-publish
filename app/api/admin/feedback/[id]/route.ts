import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { safeParseJSON } from '@/lib/request-parser';

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

/**
 * PATCH /api/admin/feedback/[id]
 * 管理员更新反馈状态和回复
 * 请求体:
 *   status     - 新状态（可选）
 *   admin_reply - 管理员回复（可选）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request, 'dashboard.view');
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;

    // 检查反馈是否存在
    const existing = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ success: false, error: '反馈不存在' }, { status: 404 });
    }

    const bodyText = await request.text();

    const parsed = safeParseJSON(bodyText);

    if (!parsed.success) return parsed.response;

    const body = parsed.data;
    const { status: newStatus, admin_reply } = body;

    const updates: string[] = [];
    const updateParams: any[] = [];

    if (newStatus && VALID_STATUSES.includes(newStatus)) {
      updates.push('status = ?');
      updateParams.push(newStatus);
    }

    if (admin_reply !== undefined) {
      updates.push('admin_reply = ?');
      updateParams.push((admin_reply || '').trim().slice(0, 5000));
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: '没有需要更新的字段' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    updateParams.push(new Date().toISOString());
    updateParams.push(id);

    db.prepare(`UPDATE feedback SET ${updates.join(', ')} WHERE id = ?`).run(...updateParams);

    // 返回更新后的记录
    const updated = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);

    return NextResponse.json({
      success: true,
      message: '更新成功',
      data: updated,
    });
  } catch (error) {
    console.error('[Admin Feedback] PATCH error:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}
