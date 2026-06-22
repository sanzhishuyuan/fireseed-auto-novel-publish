import { NextRequest } from 'next/server';
import { getUnreadCount } from '@/lib/notification';
import { getUserIdFromRequest } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/unread-count
 * 获取当前用户未读通知数
 */
export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return apiError('unauthorized', '请先登录', 401);

  const count = getUnreadCount(userId);
  return apiSuccess({ count });
}
