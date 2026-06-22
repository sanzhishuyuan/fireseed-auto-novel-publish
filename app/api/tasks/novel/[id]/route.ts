import { NextRequest } from 'next/server';
import { getTaskById, assignTask, closeTask, completeTask, cancelTask, rejectSubmission, approveSubmission } from '@/lib/task-helper';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

/**
 * 任务详情API（多接单人版本）
 * GET /api/tasks/novel/[id] - 获取任务详情
 * POST /api/tasks/novel/[id]/assign - 接单
 * POST /api/tasks/novel/[id]/close - 关闭接单
 * POST /api/tasks/novel/[id]/reject - 驳回提交
 * POST /api/tasks/novel/[id]/approve - 批准提交并支付
 * POST /api/tasks/novel/[id]/complete - 完成审核
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

    case 'close': {
      // 关闭接单（发布者操作）
      const closeResult = closeTask(taskId, ctx.user.id);
      if (!closeResult.success) {
        return apiError('CLOSE_FAILED', closeResult.error || 'CLOSE_FAILED', 400);
      }
      return apiSuccess({ message: '已关闭接单，开始审核' });
    }

    case 'reject': {
      // 驳回提交
      if (!ctx.body.submission_id) {
        return apiError('VALIDATION_REQUIRED', '请提供提交ID', 400);
      }
      const rejectResult = rejectSubmission(
        ctx.body.submission_id,
        ctx.user.id,
        ctx.body.notes
      );
      if (!rejectResult.success) {
        return apiError('REJECT_FAILED', rejectResult.error || 'REJECT_FAILED', 400);
      }
      return apiSuccess({ message: '已驳回提交' });
    }

    case 'approve': {
      // 批准提交并支付
      if (!ctx.body.submission_id || !ctx.body.reward_amount) {
        return apiError('VALIDATION_REQUIRED', '请提供提交ID和奖励金额', 400);
      }
      const approveResult = approveSubmission(
        ctx.body.submission_id,
        ctx.user.id,
        parseInt(ctx.body.reward_amount)
      );
      if (!approveResult.success) {
        return apiError('APPROVE_FAILED', approveResult.error || 'APPROVE_FAILED', 400);
      }
      return apiSuccess({ message: '已批准提交，SEED已支付' });
    }

    case 'complete': {
      // 完成审核（发布者完成，退回剩余预算）
      const completeResult = completeTask(taskId, ctx.user.id);
      if (!completeResult.success) {
        return apiError('COMPLETE_FAILED', completeResult.error || 'COMPLETE_FAILED', 400);
      }
      return apiSuccess({ message: '审核已完成，剩余SEED已退回' });
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
