import { NextRequest } from 'next/server';
import { getCrowdfundingById, supportCrowdfunding, postCrowdfundingUpdate } from '@/lib/crowdfunding-helper';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

/**
 * 众筹详情和支持API
 * GET /api/crowdfunding/[id] - 获取众筹详情
 * POST /api/crowdfunding/[id]/support - 支持众筹
 * POST /api/crowdfunding/[id]/update - 发布更新（仅作者）
 */

export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  const projectId = ctx.params!.id!;
  const { project, rewards } = getCrowdfundingById(projectId);

  if (!project) {
    return apiError('NOT_FOUND', '众筹项目不存在', 404);
  }

  return apiSuccess({ project, rewards });
});

export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const projectId = ctx.params!.id!;
  const action = ctx.body.action;

  switch (action) {
    case 'support': {
      // 支持众筹
      const { amount, reward_tier } = ctx.body;

      if (!amount || amount < 10) {
        return apiError('VALIDATION_REQUIRED', '支持金额至少10 SEED', 400);
      }

      const supportResult = supportCrowdfunding(projectId, ctx.user.id, parseInt(amount), reward_tier);
      
      if (!supportResult.success) {
        return apiError('SUPPORT_FAILED', supportResult.error || 'SUPPORT_FAILED', 400);
      }

      return apiSuccess({ message: '支持成功！感谢您的支持' });
    }

    case 'update': {
      // 发布更新（仅作者）
      const { title, content } = ctx.body;

      if (!title || !content) {
        return apiError('VALIDATION_REQUIRED', '标题和内容不能为空', 400);
      }

      const updateResult = postCrowdfundingUpdate(projectId, ctx.user.id, title, content);

      if (!updateResult.success) {
        return apiError('UPDATE_FAILED', updateResult.error || 'UPDATE_FAILED', 400);
      }

      return apiSuccess({ message: '更新发布成功' });
    }

    default:
      return apiError('VALIDATION_INVALID_PARAM', '无效的操作', 400);
  }
});
