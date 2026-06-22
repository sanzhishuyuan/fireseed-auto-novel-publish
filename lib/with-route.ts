/**
 * API 路由高阶包装器
 * 
 * 统一处理：认证检查、请求体解析、错误捕获、响应格式化
 * 
 * @example
 * // 简单公开路由
 * export const GET = withRoute({ auth: 'none' }, async (req) => {
 *   const novels = db.prepare('SELECT * FROM novels').all();
 *   return apiSuccess(novels);
 * });
 * 
 * @example
 * // 需要用户登录的 POST 路由
 * export const POST = withRoute({ auth: 'user', body: true }, async (req, ctx) => {
 *   const { title } = ctx.body;
 *   // ctx.user 保证存在
 *   return apiSuccess({ id: '...', title });
 * });
 * 
 * @example
 * // 需要管理员权限
 * export const DELETE = withRoute({ auth: 'admin', permission: 'content.delete' }, async (req, ctx) => {
 *   // ctx.admin 保证存在且有对应权限
 *   return apiSuccess({ deleted: true });
 * });
 * 
 * @example
 * // AI 路由（三级 Token 认证）
 * export const POST = withRoute({ auth: 'ai', body: true }, async (req, ctx) => {
 *   // ctx.ai 包含认证结果
 *   return apiSuccess({ created: true });
 * });
 */

import type { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { safeParseJSON } from '@/lib/request-parser';
import { requireAdmin, getUserIdFromRequest, verifyToken } from '@/lib/auth';
import { requireAI } from '@/lib/ai-auth';
import type { Permission } from '@/lib/permissions';
import type { AdminUser } from '@/lib/auth';
import type { AIAuthResult } from '@/lib/ai-auth';

// ─── 路由上下文类型 ───

interface RouteContextBase {
  /** URL 路径参数（Next.js 14 动态路由） */
  params?: Record<string, string>;
}

export interface PublicContext extends RouteContextBase {
  auth: 'none';
  body?: any;
}

export interface UserContext extends RouteContextBase {
  auth: 'user';
  user: { id: string; username: string; role: string; nickname?: string };
  body?: any;
}

export interface AdminContext extends RouteContextBase {
  auth: 'admin';
  admin: AdminUser;
  body?: any;
}

export interface AIContext extends RouteContextBase {
  auth: 'ai';
  ai: AIAuthResult;
  body?: any;
}

export type RouteContext = PublicContext | UserContext | AdminContext | AIContext;

// ─── 路由配置选项 ───

export interface RouteOptions {
  /** 认证类型: 'none' 公开 | 'user' 需登录 | 'admin' 管理员 | 'ai' AI Token */
  auth?: 'none' | 'user' | 'admin' | 'ai';
  /** 管理员所需权限（仅 auth='admin' 时有效） */
  permission?: Permission;
  /** 是否自动解析 JSON 请求体 */
  body?: boolean;
  /** AI 认证是否可选（tryAI 模式） */
  optionalAuth?: boolean;
  /** 允许的内容大小（字节），默认 500KB */
  maxBodySize?: number;
}

// ─── 路由处理函数签名 ───

type ContextForAuth<T extends string | undefined> =
  T extends 'admin' ? AdminContext :
  T extends 'user' ? UserContext :
  T extends 'ai' ? AIContext :
  PublicContext;

type HandlerFn<Ctx = RouteContext> = (request: NextRequest, ctx: Ctx) => Promise<Response>;

// ─── 核心包装器 ───

export function withRoute<T extends RouteOptions['auth']>(
  options: RouteOptions & { auth?: T },
  handler: HandlerFn<ContextForAuth<T>>
) {

  return async (request: NextRequest, routeCtx: { params?: Promise<Record<string, string>> }) => {
    try {
      // 1. 解析动态路由参数
      let params: Record<string, string> | undefined;
      if (routeCtx.params) {
        params = await routeCtx.params;
      }

      // 2. 认证检查
      let ctx: RouteContext = { auth: "none" as const, params };

      switch (options.auth) {
        case 'user': {
          const userId = getUserIdFromRequest(request);
          if (!userId) {
            return apiError('UNAUTHORIZED', '请先登录', 401);
          }
          // 获取完整用户信息
          const token = request.headers.get('Authorization')?.startsWith('Bearer ')
            ? request.headers.get('Authorization')!.slice(7)
            : request.cookies.get('auth_token')?.value;
          const payload = token ? verifyToken(token) : null;
          ctx = {
            auth: 'user',
            user: {
              id: userId,
              username: payload?.username || '',
              role: payload?.role || 'reader',
              nickname: payload?.nickname,
            },
            params,
          };
          break;
        }

        case 'admin': {
          const admin = requireAdmin(request, options.permission);
          if (admin instanceof Response) return admin;
          ctx = { auth: 'admin', admin, params };
          break;
        }

        case 'ai': {
          // AI 认证在 body 解析后可能用到 body.token，先尝试 header
          let aiAuth = requireAI(request);
          // 如果需要 body 且 header 认证失败，标记为延迟认证（body 解析后重试）
          if (!aiAuth.valid && options.body) {
            (ctx as any) = { auth: 'ai', ai: aiAuth, params, _needBodyAuth: true };
            break;
          }
          ctx = { auth: 'ai', ai: aiAuth, params };
          break;
        }

        default: {
          ctx = { auth: 'none' as const, params };
          break;
        }
      }

      // 3. 请求体解析
      if (options.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        // 读取原始字节而非 request.text()，以支持非 UTF-8 编码检测和回退
        const arrayBuffer = await request.arrayBuffer();
        if (arrayBuffer.byteLength > 0) {
          const bytes = new Uint8Array(arrayBuffer);
          
          // 先用 UTF-8 解码
          let bodyText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          
          // 检测是否有过多的替换字符（U+FFFD），这通常意味着外部客户端以非 UTF-8 编码发送了数据
          const utf8ReplacementCount = (bodyText.match(/\uFFFD/g) || []).length;
          if (utf8ReplacementCount > 0 && utf8ReplacementCount / Math.max(bodyText.length, 1) > 0.1) {
            // 尝试 GBK 解码（常见于中文 Windows 环境的 AI 代理脚本）
            try {
              const gbkText = new TextDecoder('gbk', { fatal: false }).decode(bytes);
              const gbkReplacementCount = (gbkText.match(/\uFFFD/g) || []).length;
              if (gbkReplacementCount < utf8ReplacementCount) {
                bodyText = gbkText;
                console.warn(
                  `[编码检测] 请求体包含非 UTF-8 编码数据，已自动回退 GBK 解码 ` +
                  `(替换字符: ${utf8ReplacementCount}→${gbkReplacementCount}), ` +
                  `路径: ${request.nextUrl.pathname}`
                );
              }
            } catch { /* GBK 解码失败，保留 UTF-8 结果 */ }
          }

          const parsed = safeParseJSON(bodyText);
          if (!parsed.success) return parsed.response;
          (ctx as any).body = parsed.data;

          // AI 延迟认证：body 解析后用 body.token 重试
          if ((ctx as any)._needBodyAuth) {
            const aiAuth = requireAI(request, parsed.data.token);
            (ctx as any).ai = aiAuth;
            delete (ctx as any)._needBodyAuth;
          }
        } else {
          (ctx as any).body = {};
        }
      }

      // 4. AI 认证最终检查（body 解析后）
      if (options.auth === 'ai' && !(ctx as AIContext).ai.valid && !options.optionalAuth) {
        return apiError('UNAUTHORIZED', 'Unauthorized', 401);
      }

      // 5. 执行业务逻辑
      const result = await handler(request, ctx as ContextForAuth<T>);
      return result;

    } catch (error) {
      // 统一错误处理
      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, error);
      
      const message = error instanceof Error ? error.message : '服务内部错误';
      
      // 区分业务错误和系统错误
      if (message.includes('超时')) {
        return apiError('TIMEOUT', '请求处理超时', 504);
      }
      if (message.includes('内容过大')) {
        return apiError('CONTENT_TOO_LARGE', message, 413);
      }
      
      return apiError('INTERNAL_ERROR', '服务内部错误', 500);
    }
  };
}
