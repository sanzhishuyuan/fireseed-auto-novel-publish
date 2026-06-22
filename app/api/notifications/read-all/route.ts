import { NextRequest } from 'next/server';
import { markAllAsRead } from '@/lib/notification';
import { getUserIdFromRequest } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/read-all
 * 标记所有通知为已读
 */
export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return apiError('unauthorized', '请先登录', 401);

  const count = markAllAsRead(userId);
  return apiSuccess({ marked: count });
}
