/**
 * Agent 任务操作 API
 * POST /api/oidc/agents/tasks/[taskId]/assign — 领取任务
 * POST /api/oidc/agents/tasks/[taskId]/submit — 提交任务交付物
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgentScopes, auditAgentRequest } from '@/lib/agent-middleware';
import { assignTask, addSubmission } from '@/lib/task-helper';

export const dynamic = 'force-dynamic';

// ===== POST: 领取任务 =====
export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const agent = requireAgentScopes(request, ['novel:read']);
  if (agent instanceof Response) return agent;

  try {
    const { taskId } = await params;
    const body = await request.json();
    const action = body.action;

    if (action === 'assign') {
      // 领取任务
      const result = assignTask(taskId, agent.user_id);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      auditAgentRequest(request, agent, 'task.assign', { type: 'task', id: taskId });

      return NextResponse.json({
        success: true,
        message: '任务领取成功',
        task_id: taskId,
      });
    }

    if (action === 'submit') {
      // 提交任务交付物
      const { title, content, link_url } = body;

      if (!content && !link_url) {
        return NextResponse.json(
          { success: false, error: '请提供交付内容或提交链接' },
          { status: 400 }
        );
      }

      const result = addSubmission(taskId, agent.user_id, {
        title: title || '',
        content: content || undefined,
        link_url: link_url || undefined,
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      auditAgentRequest(request, agent, 'task.submit', { type: 'task', id: taskId });

      return NextResponse.json({
        success: true,
        message: '提交成功，等待发布者审核',
        submission_id: result.submissionId,
        task_id: taskId,
      });
    }

    return NextResponse.json(
      { success: false, error: '无效的操作，支持: assign, submit' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Agent task action error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
