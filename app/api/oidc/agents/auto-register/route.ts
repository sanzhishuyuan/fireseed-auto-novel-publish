/**
 * OIDC Agent 自动注册端点
 * POST /api/oidc/agents/auto-register
 * 
 * 用户首次在本地启动 AI 智能体时，Agent 自动向 FireSeed 完成注册。
 * 支持两种认证方式：
 *   1. 用户 JWT Token（Authorization: Bearer <user_jwt>）
 *   2. 预共享密钥（pre_shared_key）
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getUserIdFromRequest } from '@/lib/auth';
import db from '@/lib/db';
import oidcDb from '@/lib/oidc-db';
import { issueAgentAccessToken, issueAgentRefreshToken } from '@/lib/agent-token';

export const dynamic = 'force-dynamic';

const PRE_SHARED_KEY = process.env.AGENT_PRE_SHARED_KEY || '';

interface RegisterRequest {
  agent_name?: string;
  agent_type?: string;
  pre_shared_key?: string;
  user_id?: string;
  scopes?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { agent_name, agent_type, pre_shared_key, scopes } = body;

    let userId: string | null = null;
    let userName: string | null = null;

    // 方式 1: 用户 JWT Token
    userId = getUserIdFromRequest(request);
    if (userId) {
      const user = db.prepare('SELECT id, username, nickname FROM users WHERE id = ?').get(userId) as any;
      if (user) {
        userName = user.nickname || user.username;
      }
    }

    // 方式 2: 预共享密钥
    if (!userId && pre_shared_key && PRE_SHARED_KEY) {
      if (pre_shared_key !== PRE_SHARED_KEY) {
        return NextResponse.json({ success: false, error: '预共享密钥无效' }, { status: 401 });
      }
      if (!body.user_id) {
        return NextResponse.json({ success: false, error: '使用预共享密钥时必须提供 user_id' }, { status: 400 });
      }
      userId = body.user_id;
      const user = db.prepare('SELECT id, username, nickname FROM users WHERE id = ?').get(userId) as any;
      if (!user) {
        return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
      }
      userName = user.nickname || user.username;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请提供有效的用户 JWT 或预共享密钥' } },
        { status: 401 }
      );
    }

    // 检查是否已有活跃 Agent
    const existing = db.prepare(
      'SELECT * FROM oidc_agents WHERE user_id = ? AND status = "active"'
    ).get(userId) as any;

    if (existing) {
      db.prepare('UPDATE oidc_agents SET last_active_at = datetime("now") WHERE agent_id = ?').run(existing.agent_id);

      const requestedScopes = scopes && scopes.length > 0
        ? scopes.filter((s: string) => existing.allowed_scopes.includes(s)).join(' ')
        : existing.allowed_scopes;

      const tokenResult = issueAgentAccessToken({
        agent_id: existing.agent_id,
        user_id: userId,
        client_id: existing.client_id,
        agent_name: existing.agent_name,
        scope: requestedScopes,
      });

      const refreshTokenResult = issueAgentRefreshToken({
        agent_id: existing.agent_id,
        user_id: userId,
        client_id: existing.client_id,
        scope: requestedScopes,
      });

      return NextResponse.json({
        success: true,
        agent_id: existing.agent_id,
        agent_name: existing.agent_name,
        client_id: existing.client_id,
        client_secret: existing.client_secret,
        is_new: false,
        ...tokenResult,
        refresh_token: refreshTokenResult.refresh_token,
      });
    }

    // 创建新 Agent
    const agentId = `agent_${randomUUID().slice(0, 8)}`;
    const clientId = `agent_client_${randomUUID().slice(0, 8)}`;
    const clientSecret = `secret_${randomUUID().slice(0, 16)}`;
    const finalAgentName = agent_name || `${userName || '用户'} 的创作助手`;
    const finalAgentType = agent_type || 'local_llm';
    const finalScopes = scopes && scopes.length > 0
      ? scopes.join(' ')
      : 'novel:read novel:write signal:send signal:read agent:read';

    db.prepare(`
      INSERT INTO oidc_agents (agent_id, user_id, agent_name, agent_type, status, client_id, client_secret, allowed_scopes)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(agentId, userId, finalAgentName, finalAgentType, clientId, clientSecret, finalScopes);

    oidcDb.prepare(`
      INSERT INTO oidc_clients (id, client_id, client_secret, client_name, grant_types, scope, metadata)
      VALUES (?, ?, ?, ?, 'client_credentials refresh_token', ?, ?)
    `).run(randomUUID(), clientId, clientSecret, finalAgentName, finalScopes, JSON.stringify({ agent_id: agentId, user_id: userId }));

    const tokenResult = issueAgentAccessToken({
      agent_id: agentId,
      user_id: userId,
      client_id: clientId,
      agent_name: finalAgentName,
      scope: finalScopes,
    });

    const refreshTokenResult = issueAgentRefreshToken({
      agent_id: agentId,
      user_id: userId,
      client_id: clientId,
      scope: finalScopes,
    });

    return NextResponse.json({
      success: true,
      agent_id: agentId,
      agent_name: finalAgentName,
      agent_type: finalAgentType,
      client_id: clientId,
      client_secret: clientSecret,
      is_new: true,
      ...tokenResult,
      refresh_token: refreshTokenResult.refresh_token,
    });
  } catch (error: any) {
    console.error('Agent auto-register error:', error);
    return NextResponse.json({ success: false, error: error.message || '注册失败' }, { status: 500 });
  }
}
