import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, targetAmount, deadline, novelId, rewards = {} } = body;

    // 验证
    if (!title || !description || !targetAmount || !deadline) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    if (targetAmount < 100) {
      return NextResponse.json({ error: '众筹目标最少100 SEED' }, { status: 400 });
    }

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const minDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 至少3天后
    const maxDeadline = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 最多90天后

    if (deadlineDate < minDeadline) {
      return NextResponse.json({ error: '众筹截止日期至少3天后' }, { status: 400 });
    }
    if (deadlineDate > maxDeadline) {
      return NextResponse.json({ error: '众筹截止日期最多90天后' }, { status: 400 });
    }

    const projectId = uuidv4();
    db.prepare(`
      INSERT INTO crowdfunding_projects (
        id, author_id, novel_id, title, description,
        target_amount, deadline, status, rewards, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(projectId, user.userId, novelId || null, title, description, targetAmount, deadline, JSON.stringify(rewards));

    return NextResponse.json({
      success: true,
      data: { projectId }
    });

  } catch (error) {
    console.error('Crowdfunding create error:', error);
    return NextResponse.json({ error: '创建众筹失败' }, { status: 500 });
  }
}
