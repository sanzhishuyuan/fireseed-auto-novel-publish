/**
 * FireSeed 路径安全工具
 *
 * 防止路径遍历攻击（Path Traversal）。
 * 所有接收用户输入并在文件路径中使用的函数都应调用 sanitizeId() 进行校验。
 */

/**
 * 严格校验并净化路径标识符
 * 只允许字母、数字、下划线、连字符
 * 返回净化后的 ID，如果为空则返回 null
 */
export function sanitizeId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * 验证文件路径是否在预期的基目录下
 * 用于需要更复杂路径拼接的场景
 */
export function validatePathInside(baseDir: string, targetPath: string): string | null {
  const resolved = path.resolve(baseDir, targetPath);
  const normalizedBase = path.resolve(baseDir) + path.sep;
  if (!resolved.startsWith(normalizedBase)) {
    return null;
  }
  return resolved;
}

// 需要在文件顶部导入 path
import path from 'path';
