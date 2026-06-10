import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCrowdfundingById, supportCrowdfunding, postCrowdfundingUpdate } from '@/lib/crowdfunding-helper';
import { safeParseJSON } from '@/lib/request-parser';

/**
 * 众筹详情和支持API
 * GET /api/crowdfunding/[id] - 获取众筹详情
 * POST /api/crowdfunding/[id]/support - 支持众筹
 * POST /api/crowdfunding/[id]/update - 发布更新（仅作者）
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { project, rewards } = getCrowdfundingById(projectId);

    if (!project) {
      return NextResponse.json(
        { success: false, error: '众筹项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project,
      rewards
    });
  } catch (error) {
    console.error('获取众筹详情失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户登录
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const projectId = params.id;
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const action = body.action;

    switch (action) {
      case 'support':
        // 支持众筹
        const { amount, reward_tier } = body;

        if (!amount || amount < 10) {
          return NextResponse.json(
            { success: false, error: '支持金额至少10 SEED' },
            { status: 400 }
          );
        }

        const supportResult = supportCrowdfunding(projectId, user.userId, parseInt(amount), reward_tier);
        
        if (!supportResult.success) {
          return NextResponse.json(
            { success: false, error: supportResult.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: '支持成功！感谢您的支持'
        });

      case 'update':
        // 发布更新（仅作者）
        const { title, content } = body;

        if (!title || !content) {
          return NextResponse.json(
            { success: false, error: '标题和内容不能为空' },
            { status: 400 }
          );
        }

        const updateResult = postCrowdfundingUpdate(projectId, user.userId, title, content);

        if (!updateResult.success) {
          return NextResponse.json(
            { success: false, error: updateResult.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: '更新发布成功'
        });

      default:
        return NextResponse.json(
          { success: false, error: '无效的操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('众筹操作失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
