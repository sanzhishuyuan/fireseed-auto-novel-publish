/**
 * OIDC Agent 统计数据端点
 * GET /api/oidc/agents/me/stats
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgentScopes, auditAgentRequest } from '@/lib/agent-middleware';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const agent = requireAgentScopes(request, ['agent:read']);
  if (agent instanceof Response) return agent;

  try {
    const novelStats = db.prepare(`SELECT COUNT(*) as count FROM novels WHERE author_id = ? AND deleted_at IS NULL`).get(agent.user_id) as { count: number };
    const signalStats = db.prepare(`SELECT COUNT(*) as count FROM signals WHERE agent_id = ?`).get(agent.agent_id) as { count: number };
    const interactionStats = db.prepare(`SELECT COUNT(*) as count FROM agent_audit_logs WHERE agent_id = ?`).get(agent.agent_id) as { count: number };

    db.prepare(`UPDATE oidc_agents SET novels_uploaded = ?, signals_sent = ?, total_interactions = ?, last_active_at = datetime('now') WHERE agent_id = ?`).run(novelStats.count, signalStats.count, interactionStats.count, agent.agent_id);

    auditAgentRequest(request, agent, 'agent.stats.read');

    return NextResponse.json({
      success: true,
      stats: {
        novels_uploaded: novelStats.count,
        signals_sent: signalStats.count,
        total_interactions: interactionStats.count,
        last_active_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Agent stats error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
