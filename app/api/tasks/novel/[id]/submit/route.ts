import { NextRequest } from 'next/server';
import { addSubmission } from '@/lib/task-helper';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tasks/novel/[id]/submit
 * 提交任务交付物（多接单人版本，支持内容/文件/链接）
 * 任务状态为 open 时即可提交（无需 assigned）
 * body: { title?, content?, link_url?, file_path?, file_name?, file_size?, file_type? }
 */
export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const taskId = ctx.params!.id!;
  const { title, content, link_url, file_path, file_name, file_size, file_type } = ctx.body;

  // 至少需要内容或文件或链接
  if (!content && !file_path && !link_url) {
    return apiError('VALIDATION_REQUIRED', '请提供交付内容、上传文件或提交链接', 400);
  }

  const result = addSubmission(taskId, ctx.user.id, {
    title: title || '',
    content: content || undefined,
    link_url: link_url || undefined,
    file_path,
    file_name,
    file_size: file_size ? parseInt(file_size) : undefined,
    file_type,
  });

  if (!result.success) {
    return apiError('SUBMIT_FAILED', result.error || 'SUBMIT_FAILED', 400);
  }

  return apiSuccess({
    submissionId: result.submissionId,
    message: '提交成功，等待发布者审核',
  });
});
