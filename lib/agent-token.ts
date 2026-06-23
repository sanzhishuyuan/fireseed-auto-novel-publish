/**
 * Agent 令牌服务
 * 基于 JWT 的轻量级 OIDC 令牌管理，兼容标准 OAuth 2.0 client_credentials 流程
 * 
 * 设计决策：
 * - 不引入 oidc-provider 第三方库（避免与 Next.js App Router 的兼容性问题）
 * - 使用现有的 jsonwebtoken 库实现标准 JWT 令牌
 * - 完全兼容方案 v2.1 的 Agentic JWT Claims 设计
 */
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import db from '@/lib/db';
import oidcDb from '@/lib/oidc-db';
import { JWT_SECRET } from '@/lib/auth';

// ===== Scope 常量定义 =====
export const SCOPES = {
  NOVEL_READ: 'novel:read',
  NOVEL_WRITE: 'novel:write',
  NOVEL_DELETE: 'novel:delete',
  SIGNAL_SEND: 'signal:send',
  SIGNAL_READ: 'signal:read',
  AGENT_READ: 'agent:read',
} as const;

export const ALL_SCOPES = Object.values(SCOPES);

// ===== Agent JWT Payload 类型 =====
export interface AgentTokenPayload {
  agent_id: string;
  user_id: string;
  scope: string;
  token_type: 'agent_access';
  client_id: string;
  agent_name?: string;
  iat: number;
  exp: number;
  jti: string;
}

// ===== 令牌有效期配置 =====
const ACCESS_TOKEN_TTL = 60 * 60; // 1 小时
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 天

/**
 * 验证 client_id 和 client_secret，返回 Agent 信息
 */
export function authenticateClient(clientId: string, clientSecret: string): {
  agent_id: string;
  user_id: string;
  agent_name: string;
  allowed_scopes: string;
} | null {
  // 从 oidc_agents 表查询
  const agent = db.prepare(`
    SELECT agent_id, user_id, agent_name, allowed_scopes, status
    FROM oidc_agents
    WHERE client_id = ? AND client_secret = ? AND status = 'active'
  `).get(clientId, clientSecret) as any;

  if (!agent) return null;
  return {
    agent_id: agent.agent_id,
    user_id: agent.user_id,
    agent_name: agent.agent_name,
    allowed_scopes: agent.allowed_scopes,
  };
}

/**
 * 验证请求中的 Agent Bearer Token
 * 返回 Agent 身份信息或 null
 */
export function verifyAgentToken(token: string): AgentTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AgentTokenPayload;
    if (decoded.token_type !== 'agent_access') return null;

    // 检查令牌是否已被撤销
    const revoked = oidcDb.prepare('SELECT id FROM oidc_revocations WHERE jti = ?').get(decoded.jti);
    if (revoked) return null;

    // 检查 Agent 是否仍然活跃
    const agent = db.prepare('SELECT status FROM oidc_agents WHERE agent_id = ?').get(decoded.agent_id) as any;
    if (!agent || agent.status !== 'active') return null;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * 颁发 Agent Access Token
 */
export function issueAgentAccessToken(params: {
  agent_id: string;
  user_id: string;
  client_id: string;
  agent_name: string;
  scope: string;
}): { access_token: string; token_type: string; expires_in: number; scope: string } {
  const jti = randomUUID();
  const payload: AgentTokenPayload = {
    agent_id: params.agent_id,
    user_id: params.user_id,
    scope: params.scope,
    token_type: 'agent_access',
    client_id: params.client_id,
    agent_name: params.agent_name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL,
    jti,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

  // 记录令牌到 oidc_tokens 表
  oidcDb.prepare(`
    INSERT INTO oidc_tokens (id, client_id, agent_id, user_id, token_type, scope, jti, expires_at)
    VALUES (?, ?, ?, ?, 'access_token', ?, ?, datetime('now', '+1 hour'))
  `).run(randomUUID(), params.client_id, params.agent_id, params.user_id, params.scope, jti);

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL,
    scope: params.scope,
  };
}

/**
 * 颁发 Agent Refresh Token
 */
export function issueAgentRefreshToken(params: {
  agent_id: string;
  user_id: string;
  client_id: string;
  scope: string;
}): { refresh_token: string; expires_in: number; scope: string } {
  const jti = randomUUID();
  const payload = {
    agent_id: params.agent_id,
    user_id: params.user_id,
    scope: params.scope,
    token_type: 'agent_refresh',
    client_id: params.client_id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL,
    jti,
  };

  const refreshToken = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

  oidcDb.prepare(`
    INSERT INTO oidc_tokens (id, client_id, agent_id, user_id, token_type, scope, jti, expires_at)
    VALUES (?, ?, ?, ?, 'refresh_token', ?, ?, datetime('now', '+7 days'))
  `).run(randomUUID(), params.client_id, params.agent_id, params.user_id, params.scope, jti);

  return {
    refresh_token: refreshToken,
    expires_in: REFRESH_TOKEN_TTL,
    scope: params.scope,
  };
}

/**
 * 撤销 Agent 的所有令牌
 */
export function revokeAgentTokens(agentId: string): number {
  // 将所有未撤销的令牌标记为已撤销
  const result = oidcDb.prepare(`
    UPDATE oidc_tokens SET revoked = 1
    WHERE agent_id = ? AND revoked = 0
  `).run(agentId);
  return result.changes;
}

/**
 * 检查 Agent 是否拥有指定 Scope
 */
export function hasScope(tokenScopes: string, requiredScope: string): boolean {
  const scopes = tokenScopes.split(' ').filter(Boolean);
  return scopes.includes(requiredScope);
}

/**
 * 检查 Agent 是否拥有所有指定 Scope
 */
export function hasAllScopes(tokenScopes: string, requiredScopes: string[]): boolean {
  const scopes = tokenScopes.split(' ').filter(Boolean);
  return requiredScopes.every(s => scopes.includes(s));
}

/**
 * 记录 Agent 审计日志
 */
export function logAgentAudit(params: {
  agent_id: string;
  user_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  ip?: string;
  userAgent?: string;
  detail?: string;
}): void {
  try {
    db.prepare(`
      INSERT INTO agent_audit_logs (id, agent_id, user_id, action, target_type, target_id, ip_address, user_agent, detail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      params.agent_id,
      params.user_id,
      params.action,
      params.target_type || null,
      params.target_id || null,
      params.ip || null,
      params.userAgent || null,
      params.detail || null,
    );
  } catch (e) {
    console.error('Agent audit log error:', e);
  }
}
