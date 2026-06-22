import { NextRequest } from 'next/server';
import { getNotifications } from '@/lib/notification';
import { getUserIdFromRequest } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications?limit=50&offset=0
 * 获取当前用户的通知列表
 */
export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return apiError('unauthorized', '请先登录', 401);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const result = getNotifications(userId, limit, offset);
  return apiSuccess(result);
}
