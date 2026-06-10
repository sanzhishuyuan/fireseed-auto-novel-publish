import { NextRequest } from 'next/server';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';

export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  // 获取用户信息
  const userData = db.prepare(`
    SELECT id, username, nickname, email, role, vip_type, vip_expires_at, created_at
    FROM users
    WHERE id = ?
  `).get(ctx.user.id) as {
    id: string;
    username: string;
    nickname: string | null;
    email: string | null;
    role: string;
    vip_type: string;
    vip_expires_at: string | null;
    created_at: string;
  } | undefined;

  if (!userData) {
    return apiError('NOT_FOUND', '用户不存在', 404);
  }

  // 检查 VIP 是否过期
  let isVipActive = false;
  if (userData.vip_type !== 'free' && userData.vip_expires_at) {
    const expiresAt = new Date(userData.vip_expires_at);
    const now = new Date();
    isVipActive = expiresAt > now;
  }

  return apiSuccess({
    id: userData.id,
    username: userData.username,
    nickname: userData.nickname,
    email: userData.email,
    role: userData.role,
    vipType: isVipActive ? userData.vip_type : 'free',
    vipExpiresAt: isVipActive ? userData.vip_expires_at : null,
    createdAt: userData.created_at
  });
});
