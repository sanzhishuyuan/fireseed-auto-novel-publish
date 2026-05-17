/**
 * lib/token-audit.ts
 * Token 审计日志工具 — 记录每次 token 调用
 */
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export interface TokenAuditEntry {
  token_id?: string;
  user_id?: string;
  action: string;
  ip?: string;
  user_agent?: string;
  status: number;
  duration_ms?: number;
}

/**
 * 记录 token 调用到审计日志
 */
export function logTokenUsage(entry: TokenAuditEntry): void {
  try {
    db.prepare(`
      INSERT INTO token_usage_logs (id, token_id, user_id, action, ip, user_agent, status, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      entry.token_id || null,
      entry.user_id || null,
      entry.action,
      entry.ip || null,
      entry.user_agent || null,
      entry.status,
      entry.duration_ms || null
    );
  } catch (e) {
    // 审计日志非关键功能，失败不阻塞主流程
    console.error('[Audit] log failed:', e);
  }
}

/**
 * 从请求中提取客户端 IP
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * 记录 token 调用并返回包裹响应（方便中间件模式使用）
 */
export function withAudit<T>(
  request: Request,
  action: string,
  handler: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  return handler().then((result) => {
    // 如果是 Response，提取状态码
    if (result instanceof Response) {
      const tokenId = (request as any)._tokenId;
      logTokenUsage({
        token_id: tokenId,
        action,
        ip: getClientIp(request),
        user_agent: request.headers.get('user-agent') || undefined,
        status: result.status,
        duration_ms: Date.now() - start,
      });
    }
    return result;
  });
}
