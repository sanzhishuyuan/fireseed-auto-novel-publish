import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, assignTask, completeTask, confirmTask, cancelTask } from '@/lib/task-helper';
import { getCurrentUser } from '@/lib/auth';

/**
 * 任务详情API
 * GET /api/tasks/novel/[id] - 获取任务详情
 * POST /api/tasks/novel/[id]/assign - 接单
 * POST /api/tasks/novel/[id]/complete - 提交完成
 * POST /api/tasks/novel/[id]/confirm - 确认完成
 * POST /api/tasks/novel/[id]/cancel - 取消任务
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const task = getTaskById(taskId);

    if (!task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('获取任务详情失败:', error);
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

    const taskId = params.id;
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'assign':
        // 接单
        const assignResult = assignTask(taskId, user.userId);
        if (!assignResult.success) {
          return NextResponse.json(
            { success: false, error: assignResult.error },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          message: '接单成功'
        });

      case 'complete':
        // 提交完成
        if (!body.delivery_url) {
          return NextResponse.json(
            { success: false, error: '请提供交付链接' },
            { status: 400 }
          );
        }
        const completeResult = completeTask(taskId, user.userId, body.delivery_url);
        if (!completeResult.success) {
          return NextResponse.json(
            { success: false, error: completeResult.error },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          message: '已提交完成，等待发布者确认'
        });

      case 'confirm':
        // 确认完成
        const confirmResult = confirmTask(
          taskId,
          user.userId,
          body.rating,
          body.review
        );
        if (!confirmResult.success) {
          return NextResponse.json(
            { success: false, error: confirmResult.error },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          message: '任务已完成，SEED已支付给作者'
        });

      case 'cancel':
        // 取消任务
        const cancelResult = cancelTask(taskId, user.userId);
        if (!cancelResult.success) {
          return NextResponse.json(
            { success: false, error: cancelResult.error },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          refundAmount: cancelResult.refundAmount,
          message: '任务已取消，SEED已退还'
        });

      default:
        return NextResponse.json(
          { success: false, error: '无效的操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('任务操作失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
