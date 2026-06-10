import { NextRequest } from 'next/server';
import { createCrowdfunding, getCrowdfundingProjects } from '@/lib/crowdfunding-helper';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

/**
 * 众筹系统API
 * GET /api/crowdfunding/list - 获取众筹列表
 * POST /api/crowdfunding/create - 发起众筹
 */

export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  const { searchParams } = new URL(request.url);
  
  // 获取查询参数
  const status = searchParams.get('status') || undefined;
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // 验证分页参数
  if (page < 1 || limit < 1 || limit > 100) {
    return apiError('VALIDATION_INVALID_PARAM', '无效的分页参数', 400);
  }

  // 获取众筹列表
  const result = getCrowdfundingProjects({ status, sort, page, limit });

  return apiSuccess(result);
});

export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { title, description, target_amount, deadline, rewards } = ctx.body;

  // 验证必填字段
  if (!title || !description || !target_amount || !deadline) {
    return apiError('VALIDATION_REQUIRED', '缺少必填字段', 400);
  }

  // 创建众筹项目
  const result = createCrowdfunding(ctx.user.id, {
    title,
    description,
    target_amount: parseInt(target_amount),
    deadline,
    rewards
  });

  if (!result.success) {
    return apiError('CREATE_FAILED', result.error || 'CREATE_FAILED', 400);
  }

  return apiSuccess({ projectId: result.projectId });
});
