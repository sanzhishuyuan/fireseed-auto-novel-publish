import { NextRequest } from 'next/server';
import { markAsRead } from '@/lib/notification';
import { getUserIdFromRequest } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/[id]/read
 * 标记单条通知为已读
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return apiError('unauthorized', '请先登录', 401);

  const ok = markAsRead(params.id, userId);
  if (!ok) return apiError('not_found', '通知不存在', 404);

  return apiSuccess({ success: true });
}
