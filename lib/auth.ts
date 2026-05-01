import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

// 生产环境必须设置这些环境变量
const ENV_JWT_SECRET = process.env.JWT_SECRET;
const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// 安全检查：生产环境禁止使用默认值
if (!ENV_JWT_SECRET || !ENV_ADMIN_PASSWORD) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[安全错误] 生产环境必须设置 JWT_SECRET 和 ADMIN_PASSWORD 环境变量');
  }
  // 开发环境使用占位符
  console.warn('[警告] 未设置 JWT_SECRET 或 ADMIN_PASSWORD，请创建 .env.local 文件');
}

// 开发环境回退值（仅用于本地开发）
const JWT_SECRET = ENV_JWT_SECRET || 'dev-only-secret-do-not-use-in-production';
const ADMIN_PASSWORD = ENV_ADMIN_PASSWORD || 'admin123';

// 导出给其他模块使用
export { JWT_SECRET, ADMIN_PASSWORD };

export interface TokenPayload {
  userId: string;
  username: string;
  nickname?: string;
  role: string;
}

// 生成JWT Token
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// 验证Token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// 获取当前用户
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// 验证管理员密码
export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

// 生成 Admin JWT Token（替代明文密码 Cookie）
export function generateAdminToken(): string {
  return jwt.sign({ type: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

// 验证 Admin JWT Token
export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { type: string };
    return decoded.type === 'admin';
  } catch {
    return false;
  }
}

// 生成AI Token（使用加密安全随机数）
export function generateAIToken(): string {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}

/**
 * 统一管理员权限检查
 * 支持两种认证方式：
 *   1. Cookie: admin_token（浏览器登录后自动携带）
 *   2. Query Param: ?admin_key=<token>（外部/自动化调用）
 */
export function isAdminAuthed(request: NextRequest): boolean {
  const adminKey = request.nextUrl?.searchParams?.get('admin_key');
  const cookieAdminToken = request.cookies.get('admin_token')?.value;
  if (adminKey && verifyAdminToken(adminKey)) return true;
  if (cookieAdminToken && verifyAdminToken(cookieAdminToken)) return true;
  return false;
}
