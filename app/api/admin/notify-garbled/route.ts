import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { sendGarbledDataNotification } from '@/lib/mail';
import { createNotification } from '@/lib/notification';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/notify-garbled
 * 管理员手动发送乱码数据通知给作者
 * body: { novel_id: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  // 管理员鉴权
  const admin = requireAdmin(request, 'admin.manage');
  if (admin instanceof Response) return admin;

  try {
    const body = await request.json();
    const { novel_id, reason } = body;

    if (!novel_id) {
      return apiError('invalid_params', '请提供小说ID', 400);
    }

    // 查找小说（支持完整UUID或短ID前缀匹配）
    let novel: any = null;
    if (novel_id.includes('-')) {
      novel = db.prepare('SELECT id, title, author_id, author FROM novels WHERE id = ?').get(novel_id);
    }
    if (!novel) {
      novel = db.prepare(
        "SELECT id, title, author_id, author FROM novels WHERE id LIKE ? || '%'"
      ).get(novel_id) as any;
    }
    if (!novel) {
      return apiError('novel_not_found', '未找到该小说，请检查ID', 404);
    }

    // 查找作者
    if (!novel.author_id) {
      return apiError('no_author', '该小说没有关联作者，无法发送通知', 400);
    }

    const author = db.prepare(
      'SELECT id, username, nickname, email FROM users WHERE id = ?'
    ).get(novel.author_id) as { id: string; username: string; nickname?: string; email?: string } | undefined;

    if (!author) {
      return apiError('author_not_found', '未找到作者信息', 404);
    }

    const reasonText = reason || '系统检测到作品内容存在编码异常（乱码），部分内容无法正常显示。';
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';

    // 始终创建站内通知
    try {
      createNotification({
        userId: author.id,
        type: 'garbled_data',
        title: '⚠️ 作品编码异常通知',
        content: `您的作品《${novel.title}》存在编码异常，请重新上传正确的文件。${reasonText}`,
        link: `${baseUrl}/my`,
      });
    } catch (e) {
      console.warn('[NotifyGarbled] 站内通知创建失败:', e);
    }

    // 尝试发送邮件（有邮箱才发）
    let emailSent = false;
    let emailMessage = '';
    if (author.email && process.env.SMTP_HOST) {
      emailSent = await sendGarbledDataNotification({
        to: author.email,
        username: author.nickname || author.username,
        novelId: novel.id,
        novelTitle: novel.title,
        reason: reasonText,
      });
      emailMessage = emailSent
        ? `，邮件已发送至 ${author.email}`
        : '，邮件发送失败（请检查SMTP日志）';
    } else if (!author.email) {
      emailMessage = '（作者未注册邮箱，未发送邮件）';
    } else {
      emailMessage = '（SMTP未配置，未发送邮件）';
    }

    return apiSuccess({
      novel: {
        id: novel.id,
        title: novel.title,
      },
      author: {
        id: author.id,
        username: author.username,
        email: author.email || null,
      },
      email_sent: emailSent,
      in_site_notified: true,
      message: `✅ 已向 ${author.nickname || author.username} 发送站内通知${emailMessage}`,
    });
  } catch (error) {
    console.error('[Admin NotifyGarbled] Error:', error);
    return apiError('server_error', '发送通知失败: ' + (error as Error).message, 500);
  }
}
