import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { safeParseJSON } from '@/lib/request-parser';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/broadcast
 * 超级管理员向全站用户群发站内通知
 * body: { title: string, content: string, link?: string, type?: string }
 */
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request, 'admin.manage');
  if (admin instanceof Response) return admin;

  // 仅 super_admin 可用
  if (admin.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: '仅超级管理员可执行此操作' }, { status: 403 });
  }

  const bodyText = await request.text();
  const parsed = safeParseJSON(bodyText);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const { title, content, link, type } = body;

  // 校验
  if (!title || !title.trim()) {
    return NextResponse.json({ success: false, error: '通知标题不能为空' }, { status: 400 });
  }
  if (!content || !content.trim()) {
    return NextResponse.json({ success: false, error: '通知内容不能为空' }, { status: 400 });
  }
  if (title.length > 100) {
    return NextResponse.json({ success: false, error: '标题长度不能超过 100 个字符' }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ success: false, error: '内容长度不能超过 1000 个字符' }, { status: 400 });
  }

  try {
    // 查出所有有效用户
    const users = db.prepare('SELECT id, username FROM users WHERE username != ?').all('__admin__') as { id: string; username: string }[];

    if (users.length === 0) {
      return NextResponse.json({ success: false, error: '没有可发送的用户' }, { status: 404 });
    }

    const notificationType = type || 'admin';
    let successCount = 0;

    // 批量创建通知（逐条插入以兼容 WAL 模式）
    const insertStmt = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, content, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `);

    const insertAll = db.transaction((userList: { id: string }[]) => {
      for (const user of userList) {
        insertStmt.run(
          crypto.randomUUID(),
          user.id,
          notificationType,
          title.trim(),
          content.trim(),
          link?.trim() || null
        );
        successCount++;
      }
    });

    insertAll(users);

    // 审计日志
    try {
      logAdminAction({
        adminId: admin.id,
        adminUsername: admin.username,
        action: 'system_setting',
        targetType: 'system',
        targetId: 'broadcast',
        detail: {
          type: 'broadcast_notification',
          title: title.trim(),
          contentPreview: content.trim().slice(0, 100),
          totalUsers: users.length,
          link: link?.trim() || null,
          notificationType,
        },
        ipAddress: request.headers.get('x-forwarded-for') || '',
      });
    } catch (e) {
      console.warn('[Broadcast] 审计日志写入失败:', e);
    }

    return NextResponse.json({
      success: true,
      totalUsers: successCount,
      message: `已成功发送给 ${successCount} 位用户`,
    });
  } catch (error) {
    console.error('[Admin Broadcast] Error:', error);
    return NextResponse.json({ success: false, error: '广播发送失败' }, { status: 500 });
  }
}
