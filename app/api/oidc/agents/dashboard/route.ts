/**
 * Agent 综合面板 API
 * GET /api/oidc/agents/dashboard
 * 
 * 一次请求获取 Agent 的所有关键信息：
 * - 身份信息
 * - SEED 钱包余额
 * - 任务统计
 * - 作品统计
 * - 最近活动
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgentScopes, auditAgentRequest } from '@/lib/agent-middleware';
import { getOrCreateWallet, getTransactions } from '@/lib/seed';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const agent = requireAgentScopes(request, ['agent:read']);
  if (agent instanceof Response) return agent;

  try {
    // 1. Agent 身份信息
    const agentRecord = db.prepare(`
      SELECT agent_id, agent_name, agent_type, status, allowed_scopes,
             registered_at, last_active_at
      FROM oidc_agents WHERE agent_id = ?
    `).get(agent.agent_id) as any;

    // 2. SEED 钱包
    const wallet = getOrCreateWallet(agent.user_id);

    // 3. 作品统计
    const novelStats = db.prepare(`
      SELECT
        COUNT(*) as total_novels,
        COALESCE(SUM(chapter_count), 0) as total_chapters
      FROM novels WHERE author_id = ? AND deleted_at IS NULL
    `).get(agent.user_id) as { total_novels: number; total_chapters: number };

    // 4. 任务统计
    const taskStats = db.prepare(`
      SELECT
        COUNT(*) as total_assigned,
        SUM(CASE WHEN ts.status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN ts.status = 'approved' THEN 1 ELSE 0 END) as approved,
        COALESCE(SUM(CASE WHEN ts.status = 'approved' THEN ts.reward_amount ELSE 0 END), 0) as total_earned_seed
      FROM task_assignments ta
      LEFT JOIN task_submissions ts ON ta.task_id = ts.task_id AND ta.user_id = ts.submitter_id
      WHERE ta.user_id = ?
    `).get(agent.user_id) as any;

    // 5. 信号统计
    const signalStats = db.prepare(`
      SELECT COUNT(*) as total_signals,
             COALESCE(SUM(likes), 0) as total_likes
      FROM signals WHERE agent_id = ?
    `).get(agent.agent_id) as { total_signals: number; total_likes: number };

    // 6. 最近交易（最近 5 条）
    const recentTransactions = getTransactions(agent.user_id, 5, 0);

    // 7. 进行中的任务（最近 5 个）
    const activeTasks = db.prepare(`
      SELECT t.id, t.title, t.status, t.budget, ta.assigned_at
      FROM task_assignments ta
      JOIN novel_tasks t ON ta.task_id = t.id
      WHERE ta.user_id = ? AND t.status IN ('open', 'reviewing')
      ORDER BY ta.assigned_at DESC LIMIT 5
    `).all(agent.user_id) as any[];

    auditAgentRequest(request, agent, 'dashboard.read');

    return NextResponse.json({
      success: true,
      dashboard: {
        agent: {
          agent_id: agent.agent_id,
          agent_name: agentRecord?.agent_name,
          agent_type: agentRecord?.agent_type,
          status: agentRecord?.status,
          registered_at: agentRecord?.registered_at,
          last_active_at: agentRecord?.last_active_at,
        },
        seed_wallet: {
          balance: wallet.balance,
          total_earned: wallet.total_earned,
          total_spent: wallet.total_spent,
        },
        stats: {
          novels: novelStats.total_novels,
          chapters: novelStats.total_chapters,
          tasks_assigned: taskStats.total_assigned || 0,
          tasks_submitted: taskStats.submitted || 0,
          tasks_approved: taskStats.approved || 0,
          tasks_earned_seed: taskStats.total_earned_seed || 0,
          signals_sent: signalStats.total_signals || 0,
          signals_likes: signalStats.total_likes || 0,
        },
        active_tasks: activeTasks,
        recent_transactions: recentTransactions,
      },
    });
  } catch (error: any) {
    console.error('Agent dashboard error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
