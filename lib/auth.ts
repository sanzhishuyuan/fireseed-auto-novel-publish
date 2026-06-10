import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Role } from '@/lib/permissions';
import { checkPermission, type Permission } from '@/lib/permissions';
import bcrypt from 'bcryptjs';

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

/**
 * 从请求中提取 userId，支持两种方式：
 *   1. Authorization: Bearer <token>（AI 客户端 / API 调用）
 *   2. auth_token cookie（浏览器登录用户）
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  // 方式 1: Authorization header
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearerToken) {
    try {
      const decoded = jwt.verify(bearerToken, JWT_SECRET) as any;
      if (decoded.userId) return decoded.userId;
    } catch { /* ignore invalid token */ }
  }

  // 方式 2: auth_token cookie
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, JWT_SECRET) as any;
      if (decoded.userId) return decoded.userId;
    } catch { /* ignore invalid token */ }
  }

  return null;
}

// 验证管理员密码（使用 bcrypt 哈希）
export async function verifyAdminPassword(password: string): Promise<boolean> {
  // 从数据库获取管理员用户的哈希密码
  const adminUser = db.prepare('SELECT password FROM users WHERE role = ? LIMIT 1').get('admin') as { password: string } | undefined;
  
  if (!adminUser) {
    // 如果数据库中没有管理员，回退到环境变量（仅用于首次设置）
    if (ENV_ADMIN_PASSWORD) {
      return password === ENV_ADMIN_PASSWORD;
    }
    return false;
  }
  
  // 使用 bcrypt 比较密码
  return bcrypt.compare(password, adminUser.password);
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

/**
 * 获取已认证的管理员用户信息（含角色）
 * 返回 null 表示未认证或不是有效的管理员
 */
export interface AdminUser {
  id: string;
  username: string;
  nickname: string;
  role: Role;
}

export function getAdminUser(request: NextRequest): AdminUser | null {
  const token =
    request.cookies.get('admin_token')?.value ||
    request.nextUrl?.searchParams?.get('admin_key');

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      type: string;
      userId?: string;
      username?: string;
      role?: string;
    };

    if (decoded.type !== 'admin' || !decoded.userId || !decoded.role) return null;

    // 从数据库获取最新信息（角色可能在后台被修改）
    const user = db.prepare('SELECT id, username, nickname, role FROM users WHERE id = ?').get(decoded.userId) as any;
    if (!user) return null;

    const role = user.role as Role;
    if (!['viewer', 'editor', 'admin', 'super_admin'].includes(role)) return null;

    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      role,
    };
  } catch {
    return null;
  }
}

/**
 * 要求管理员有指定权限，无权限时返回 403 Response
 * 用于 API Route：
 *
 *   const admin = requireAdmin(request, 'content.delete');
 *   if (admin instanceof Response) return admin;
 */
export function requireAdmin(
  request: NextRequest,
  permission?: Permission
): Response | AdminUser {
  const admin = getAdminUser(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
  }
  if (permission && !checkPermission(admin.role, permission)) {
    return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 });
  }
  return admin;
}


/**
 * 统一用户认证检查
 * 支持 Cookie（浏览器）和 Bearer Token（API）两种方式
 * 
 * @example
 *   const user = requireUser(request);
 *   if (user instanceof Response) return user;
 *   // user.id, user.username, user.role 可用
 */
export function requireUser(request: NextRequest): Response | TokenPayload {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
  }
  const token = request.headers.get('Authorization')?.startsWith('Bearer ')
    ? request.headers.get('Authorization')!.slice(7)
    : request.cookies.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  return {
    userId,
    username: payload?.username || '',
    role: payload?.role || 'reader',
    nickname: payload?.nickname,
  };
}
