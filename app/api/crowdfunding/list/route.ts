import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createCrowdfunding, getCrowdfundingProjects } from '@/lib/crowdfunding-helper';
import { safeParseJSON } from '@/lib/request-parser';

/**
 * 众筹系统API
 * GET /api/crowdfunding/list - 获取众筹列表
 * POST /api/crowdfunding/create - 发起众筹
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 获取查询参数
    const status = searchParams.get('status') || undefined;
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 验证分页参数
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: '无效的分页参数' },
        { status: 400 }
      );
    }

    // 获取众筹列表
    const result = getCrowdfundingProjects({ status, sort, page, limit });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('获取众筹列表失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 解析请求体
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const { title, description, target_amount, deadline, rewards } = body;

    // 验证必填字段
    if (!title || !description || !target_amount || !deadline) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 创建众筹项目
    const result = createCrowdfunding(user.userId, {
      title,
      description,
      target_amount: parseInt(target_amount),
      deadline,
      rewards
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      projectId: result.projectId,
      message: '众筹项目创建成功'
    }, { status: 201 });
  } catch (error) {
    console.error('创建众筹项目失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
