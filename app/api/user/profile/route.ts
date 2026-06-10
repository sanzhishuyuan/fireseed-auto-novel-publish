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
    'SELECT id, username, nickname, role, created_at FROM users WHERE id = ?'
  ).get(ctx.user.id) as any;

  if (!profile) {
    return apiError('NOT_FOUND', '用户不存在', 404);
  }

  return apiSuccess({
    id: profile.id,
    username: profile.username,
    nickname: profile.nickname || profile.username,
    role: profile.role,
    createdAt: profile.created_at
  });
});

/**
 * PUT /api/user/profile
 * 修改用户昵称
 * Body: { nickname: string }
 */
export const PUT = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { nickname } = ctx.body;

  if (!nickname || typeof nickname !== 'string') {
    return apiError('VALIDATION_REQUIRED', '昵称不能为空', 400);
  }

  const trimmed = nickname.trim();
  if (trimmed.length < 1 || trimmed.length > 30) {
    return apiError('VALIDATION_INVALID_PARAM', '昵称需在 1-30 个字符之间', 400);
  }

  db.prepare('UPDATE users SET nickname = ? WHERE id = ?')
    .run(trimmed, ctx.user.id);

  return apiSuccess({ nickname: trimmed });
});
