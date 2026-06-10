import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createTask, getTasks, getTaskById } from '@/lib/task-helper';
import { safeParseJSON } from '@/lib/request-parser';

/**
 * 任务系统API
 * GET /api/tasks/novel - 获取任务列表
 * POST /api/tasks/novel - 发布新任务
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 获取查询参数
    const status = searchParams.get('status') || undefined;
    const genre = searchParams.get('genre') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 验证分页参数
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: '无效的分页参数' },
        { status: 400 }
      );
    }

    // 获取任务列表
    const result = getTasks({ status, genre, page, limit });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
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
    const { title, description, genre, target_words, budget, deadline } = body;

    // 验证必填字段
    if (!title || !description || !budget || !deadline) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 创建任务
    const result = createTask(user.userId, {
      title,
      description,
      genre,
      target_words,
      budget: parseInt(budget),
      deadline
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      taskId: result.taskId,
      message: '任务发布成功'
    }, { status: 201 });
  } catch (error) {
    console.error('发布任务失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
