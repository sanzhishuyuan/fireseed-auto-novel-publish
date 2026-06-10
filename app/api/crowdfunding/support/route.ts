import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { projectId, amount } = ctx.body;

  if (!projectId || !amount || amount < 10) {
    return apiError('VALIDATION_REQUIRED', '最少支持10 SEED', 400);
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
    return apiError('NOT_FOUND', '众筹项目不存在', 404);
  }

  if (project.status !== 'active') {
    return apiError('PROJECT_ENDED', '该项目已结束', 400);
  }

  if (new Date(project.deadline) < new Date()) {
    return apiError('PROJECT_EXPIRED', '众筹已截止', 400);
  }

  if (project.author_id === ctx.user.id) {
    return apiError('VALIDATION_SELF_SUPPORT', '不能支持自己的项目', 400);
  }

  // 检查 SEED 余额
  const balance = db.prepare(`
    SELECT COALESCE(SUM(
      CASE WHEN type = 'credit' THEN amount
           WHEN type = 'debit' THEN -amount
           ELSE 0 END
    ), 0) as balance
    FROM tokens WHERE user_id = ?
  `).get(ctx.user.id) as { balance: number };

  if (!balance || balance.balance < amount) {
    return apiError('SEED_INSUFFICIENT', 'SEED余额不足', 400);
  }

  // 事务：扣SEED + 更新项目 + 记录支持
  const txn = db.transaction(() => {
    // 1. 扣除支持者 SEED
    db.prepare(`
      INSERT INTO tokens (id, user_id, type, amount, reason, created_at)
      VALUES (?, ?, 'debit', ?, ?, CURRENT_TIMESTAMP)
    `).run(uuidv4(), ctx.user.id, amount, `支持众筹: ${projectId}`);

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
    `).run(uuidv4(), projectId, ctx.user.id, amount);
  });

  txn();

  const newProgress = Math.min(Math.round(((project.current_amount + amount) / project.target_amount) * 100), 100);
  const isFunded = (project.current_amount + amount) >= project.target_amount;

  return apiSuccess({
    amount,
    newCurrentAmount: project.current_amount + amount,
    progress: newProgress,
    isFunded
  });
});
