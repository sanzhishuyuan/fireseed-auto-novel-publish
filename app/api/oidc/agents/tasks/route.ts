/**
 * Agent 任务 API
 * GET /api/oidc/agents/tasks — 查看我领取的任务列表
 * POST /api/oidc/agents/tasks/[taskId]/assign — 领取任务
 * POST /api/oidc/agents/tasks/[taskId]/submit — 提交任务交付物
 * 
 * Agent 通过其关联的 user_id 参与任务系统
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgentScopes, auditAgentRequest } from '@/lib/agent-middleware';
import { assignTask, addSubmission, getTaskById } from '@/lib/task-helper';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// ===== GET: 查看我领取的任务列表 =====
export async function GET(request: NextRequest) {
  const agent = requireAgentScopes(request, ['agent:read']);
  if (agent instanceof Response) return agent;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT t.*, ta.assigned_at as my_assigned_at
      FROM task_assignments ta
      JOIN novel_tasks t ON ta.task_id = t.id
      WHERE ta.user_id = ?
    `;
    const params: any[] = [agent.user_id];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ta.assigned_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const tasks = db.prepare(query).all(...params) as any[];

    // 获取每个任务的提交状态
    const enrichedTasks = tasks.map(task => {
      const submission = db.prepare(
        'SELECT id, status, reward_amount, created_at FROM task_submissions WHERE task_id = ? AND submitter_id = ?'
      ).get(task.id, agent.user_id) as any;
      return {
        ...task,
        my_submission: submission || null,
      };
    });

    auditAgentRequest(request, agent, 'tasks.list.read');

    return NextResponse.json({ success: true, tasks: enrichedTasks });
  } catch (error: any) {
    console.error('Agent tasks list error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
