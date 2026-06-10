import { NextRequest } from 'next/server';
import { getTaskById, assignTask, completeTask, confirmTask, cancelTask } from '@/lib/task-helper';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

/**
 * 任务详情API
 * GET /api/tasks/novel/[id] - 获取任务详情
 * POST /api/tasks/novel/[id]/assign - 接单
 * POST /api/tasks/novel/[id]/complete - 提交完成
 * POST /api/tasks/novel/[id]/confirm - 确认完成
 * POST /api/tasks/novel/[id]/cancel - 取消任务
 */

export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  const taskId = ctx.params!.id!;
  const task = getTaskById(taskId);

  if (!task) {
    return apiError('NOT_FOUND', '任务不存在', 404);
  }

  return apiSuccess({ task });
});

export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const taskId = ctx.params!.id!;
  const action = ctx.body.action;

  switch (action) {
    case 'assign': {
      // 接单
      const assignResult = assignTask(taskId, ctx.user.id);
      if (!assignResult.success) {
        return apiError('ASSIGN_FAILED', assignResult.error || 'ASSIGN_FAILED', 400);
      }
      return apiSuccess({ message: '接单成功' });
    }

    case 'complete': {
      // 提交完成
      if (!ctx.body.delivery_url) {
        return apiError('VALIDATION_REQUIRED', '请提供交付链接', 400);
      }
      const completeResult = completeTask(taskId, ctx.user.id, ctx.body.delivery_url);
      if (!completeResult.success) {
        return apiError('COMPLETE_FAILED', completeResult.error || 'COMPLETE_FAILED', 400);
      }
      return apiSuccess({ message: '已提交完成，等待发布者确认' });
    }

    case 'confirm': {
      // 确认完成
      const confirmResult = confirmTask(
        taskId,
        ctx.user.id,
        ctx.body.rating,
        ctx.body.review
      );
      if (!confirmResult.success) {
        return apiError('CONFIRM_FAILED', confirmResult.error || 'CONFIRM_FAILED', 400);
      }
      return apiSuccess({ message: '任务已完成，SEED已支付给作者' });
    }

    case 'cancel': {
      // 取消任务
      const cancelResult = cancelTask(taskId, ctx.user.id);
      if (!cancelResult.success) {
        return apiError('CANCEL_FAILED', cancelResult.error || 'CANCEL_FAILED', 400);
      }
      return apiSuccess({
        refundAmount: cancelResult.refundAmount,
        message: '任务已取消，SEED已退还'
      });
    }

    default:
      return apiError('VALIDATION_INVALID_PARAM', '无效的操作', 400);
  }
});
