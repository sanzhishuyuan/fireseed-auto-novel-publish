/**
 * Agent SEED 钱包 API
 * GET /api/oidc/agents/seed/balance — 查询 Agent 关联用户的 SEED 余额
 * GET /api/oidc/agents/seed/transactions — 查询交易流水
 * 
 * Agent 的钱包 = 其所属用户（user_id）的钱包
 * Agent 可以查看余额和流水，但所有 SEED 操作都记录在用户账户下
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgentScopes, auditAgentRequest } from '@/lib/agent-middleware';
import { getOrCreateWallet, getTransactions } from '@/lib/seed';

export const dynamic = 'force-dynamic';

// ===== GET: 查询 SEED 余额 =====
export async function GET(request: NextRequest) {
  const agent = requireAgentScopes(request, ['agent:read']);
  if (agent instanceof Response) return agent;

  try {
    const wallet = getOrCreateWallet(agent.user_id);

    auditAgentRequest(request, agent, 'seed.balance.read');

    return NextResponse.json({
      success: true,
      balance: wallet.balance,
      total_earned: wallet.total_earned,
      total_spent: wallet.total_spent,
      // 提示：Agent 的 SEED 钱包与其所属用户共享
      wallet_owner: 'user',
      user_id: agent.user_id,
    });
  } catch (error: any) {
    console.error('Agent seed balance error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
