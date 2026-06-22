import { NextRequest } from 'next/server';
import { getSubmissions } from '@/lib/task-helper';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/novel/[id]/submissions
 * 获取任务的提交列表（多接单人版本）
 * 发布者：看到所有提交的完整内容
 * 提交者（task_assignments中）：看到自己的提交的完整内容
 * 其他人：仅看到标题
 */
export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  const taskId = ctx.params!.id!;

  const { submissions, isPublisher, isSubmitter } = getSubmissions(taskId, ctx.user.id);

  return apiSuccess({
    submissions,
    isPublisher,
    isSubmitter,
    total: submissions.length,
  });
});
