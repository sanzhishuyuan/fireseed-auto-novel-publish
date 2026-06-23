/**
 * OIDC Token 端点
 * POST /api/oidc/token
 * 
 * 支持：
 *   - client_credentials: Agent 获取 access_token
 *   - refresh_token: 刷新 access_token
 *   - revoke: 撤销令牌
 */
import { NextRequest, NextResponse } from 'next/server';
import { authenticateClient, issueAgentAccessToken, issueAgentRefreshToken, revokeAgentTokens, verifyAgentToken } from '@/lib/agent-token';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, string>;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = {};
      formData.forEach((value, key) => {
        body[key] = value.toString();
      });
    } else {
      body = await request.json();
    }

    const grantType = body.grant_type;

    // ===== client_credentials 流程 =====
    if (grantType === 'client_credentials') {
      const clientId = body.client_id;
      const clientSecret = body.client_secret;
      const requestedScope = body.scope || '';

      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: 'invalid_client', error_description: '缺少 client_id 或 client_secret' },
          { status: 400 }
        );
      }

      const agent = authenticateClient(clientId, clientSecret);
      if (!agent) {
        return NextResponse.json(
          { error: 'invalid_client', error_description: 'client_id 或 client_secret 无效' },
          { status: 401 }
        );
      }

      // 验证请求的 Scope 是否在允许范围内
      let finalScope = agent.allowed_scopes;
      if (requestedScope) {
        const requestedScopes = requestedScope.split(' ').filter(Boolean);
        const allowedScopes = agent.allowed_scopes.split(' ').filter(Boolean);
        const validScopes = requestedScopes.filter(s => allowedScopes.includes(s));
        if (validScopes.length === 0) {
          return NextResponse.json(
            { error: 'invalid_scope', error_description: '请求的 Scope 不在允许范围内' },
            { status: 400 }
          );
        }
        finalScope = validScopes.join(' ');
      }

      const tokenResult = issueAgentAccessToken({
        agent_id: agent.agent_id,
        user_id: agent.user_id,
        client_id: clientId,
        agent_name: agent.agent_name,
        scope: finalScope,
      });

      return NextResponse.json(tokenResult);
    }

    // ===== refresh_token 流程 =====
    if (grantType === 'refresh_token') {
      const refreshToken = body.refresh_token;
      if (!refreshToken) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: '缺少 refresh_token' },
          { status: 400 }
        );
      }

      const decoded = verifyAgentToken(refreshToken);
      if (!decoded || (decoded as any).token_type !== 'agent_refresh') {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'refresh_token 无效或已过期' },
          { status: 401 }
        );
      }

      // 验证 client_id 匹配
      if (body.client_id && body.client_id !== decoded.client_id) {
        return NextResponse.json(
          { error: 'invalid_client', error_description: 'client_id 不匹配' },
          { status: 401 }
        );
      }

      // 重新验证 Agent 状态
      const agent = authenticateClient(decoded.client_id, '');
      if (!agent) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Agent 已被禁用' },
          { status: 401 }
        );
      }

      // 颁发新的 access_token
      const tokenResult = issueAgentAccessToken({
        agent_id: decoded.agent_id,
        user_id: decoded.user_id,
        client_id: decoded.client_id,
        agent_name: (decoded as any).agent_name || agent.agent_name,
        scope: decoded.scope,
      });

      return NextResponse.json(tokenResult);
    }

    // ===== revoke 流程 =====
    if (grantType === 'revoke') {
      const token = body.token;
      if (!token) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: '缺少 token' },
          { status: 400 }
        );
      }

      const decoded = verifyAgentToken(token);
      if (decoded) {
        revokeAgentTokens(decoded.agent_id);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'unsupported_grant_type', error_description: `不支持的 grant_type: ${grantType}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('OIDC token error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: error.message || '令牌服务错误' },
      { status: 500 }
    );
  }
}
