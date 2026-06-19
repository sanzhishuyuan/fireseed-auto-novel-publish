import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/profile
 * 获取当前用户的个人资料（含昵称）
 */
export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  const profile = db.prepare(
    'SELECT id, username, nickname, email, role, created_at FROM users WHERE id = ?'
  ).get(ctx.user.id) as any;

  if (!profile) {
    return apiError('NOT_FOUND', '用户不存在', 404);
  }

  return apiSuccess({
    id: profile.id,
    username: profile.username,
    nickname: profile.nickname || profile.username,
    email: profile.email || '',
    role: profile.role,
    createdAt: profile.created_at
  });
});

/**
 * PUT /api/user/profile
 * 修改用户昵称和/或邮箱
 * Body: { nickname?: string, email?: string }
 */
export const PUT = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { nickname, email } = ctx.body;

  const updates: string[] = [];
  const values: any[] = [];

  // 昵称验证
  if (nickname !== undefined) {
    if (!nickname || typeof nickname !== 'string') {
      return apiError('VALIDATION_REQUIRED', '昵称不能为空', 400);
    }
    const trimmed = nickname.trim();
    if (trimmed.length < 1 || trimmed.length > 30) {
      return apiError('VALIDATION_INVALID_PARAM', '昵称需在 1-30 个字符之间', 400);
    }
    updates.push('nickname = ?');
    values.push(trimmed);
  }

  // 邮箱验证
  if (email !== undefined) {
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return apiError('VALIDATION_INVALID_PARAM', '邮箱格式不正确', 400);
    }
    // 检查邮箱是否已被其他用户使用
    if (trimmedEmail) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(trimmedEmail, ctx.user.id);
      if (existing) {
        return apiError('VALIDATION_INVALID_PARAM', '该邮箱已被其他用户使用', 400);
      }
    }
    updates.push('email = ?');
    values.push(trimmedEmail || null);
  }

  if (updates.length === 0) {
    return apiError('VALIDATION_REQUIRED', '没有需要更新的内容', 400);
  }

  values.push(ctx.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .run(...values);

  // 返回更新后的数据
  const updated = db.prepare(
    'SELECT id, username, nickname, email, role, created_at FROM users WHERE id = ?'
  ).get(ctx.user.id) as any;

  return apiSuccess({
    id: updated.id,
    username: updated.username,
    nickname: updated.nickname || updated.username,
    email: updated.email || '',
    role: updated.role,
    createdAt: updated.created_at
  });
});
