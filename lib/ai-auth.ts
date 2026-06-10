/**
 * AI 认证统一模块
 * 
 * 整合三种 Token 验证方式为统一接口：
 *   1. JWT Bearer Token（注册用户）
 *   2. user_tokens 表（API Token）
 *   3. ai_tokens 表（旧系统兼容，含配额管理）
 * 
 * 替代各 AI 路由中分散的 verifyAIToken / verifyTokenString 等重复函数
 */

import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';
import db from '@/lib/db';

export interface AIAuthResult {
  valid: boolean;
  userId?: string;
  tokenType: 'jwt' | 'user_token' | 'ai_token' | 'none';
  token?: string;
  /** ai_tokens 记录（仅 ai_token 类型时有值） */
  aiTokenRecord?: Record<string, unknown>;
}

/**
 * 从 Authorization header 中提取 Bearer token
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * 验证单个 token 字符串（三级回退）
 */
function verifyTokenString(token: string): AIAuthResult {
  // 1. JWT Token
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: string };
    return { valid: true, userId: decoded.userId, tokenType: 'jwt', token };
  } catch {
    // JWT 无效，继续检查
  }

  // 2. user_tokens 表
  const userToken = db.prepare(
    'SELECT user_id, is_active FROM user_tokens WHERE token = ?'
  ).get(token) as { user_id: string; is_active: number } | undefined;

  if (userToken && userToken.is_active === 1) {
    db.prepare('UPDATE user_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
    return { valid: true, userId: userToken.user_id, tokenType: 'user_token', token };
  }

  // 3. ai_tokens 表（含配额管理和每日重置）
  const aiToken = db.prepare(
    'SELECT * FROM ai_tokens WHERE token = ? AND is_active = 1'
  ).get(token) as Record<string, unknown> | undefined;

  if (!aiToken) {
    return { valid: false, tokenType: 'none', token };
  }

  // 配额每日重置检查
  const now = new Date();
  const resetAt = aiToken.quota_reset_at ? new Date(aiToken.quota_reset_at as string) : null;
  if (resetAt && now >= resetAt) {
    db.prepare(
      'UPDATE ai_tokens SET quota_used = 0, quota_reset_at = datetime("now", "+1 day") WHERE token = ?'
    ).run(token);
    aiToken.quota_used = 0;
  }

  // 配额检查
  const quotaUsed = (aiToken.quota_used as number) || 0;
  const quotaLimit = (aiToken.quota_limit as number) || 100;
  if (quotaUsed >= quotaLimit) {
    return { valid: false, tokenType: 'ai_token', token, aiTokenRecord: aiToken };
  }

  // 更新使用记录
  db.prepare(
    'UPDATE ai_tokens SET last_used = CURRENT_TIMESTAMP, quota_used = quota_used + 1 WHERE token = ?'
  ).run(token);

  return { valid: true, userId: undefined, tokenType: 'ai_token', token, aiTokenRecord: aiToken };
}

/**
 * AI 路由统一认证
 * 
 * 优先级：Authorization Bearer Header > request body token 字段
 * 
 * @example
 * const auth = requireAI(request);
 * if (!auth.valid) return apiError('UNAUTHORIZED', '请先认证', 401);
 * // auth.userId 可用（JWT/user_token 时有值，ai_token 时无值）
 */
export function requireAI(request: NextRequest, bodyToken?: string): AIAuthResult {
  // 1. 优先 Authorization header
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    const result = verifyTokenString(bearerToken);
    if (result.valid) return result;
  }

  // 2. 回退 body token（兼容 upload-md 等旧接口）
  if (bodyToken) {
    const result = verifyTokenString(bodyToken);
    if (result.valid) return result;
  }

  return { valid: false, tokenType: 'none' };
}

/**
 * AI 路由认证（宽松版，仅验证不拒绝）
 * 用于 GET 列表等不需要强制认证的端点
 */
export function tryAI(request: NextRequest): AIAuthResult {
  const bearerToken = extractBearerToken(request);
  if (!bearerToken) return { valid: false, tokenType: 'none' };
  return verifyTokenString(bearerToken);
}
