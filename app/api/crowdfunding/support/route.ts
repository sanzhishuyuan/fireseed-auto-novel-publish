import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const body = await request.json();
    const { projectId, amount } = body;

    if (!projectId || !amount || amount < 10) {
      return NextResponse.json({ error: '最少支持10 SEED' }, { status: 400 });
    }

    // 检查项目是否存在且活跃
    const project = db.prepare(`
      SELECT id, author_id, target_amount, current_amount, deadline, status
      FROM crowdfunding_projects
      WHERE id = ?
    `).get(projectId) as {
      id: string;
      author_id: string;
      target_amount: number;
      current_amount: number;
      deadline: string;
      status: string;
    } | undefined;

    if (!project) {
      return NextResponse.json({ error: '众筹项目不存在' }, { status: 404 });
    }

    if (project.status !== 'active') {
      return NextResponse.json({ error: '该项目已结束' }, { status: 400 });
    }

    if (new Date(project.deadline) < new Date()) {
      return NextResponse.json({ error: '众筹已截止' }, { status: 400 });
    }

    if (project.author_id === user.userId) {
      return NextResponse.json({ error: '不能支持自己的项目' }, { status: 400 });
    }

    // 检查 SEED 余额
    const balance = db.prepare(`
      SELECT COALESCE(SUM(
        CASE WHEN type = 'credit' THEN amount
             WHEN type = 'debit' THEN -amount
             ELSE 0 END
      ), 0) as balance
      FROM tokens WHERE user_id = ?
    `).get(user.userId) as { balance: number };

    if (!balance || balance.balance < amount) {
      return NextResponse.json({ error: 'SEED余额不足' }, { status: 400 });
    }

    // 事务：扣SEED + 更新项目 + 记录支持
    const txn = db.transaction(() => {
      // 1. 扣除支持者 SEED
      db.prepare(`
        INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
        VALUES (?, ?, 'debit', ?, ?, CURRENT_TIMESTAMP)
      `).run(uuidv4(), user.userId, amount, `支持众筹: ${projectId}`);

      // 2. 转入作者 SEED（平台抽成10%）
      const platformFee = Math.floor(amount * 0.1);
      const authorAmount = amount - platformFee;

      db.prepare(`
        INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
        VALUES (?, ?, 'credit', ?, ?, CURRENT_TIMESTAMP)
      `).run(uuidv4(), project.author_id, authorAmount, `众筹收入: ${projectId}`);

      // 平台收入
      if (platformFee > 0) {
        db.prepare(`
          INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
          VALUES (?, ?, 'credit', ?, ?, CURRENT_TIMESTAMP)
        `).run(uuidv4(), 'platform', platformFee, `众筹平台费: ${projectId}`);
      }

      // 3. 更新项目金额
      const newAmount = project.current_amount + amount;
      db.prepare(`
        UPDATE crowdfunding_projects
        SET current_amount = ?, supporter_count = supporter_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newAmount, projectId);

      // 4. 记录支持
      db.prepare(`
        INSERT INTO crowdfunding_supporters (id, project_id, user_id, amount)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), projectId, user.userId, amount);
    });

    txn();

    const newProgress = Math.min(Math.round(((project.current_amount + amount) / project.target_amount) * 100), 100);
    const isFunded = (project.current_amount + amount) >= project.target_amount;

    return NextResponse.json({
      success: true,
      data: {
        amount,
        newCurrentAmount: project.current_amount + amount,
        progress: newProgress,
        isFunded
      }
    });

  } catch (error) {
    console.error('Crowdfunding support error:', error);
    return NextResponse.json({ error: '支持众筹失败' }, { status: 500 });
  }
}
