/**
 * P0-4: 轻量级内存速率限制器（滑动窗口算法）
 *
 * 适用场景：单实例 PM2 部署
 * 注意：多实例部署时需替换为 Redis 版本（upstash/ratelimit）
 *
 * 限制策略：
 * - 敏感操作（登录/注册/Token生成）：严格限制
 * - 写操作（发布小说/章节）：中等限制
 * - 读操作（获取列表/详情）：宽松
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // ms 时间戳
}

// 内存存储（单实例有效）
const store = new Map<string, RateLimitEntry>();

// 清理过期条目（每小时清理一次）
const CLEANUP_INTERVAL = 60 * 60 * 1000;
let lastCleanup = Date.now();

// 限制配置（窗口时间秒， 最大请求数）
export const RateLimitConfig = {
  // 认证类：最严格
  auth: { windowMs: 60, max: 10 },
  // AI 发布类：中等
  aiWrite: { windowMs: 60, max: 30 },
  // 读操作：宽松
  read: { windowMs: 60, max: 120 },
} as const;

type RateLimitTier = keyof typeof RateLimitConfig;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

/**
 * 获取客户端 IP
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

/**
 * 速率限制检查
 * @param request 请求对象
 * @param identifier 自定义标识符（默认用 IP）
 * @param tier 限制级别
 */
export function checkRateLimit(
  request: Request,
  identifier?: string,
  tier: RateLimitTier = 'auth'
): RateLimitResult {
  // 定期清理过期条目
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    cleanupExpired(now);
    lastCleanup = now;
  }

  const config = RateLimitConfig[tier];
  const key = `ratelimit:${identifier || getClientIp(request)}:${tier}`;
  const entry = store.get(key);

  // 窗口已过期，重置
  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs * 1000,
    };
    store.set(key, newEntry);
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // 窗口内计数超限
  if (entry.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    };
  }

  // 窗口内正常请求
  entry.count++;
  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * 根据速率限制结果返回 NextResponse（方便在路由中使用）
 */
export function rateLimitResponse(result: RateLimitResult): Response | null {
  if (result.allowed) return null;

  const retryAfter = Math.ceil((result.retryAfterMs || 0) / 1000);
  return new Response(
    JSON.stringify({ error: '请求过于频繁，请稍后再试' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

function cleanupExpired(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}
