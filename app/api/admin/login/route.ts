import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { verifyAdminPassword, JWT_SECRET } from '@/lib/auth';
import db from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { safeParseJSON } from '@/lib/request-parser';
import { canAccessAdmin, type Role } from '@/lib/permissions';
import { logAdminAction } from '@/lib/audit';

/**
 * POST /api/admin/login
 *
 * 支持三种认证方式（按优先级）：
 *   1. 用户名 + 密码（数据库 users 表，role >= viewer）
 *   2. ADMIN_PASSWORD 环境变量（兼容旧方式，紧急后门）
 *   3. 数据库 role='admin' 的老账号（向后兼容迁移期）
 */
export async function POST(request: NextRequest) {
  // P0-4: 速率限制（每分钟最多10次登录尝试）
  const rateLimit = checkRateLimit(request, undefined, 'auth');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  try {
    const bodyText = await request.text();

    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;

    const { username, password } = parsed.data;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';

    // 方式1: 用户名 + 密码（推荐）
    if (username && password) {
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      if (user && canAccessAdmin(user.role as Role)) {
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
          // 兼容旧版 role='admin'（旧系统最高权限 = 新系统的 super_admin）
          let effectiveRole = user.role;
          if (effectiveRole === 'admin') {
            db.prepare("UPDATE users SET role = 'super_admin' WHERE id = ? AND role = 'admin'").run(user.id);
            effectiveRole = 'super_admin';
          }

          // 生成带角色信息的 JWT
          const adminToken = jwt.sign(
            {
              type: 'admin',
              userId: user.id,
              username: user.username,
              role: effectiveRole,
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          // 审计日志
          logAdminAction({
            adminId: user.id,
            adminUsername: user.username,
            action: 'login',
            targetType: 'user',
            targetId: user.id,
            detail: { method: 'password', role: effectiveRole, autoUpgraded: user.role !== effectiveRole },
            ipAddress,
          });

          const response = NextResponse.json({
            success: true,
            admin: {
              id: user.id,
              username: user.username,
              nickname: user.nickname || user.username,
              role: effectiveRole,
            },
          });

          response.cookies.set('admin_token', adminToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24h
          });

          return response;
        }
      }
    }

    // 方式2: ADMIN_PASSWORD 环境变量（紧急后门，仅需密码）
    if (password && await verifyAdminPassword(password)) {
      // 查找或创建后门管理员记录
      let adminUser = db.prepare("SELECT * FROM users WHERE username = '__admin__'").get() as any;
      if (!adminUser) {
        const hashed = await bcrypt.hash('backup-' + Math.random().toString(36).slice(2), 10);
        db.prepare("INSERT INTO users (id, username, password, role) VALUES (?, '__admin__', ?, 'super_admin')")
          .run('admin-builtin-' + Date.now(), hashed);
        adminUser = db.prepare("SELECT * FROM users WHERE username = '__admin__'").get() as any;
      }

      // 确保后门账号是 super_admin
      if (adminUser.role !== 'super_admin') {
        db.prepare("UPDATE users SET role = 'super_admin' WHERE username = '__admin__'").run();
        adminUser.role = 'super_admin';
      }

      const adminToken = jwt.sign(
        {
          type: 'admin',
          userId: adminUser.id,
          username: adminUser.username,
          role: 'super_admin',
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      logAdminAction({
        adminId: adminUser.id,
        adminUsername: '__admin__',
        action: 'login',
        targetType: 'user',
        targetId: adminUser.id,
        detail: { method: 'admin_password_backdoor', role: 'super_admin' },
        ipAddress,
      });

      const response = NextResponse.json({
        success: true,
        admin: {
          id: adminUser.id,
          username: '__admin__',
          nickname: '系统管理员',
          role: 'super_admin',
        },
      });

      response.cookies.set('admin_token', adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      });

      return response;
    }

    // 方式3: 旧版 role='admin' 兼容（迁移期支持）
    if (password) {
      const oldAdminUsers = db.prepare("SELECT * FROM users WHERE role = 'admin'").all() as any[];
      for (const user of oldAdminUsers) {
        if (await bcrypt.compare(password, user.password)) {
          // 自动升级为 super_admin
          db.prepare("UPDATE users SET role = 'super_admin' WHERE id = ?").run(user.id);
          user.role = 'super_admin';

          const adminToken = jwt.sign(
            {
              type: 'admin',
              userId: user.id,
              username: user.username,
              role: 'super_admin',
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          logAdminAction({
            adminId: user.id,
            adminUsername: user.username,
            action: 'login',
            targetType: 'user',
            targetId: user.id,
            detail: { method: 'legacy_admin_role', role: 'super_admin', autoUpgraded: true },
            ipAddress,
          });

          const response = NextResponse.json({
            success: true,
            admin: {
              id: user.id,
              username: user.username,
              nickname: user.nickname || user.username,
              role: 'super_admin',
            },
          });

          response.cookies.set('admin_token', adminToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
          });

          return response;
        }
      }
    }

    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
