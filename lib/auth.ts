import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// 生产环境必须设置这些环境变量
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// 安全检查：生产环境禁止使用默认值
if (!JWT_SECRET || !ADMIN_PASSWORD) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[安全错误] 生产环境必须设置 JWT_SECRET 和 ADMIN_PASSWORD 环境变量');
  }
  // 开发环境使用占位符
  console.warn('[警告] 未设置 JWT_SECRET 或 ADMIN_PASSWORD，请创建 .env.local 文件');
}

// 开发环境回退值（仅用于本地开发）
const DEV_JWT_SECRET = JWT_SECRET || 'dev-only-secret-do-not-use-in-production';
const DEV_ADMIN_PASSWORD = ADMIN_PASSWORD || 'admin123';

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

// 生成JWT Token
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, DEV_JWT_SECRET, { expiresIn: '7d' });
}

// 验证Token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, DEV_JWT_SECRET) as TokenPayload;
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
  return password === DEV_ADMIN_PASSWORD;
}

// 生成AI Token
export function generateAIToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 导出 ADMIN_PASSWORD（供其他模块使用）
export { DEV_ADMIN_PASSWORD as ADMIN_PASSWORD };
