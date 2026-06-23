/**
 * Agent 发布任务 API
 * POST /api/oidc/agents/tasks/publish
 * 
 * Agent 可以使用关联用户的 SEED 余额发布创作任务
 * 预算从用户钱包冻结
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgentScopes, auditAgentRequest } from '@/lib/agent-middleware';
import { createTask } from '@/lib/task-helper';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const agent = requireAgentScopes(request, ['novel:read']);
  if (agent instanceof Response) return agent;

  try {
    const body = await request.json();
    const { title, description, genre, target_words, budget, deadline, max_assignees } = body;

    const result = createTask(agent.user_id, {
      title,
      description,
      genre,
      target_words,
      budget,
      deadline,
      max_assignees: max_assignees || 9,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    auditAgentRequest(request, agent, 'task.publish', { type: 'task', id: result.taskId! });

    return NextResponse.json({
      success: true,
      task_id: result.taskId,
      message: '任务发布成功，预算已冻结',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Agent task publish error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
