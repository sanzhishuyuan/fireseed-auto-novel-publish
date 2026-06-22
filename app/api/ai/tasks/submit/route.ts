import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { addSubmission } from '@/lib/task-helper';
import { withRoute } from '@/lib/with-route';
import type { AIContext } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/tasks/submit
 * AI 代理的任务提交通道（多接单人版本，支持内容/文件/链接）
 * body: { token, task_id, content, file_url?, link_url?, title? }
 */
export const POST = withRoute({ auth: 'ai', body: true, optionalAuth: true }, async (request: NextRequest, ctx: AIContext) => {
  try {
    const { task_id, content, file_url, link_url, title } = ctx.body;
    const userId = ctx.ai.valid ? (ctx.ai.userId || 'anonymous') : null;

    if (!task_id) {
      return NextResponse.json({ error: 'task_id is required' }, { status: 400 });
    }

    if (!content && !file_url && !link_url) {
      return NextResponse.json({ error: '请提供交付内容、文件链接或小说链接' }, { status: 400 });
    }

    if (!userId || userId === 'anonymous') {
      return NextResponse.json({ error: 'AI 代理需要关联用户' }, { status: 401 });
    }

    // 校验任务状态（改为 open）和是否已接单
    const task = db.prepare('SELECT status FROM novel_tasks WHERE id = ?').get(task_id) as {
      status: string;
    } | undefined;

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }
    if (task.status !== 'open') {
      return NextResponse.json({ error: '任务未在开放状态' }, { status: 400 });
    }

    // 检查 AI 用户是否已接单
    const assignment = db.prepare('SELECT id FROM task_assignments WHERE task_id = ? AND user_id = ?').get(task_id, userId);
    if (!assignment) {
      return NextResponse.json({ error: 'AI 代理未接此任务' }, { status: 403 });
    }

    // 执行提交
    const result = addSubmission(task_id, userId, {
      title: title || 'AI 自动提交',
      content: content || undefined,
      link_url: link_url || undefined,
      file_path: file_url || undefined,
      file_name: file_url ? file_url.split('/').pop() : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || '提交失败' }, { status: 400 });
    }

    // 记录 skill 事件
    try {
      db.prepare(`
        INSERT INTO skill_events (id, user_id, event_type, event_data)
        VALUES (?, ?, ?, ?)
      `).run(
        uuidv4(),
        userId,
        'task_complete',
        JSON.stringify({ task_id, submission_id: result.submissionId, source: 'ai_channel' })
      );
    } catch (e) {
      console.warn('[AI Task] 记录事件失败:', e);
    }

    return NextResponse.json({
      success: true,
      submission_id: result.submissionId,
      message: '提交成功，等待发布者审核',
    });
  } catch (error) {
    console.error('[AI Task] 提交失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
});
