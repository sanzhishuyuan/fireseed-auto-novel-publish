import { NextRequest } from 'next/server';
import { createTask, getTasks, getTaskById } from '@/lib/task-helper';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

/**
 * 任务系统API
 * GET /api/tasks/novel - 获取任务列表
 * POST /api/tasks/novel - 发布新任务
 */

export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  const { searchParams } = new URL(request.url);
  
  // 获取查询参数
  const status = searchParams.get('status') || undefined;
  const genre = searchParams.get('genre') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // 验证分页参数
  if (page < 1 || limit < 1 || limit > 100) {
    return apiError('VALIDATION_INVALID_PARAM', '无效的分页参数', 400);
  }

  // 获取任务列表
  const result = getTasks({ status, genre, page, limit });

  return apiSuccess(result);
});

export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { title, description, genre, target_words, budget, deadline } = ctx.body;

  // 验证必填字段
  if (!title || !description || !budget || !deadline) {
    return apiError('VALIDATION_REQUIRED', '缺少必填字段', 400);
  }

  // 创建任务
  const result = createTask(ctx.user.id, {
    title,
    description,
    genre,
    target_words,
    budget: parseInt(budget),
    deadline
  });

  if (!result.success) {
    return apiError('CREATE_FAILED', result.error || 'CREATE_FAILED', 400);
  }

  return apiSuccess({ taskId: result.taskId });
});
