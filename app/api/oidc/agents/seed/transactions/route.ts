/**
 * Agent SEED 交易流水 API
 * GET /api/oidc/agents/seed/transactions
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgentScopes, auditAgentRequest } from '@/lib/agent-middleware';
import { getTransactions } from '@/lib/seed';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const agent = requireAgentScopes(request, ['agent:read']);
  if (agent instanceof Response) return agent;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const txs = getTransactions(agent.user_id, limit, offset);

    auditAgentRequest(request, agent, 'seed.transactions.read');

    return NextResponse.json({ success: true, transactions: txs });
  } catch (error: any) {
    console.error('Agent seed transactions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
