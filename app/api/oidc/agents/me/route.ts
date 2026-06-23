/**
 * OIDC Agent 自身信息端点
 * GET /api/oidc/agents/me
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgentScopes, auditAgentRequest } from '@/lib/agent-middleware';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const agent = requireAgentScopes(request, ['agent:read']);
  if (agent instanceof Response) return agent;

  try {
    const agentRecord = db.prepare(`
      SELECT agent_id, user_id, agent_name, agent_type, status, allowed_scopes,
             registered_at, last_active_at, novels_uploaded, signals_sent, total_interactions
      FROM oidc_agents WHERE agent_id = ?
    `).get(agent.agent_id) as any;

    if (!agentRecord) {
      return NextResponse.json({ success: false, error: 'Agent 不存在' }, { status: 404 });
    }

    auditAgentRequest(request, agent, 'agent.me.read');

    return NextResponse.json({
      success: true,
      agent: {
        agent_id: agentRecord.agent_id,
        agent_name: agentRecord.agent_name,
        agent_type: agentRecord.agent_type,
        status: agentRecord.status,
        scopes: agentRecord.allowed_scopes.split(' '),
        registered_at: agentRecord.registered_at,
        last_active_at: agentRecord.last_active_at,
        stats: {
          novels_uploaded: agentRecord.novels_uploaded || 0,
          signals_sent: agentRecord.signals_sent || 0,
          total_interactions: agentRecord.total_interactions || 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Agent me error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
