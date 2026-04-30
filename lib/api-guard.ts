/**
 * P1-3: API 安全工具
 * 
 * 提供：
 * 1. 请求超时包装器（防止连接池耗尽）
 * 2. 内容大小校验（防止恶意大文件）
 */

export const CONTENT_MAX_BYTES = 500 * 1024; // 单章节最大 500KB

/**
 * 检查请求内容大小是否在安全范围内
 * @param contentLength 请求头 Content-Length
 * @param maxBytes 最大字节数
 * @param endpoint 用于日志的端点名
 */
export function validateContentSize(
  contentLength: number | null,
  maxBytes: number = CONTENT_MAX_BYTES,
  endpoint?: string
): { valid: boolean; error?: string } {
  if (contentLength === null) {
    return { valid: true }; // 无法判断，跳过
  }
  if (contentLength > maxBytes) {
    return {
      valid: false,
      error: `内容过大（${Math.round(contentLength / 1024)}KB），单章节限制 ${Math.round(maxBytes / 1024)}KB`
    };
  }
  return { valid: true };
}

/**
 * 带超时的异步操作包装器
 * @param promise 要执行的异步操作
 * @param timeoutMs 超时毫秒数
 * @param operationName 操作名称（用于错误日志）
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  operationName?: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`操作超时（${timeoutMs}ms）${operationName ? `: ${operationName}` : ''}`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result as T;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}
