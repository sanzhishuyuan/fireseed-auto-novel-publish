import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ADMIN_ROLES, type Role } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/crowdfunding/create
 * 创建众筹项目 — 仅管理员和有效VIP用户可发起
 */
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

    // ─── 权限校验：管理员 OR 有效VIP ───
    const isAdmin = ADMIN_ROLES.includes(user.role as Role);

    let isVipActive = false;
    let vipType = 'free';
    try {
      const userData = db.prepare(
        'SELECT vip_type, vip_expires_at FROM users WHERE id = ?'
      ).get(user.userId) as { vip_type: string; vip_expires_at: string | null } | undefined;

      if (userData && userData.vip_type !== 'free' && userData.vip_expires_at) {
        const expiresAt = new Date(userData.vip_expires_at);
        if (expiresAt > new Date()) {
          isVipActive = true;
          vipType = userData.vip_type;
        }
      }
    } catch { /* ignore */ }

    if (!isAdmin && !isVipActive) {
      return NextResponse.json({
        error: '发起众筹需要 VIP 会员权限',
        code: 'VIP_REQUIRED',
        vipRequired: true,
      }, { status: 403 });
    }

    // ─── 参数校验 ───
    const body = await request.json();
    const { title, description, targetAmount, deadline, novelId, rewards = [] } = body;

    if (!title || title.trim().length < 5) {
      return NextResponse.json({ error: '项目标题至少5个字符' }, { status: 400 });
    }
    if (title.length > 100) {
      return NextResponse.json({ error: '项目标题不能超过100个字符' }, { status: 400 });
    }
    if (!description || description.trim().length < 20) {
      return NextResponse.json({ error: '项目描述至少20个字符' }, { status: 400 });
    }
    if (description.length > 5000) {
      return NextResponse.json({ error: '项目描述不能超过5000个字符' }, { status: 400 });
    }

    const amount = parseInt(targetAmount);
    if (!amount || amount < 100) {
      return NextResponse.json({ error: '众筹目标最少100 SEED' }, { status: 400 });
    }
    if (amount > 100000) {
      return NextResponse.json({ error: '众筹目标不能超过100000 SEED' }, { status: 400 });
    }

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const minDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const maxDeadline = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    if (deadlineDate < minDeadline) {
      return NextResponse.json({ error: '众筹期限至少7天' }, { status: 400 });
    }
    if (deadlineDate > maxDeadline) {
      return NextResponse.json({ error: '众筹期限不能超过90天' }, { status: 400 });
    }

    // ─── 每人同时最多 3 个活跃项目 ───
    const activeCount = (db.prepare(
      "SELECT COUNT(*) as count FROM crowdfunding_projects WHERE author_id = ? AND status = 'active'"
    ).get(user.userId) as { count: number }).count;

    if (activeCount >= 3) {
      return NextResponse.json({ error: '最多同时发起3个活跃众筹项目' }, { status: 400 });
    }

    // ─── 创建项目 ───
    const projectId = uuidv4();
    const rewardsJson = Array.isArray(rewards) && rewards.length > 0
      ? JSON.stringify(rewards)
      : '[]';

    db.prepare(`
      INSERT INTO crowdfunding_projects (
        id, author_id, novel_id, title, description,
        target_amount, current_amount, supporter_count,
        deadline, status, rewards, min_support_amount,
        stretch_goals, updates_count, success_stories,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 'active', ?, 10, '[]', 0, '',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      projectId, user.userId, novelId || null,
      title, description, amount, deadline, rewardsJson
    );

    return NextResponse.json({
      success: true,
      data: { projectId },
      message: '众筹项目创建成功！'
    });

  } catch (error) {
    console.error('Crowdfunding create error:', error);
    return NextResponse.json({ error: '创建众筹失败，请稍后重试' }, { status: 500 });
  }
}
