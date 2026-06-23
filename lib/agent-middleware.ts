/**
 * Agent Scope 权限中间件
 * 用于保护需要 Agent 认证的 API 端点
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentToken, hasScope, hasAllScopes, logAgentAudit, type AgentTokenPayload } from '@/lib/agent-token';
import { SCOPES } from '@/lib/agent-token';

/**
 * 要求 Agent 认证 + 指定 Scope
 * 
 * @example
 *   const agent = requireAgentScope(request, 'novel:write');
 *   if (agent instanceof Response) return agent;
 *   // agent.agent_id, agent.user_id, agent.scope 可用
 */
export function requireAgentScope(request: NextRequest, scope: string): Response | AgentTokenPayload {
  return requireAgentScopes(request, [scope]);
}

/**
 * 要求 Agent 认证 + 多个 Scope（全部满足）
 */
export function requireAgentScopes(request: NextRequest, scopes: string[]): Response | AgentTokenPayload {
  const agent = getAgentFromRequest(request);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Agent 认证失败，请提供有效的 Bearer Token' } },
      { status: 401 }
    );
  }

  const missingScopes = scopes.filter(s => !hasScope(agent.scope, s));
  if (missingScopes.length > 0) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: `权限不足，缺少 Scope: ${missingScopes.join(', ')}` } },
      { status: 403 }
    );
  }

  return agent;
}

/**
 * 从请求中提取 Agent 身份（可选认证）
 * 返回 Agent 信息或 null（不返回错误响应）
 */
export function getAgentFromRequest(request: NextRequest): AgentTokenPayload | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  return verifyAgentToken(token);
}

/**
 * 记录 Agent API 调用审计
 */
export function auditAgentRequest(
  request: NextRequest,
  agent: AgentTokenPayload,
  action: string,
  target?: { type: string; id: string }
): void {
  logAgentAudit({
    agent_id: agent.agent_id,
    user_id: agent.user_id,
    action,
    target_type: target?.type,
    target_id: target?.id,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  });
}

// 导出 Scope 常量，方便其他模块引用
export { SCOPES };
