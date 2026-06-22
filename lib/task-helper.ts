/**
 * 任务系统辅助函数（多接单人版本）
 * 支持最多9人同时接单并提交，发布者审核每个提交并决定支付
 */

import db from '@/lib/db';
import { getOrCreateWallet } from '@/lib/seed';
import { createNotification } from '@/lib/notification';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTaskInput {
  title: string;
  description: string;
  genre?: string;
  target_words?: number;
  budget: number;
  deadline: string; // ISO date string
  max_assignees?: number; // 最多接单人数，默认9
}

export interface TaskResponse {
  id: string;
  publisher_id: string;
  title: string;
  description: string;
  genre?: string;
  target_words?: number;
  budget: number;
  deadline: string;
  status: string;
  assignee_id?: string; // 保留兼容旧数据
  assigned_at?: string;
  completed_at?: string;
  delivery_url?: string;
  rating?: number;
  review?: string;
  created_at: string;
  updated_at: string;
  publisher_name?: string;
  assignee_name?: string; // 保留兼容旧数据
  // 新增字段
  max_assignees?: number;
  assignee_count?: number;
  remaining_budget?: number;
  is_assigned?: boolean;
  assignees?: { id: string; username: string; assigned_at: string }[];
}

/**
 * 验证任务输入数据
 */
export function validateTaskInput(input: CreateTaskInput): { valid: boolean; error?: string } {
  // 标题验证
  if (!input.title || input.title.trim().length < 5) {
    return { valid: false, error: '任务标题至少5个字符' };
  }
  if (input.title.length > 100) {
    return { valid: false, error: '任务标题不能超过100个字符' };
  }

  // 描述验证
  if (!input.description || input.description.trim().length < 20) {
    return { valid: false, error: '任务描述至少20个字符' };
  }
  if (input.description.length > 2000) {
    return { valid: false, error: '任务描述不能超过2000个字符' };
  }

  // 预算验证
  if (!input.budget || input.budget < 50) {
    return { valid: false, error: '任务预算至少50 SEED' };
  }
  if (input.budget > 50000) {
    return { valid: false, error: '任务预算不能超过50000 SEED' };
  }

  // 截止日期验证
  const deadline = new Date(input.deadline);
  const now = new Date();
  if (isNaN(deadline.getTime())) {
    return { valid: false, error: '无效的截止日期格式' };
  }
  if (deadline <= now) {
    return { valid: false, error: '截止日期必须在未来' };
  }
  const daysDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 90) {
    return { valid: false, error: '任务期限不能超过90天' };
  }

  // 目标字数验证（如果提供）
  if (input.target_words) {
    if (input.target_words < 1000) {
      return { valid: false, error: '目标字数至少1000字' };
    }
    if (input.target_words > 1000000) {
      return { valid: false, error: '目标字数不能超过100万字' };
    }
  }

  return { valid: true };
}

/**
 * 创建新任务
 */
export function createTask(publisherId: string, input: CreateTaskInput): { success: boolean; taskId?: string; error?: string } {
  try {
    // 验证输入
    const validation = validateTaskInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const maxAssignees = input.max_assignees || 9;

    // 检查用户余额（自动创建钱包）
    const wallet = getOrCreateWallet(publisherId);
    if (wallet.balance < input.budget) {
      return { success: false, error: `余额不足，当前余额: ${wallet.balance} SEED，需要: ${input.budget} SEED` };
    }

    // 使用事务执行所有操作
    const insertTask = db.transaction(() => {
      const taskId = uuidv4();

      // 1. 冻结预算（从用户钱包扣除）
      db.prepare(
        'UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      ).run(input.budget, publisherId);

      // 2. 记录交易
      db.prepare(
        'INSERT INTO transactions (id, user_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(
        uuidv4(),
        publisherId,
        'task_publish',
        -input.budget,
        wallet.balance - input.budget,
        `发布任务: ${input.title}`,
      );

      // 3. 创建任务记录（增加 max_assignees）
      db.prepare(`
        INSERT INTO novel_tasks (
          id, publisher_id, title, description, genre, target_words, 
          budget, deadline, max_assignees, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        taskId,
        publisherId,
        input.title,
        input.description,
        input.genre || null,
        input.target_words || null,
        input.budget,
        input.deadline,
        maxAssignees,
      );

      return taskId;
    });

    const taskId = insertTask();
    return { success: true, taskId };
  } catch (error) {
    console.error('创建任务失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 获取任务列表（多接单人版本）
 */
export function getTasks(filters: {
  status?: string;
  genre?: string;
  page?: number;
  limit?: number;
}): { tasks: TaskResponse[]; total: number; page: number; totalPages: number } {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.status) {
    if (filters.status === 'active') {
      // 'active' 表示进行中：显示 open + reviewing
      conditions.push("t.status IN ('open', 'reviewing')");
    } else {
      conditions.push('t.status = ?');
      params.push(filters.status);
    }
  } else {
    // 默认显示 open + reviewing
    conditions.push("t.status IN ('open', 'reviewing')");
  }

  if (filters.genre) {
    conditions.push('t.genre = ?');
    params.push(filters.genre);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 查询总数
  const countQuery = `SELECT COUNT(*) as total FROM novel_tasks t ${whereClause}`;
  const totalResult = db.prepare(countQuery).get(...params) as { total: number };
  const total = totalResult.total;

  // 查询任务列表（左连接统计接单人数）
  const query = `
    SELECT 
      t.*,
      u1.username as publisher_name,
      (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id) as assignee_count
    FROM novel_tasks t
    LEFT JOIN users u1 ON t.publisher_id = u1.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const tasks = db.prepare(query).all(...params, limit, offset) as TaskResponse[];

  return {
    tasks,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * 获取任务详情（多接单人版本）
 */
export function getTaskById(taskId: string, currentUserId?: string): TaskResponse | null {
  const task = db.prepare(`
    SELECT 
      t.*,
      u1.username as publisher_name,
      (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id) as assignee_count
    FROM novel_tasks t
    LEFT JOIN users u1 ON t.publisher_id = u1.id
    WHERE t.id = ?
  `).get(taskId) as any;

  if (!task) return null;

  // 获取接单人列表
  const assignees = db.prepare(`
    SELECT a.user_id as id, a.username, a.assigned_at
    FROM task_assignments a
    WHERE a.task_id = ?
    ORDER BY a.assigned_at ASC
  `).all(taskId) as { id: string; username: string; assigned_at: string }[];

  // 计算剩余预算（总预算 - 已批准的奖励）
  const approvedTotal = db.prepare(`
    SELECT COALESCE(SUM(reward_amount), 0) as total
    FROM task_submissions
    WHERE task_id = ? AND status = 'approved'
  `).get(taskId) as { total: number };

  task.assignees = assignees;
  task.assignee_count = assignees.length;
  task.max_assignees = task.max_assignees || 9;
  task.remaining_budget = task.budget - approvedTotal.total;

  // 当前用户是否已接单
  if (currentUserId) {
    const assignment = db.prepare(`
      SELECT id FROM task_assignments WHERE task_id = ? AND user_id = ?
    `).get(taskId, currentUserId);
    task.is_assigned = !!assignment;
  }

  return task as TaskResponse;
}

/**
 * 接单（多接单人版本）
 */
export function assignTask(taskId: string, assigneeId: string): { success: boolean; error?: string } {
  try {
    // 检查任务状态和接单上限
    const task = db.prepare('SELECT status, max_assignees FROM novel_tasks WHERE id = ?').get(taskId) as {
      status: string;
      max_assignees: number;
    } | undefined;

    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    if (task.status !== 'open') {
      return { success: false, error: '任务未在开放状态，无法接单' };
    }

    // 检查是否已满
    const count = db.prepare('SELECT COUNT(*) as cnt FROM task_assignments WHERE task_id = ?').get(taskId) as { cnt: number };
    if (count.cnt >= (task.max_assignees || 9)) {
      return { success: false, error: `接单人数已满（${task.max_assignees || 9}人）` };
    }

    // 检查是否已重复接单
    const existing = db.prepare('SELECT id FROM task_assignments WHERE task_id = ? AND user_id = ?').get(taskId, assigneeId);
    if (existing) {
      return { success: false, error: '您已接此单，请勿重复接单' };
    }

    // 查询用户名
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(assigneeId) as { username: string } | undefined;

    // 插入接单记录
    db.prepare(`
      INSERT INTO task_assignments (id, task_id, user_id, username, assigned_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(uuidv4(), taskId, assigneeId, user?.username || null);

    return { success: true };
  } catch (error) {
    console.error('接单失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 提交任务交付物（多接单人版本）
 */
export function addSubmission(
  taskId: string,
  submitterId: string,
  data: {
    title?: string;
    content?: string;
    link_url?: string;
    file_path?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
  }
): { success: boolean; submissionId?: string; error?: string } {
  try {
    // 检查任务状态
    const task = db.prepare('SELECT status, publisher_id, title FROM novel_tasks WHERE id = ?').get(taskId) as {
      status: string;
      publisher_id: string;
      title: string;
    } | undefined;

    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    if (task.status !== 'open') {
      return { success: false, error: '任务未在开放状态，无法提交' };
    }

    // 检查是否已接单
    const assignment = db.prepare('SELECT id FROM task_assignments WHERE task_id = ? AND user_id = ?').get(taskId, submitterId);
    if (!assignment) {
      return { success: false, error: '您未接此任务，无法提交' };
    }

    // 写入提交记录
    const submissionId = uuidv4();
    db.prepare(`
      INSERT INTO task_submissions (id, task_id, submitter_id, title, content, link_url, file_path, file_name, file_size, file_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      submissionId,
      taskId,
      submitterId,
      data.title || '',
      data.content || null,
      data.link_url || null,
      data.file_path || null,
      data.file_name || null,
      data.file_size || null,
      data.file_type || null
    );

    // 发送通知给发布者
    try {
      createNotification({
        userId: task.publisher_id,
        type: 'task',
        title: '任务提交通知',
        content: `您的任务「${task.title}」收到新的提交`,
        link: `/tasks/${taskId}`
      });
    } catch (e) {
      console.warn('[Task] 发送通知失败:', e);
    }

    return { success: true, submissionId };
  } catch (error) {
    console.error('提交任务失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 获取任务提交列表（多接单人版本）
 */
export function getSubmissions(
  taskId: string,
  userId: string,
  fetchAll = false
): { submissions: any[]; isPublisher: boolean; isSubmitter: boolean } {
  // 检查用户身份
  const task = db.prepare('SELECT publisher_id FROM novel_tasks WHERE id = ?').get(taskId) as {
    publisher_id: string;
  } | undefined;

  if (!task) {
    return { submissions: [], isPublisher: false, isSubmitter: false };
  }

  const isPublisher = task.publisher_id === userId;

  // 检查用户是否在 task_assignments 中
  const assignment = db.prepare('SELECT id FROM task_assignments WHERE task_id = ? AND user_id = ?').get(taskId, userId);
  const isSubmitter = !!assignment;

  let submissions: any[];
  if (isPublisher || isSubmitter || fetchAll) {
    // 发布者和提交者可以看到完整内容
    submissions = db.prepare(`
      SELECT s.*, u.username as submitter_name
      FROM task_submissions s
      LEFT JOIN users u ON s.submitter_id = u.id
      WHERE s.task_id = ?
      ORDER BY s.created_at DESC
    `).all(taskId) as any[];
  } else {
    // 其他人只能看到标题
    submissions = db.prepare(`
      SELECT s.id, s.title, s.status, s.created_at, u.username as submitter_name
      FROM task_submissions s
      LEFT JOIN users u ON s.submitter_id = u.id
      WHERE s.task_id = ?
      ORDER BY s.created_at DESC
    `).all(taskId) as any[];
  }

  return { submissions, isPublisher, isSubmitter };
}

/**
 * 批准单个提交并支付奖励（新增）
 */
export function approveSubmission(
  submissionId: string,
  publisherId: string,
  rewardAmount: number
): { success: boolean; error?: string } {
  try {
    const submission = db.prepare(`
      SELECT s.*, t.publisher_id, t.budget as task_budget, t.title as task_title
      FROM task_submissions s
      JOIN novel_tasks t ON s.task_id = t.id
      WHERE s.id = ?
    `).get(submissionId) as any;

    if (!submission) {
      return { success: false, error: '提交记录不存在' };
    }
    if (submission.publisher_id !== publisherId) {
      return { success: false, error: '无权操作此提交' };
    }
    if (submission.status !== 'submitted') {
      return { success: false, error: '该提交已被处理' };
    }

    // 检查剩余预算
    const approvedTotal = db.prepare(`
      SELECT COALESCE(SUM(reward_amount), 0) as total
      FROM task_submissions
      WHERE task_id = ? AND status = 'approved'
    `).get(submission.task_id) as { total: number };

    const remainingBudget = submission.task_budget - approvedTotal.total;
    if (rewardAmount > remainingBudget) {
      return { success: false, error: `奖励金额超出剩余预算。剩余预算：${remainingBudget} SEED` };
    }

    // 使用事务执行支付
    const approveTx = db.transaction(() => {
      // 1. 更新提交状态
      db.prepare(`
        UPDATE task_submissions SET status = 'approved', reward_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(rewardAmount, submissionId);

      // 2. 给提交者转账（90%，平台抽成10%）
      const submitterAmount = Math.floor(rewardAmount * 0.9);
      const platformCommission = rewardAmount - submitterAmount;

      // 提交者钱包
      const submitterWallet = getOrCreateWallet(submission.submitter_id);
      db.prepare(
        'UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      ).run(submitterAmount, submitterAmount, submission.submitter_id);

      db.prepare(
        'INSERT INTO transactions (id, user_id, type, ref_id, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(
        uuidv4(),
        submission.submitter_id,
        'task_reward',
        submission.task_id,
        submitterAmount,
        submitterWallet.balance + submitterAmount,
        '任务提交获得奖励',
      );

      // 平台钱包
      const platformWallet = getOrCreateWallet('platform');
      db.prepare(
        'UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      ).run(platformCommission, platformCommission, 'platform');

      db.prepare(
        'INSERT INTO transactions (id, user_id, type, ref_id, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(
        uuidv4(),
        'platform',
        'task_reward',
        submission.task_id,
        platformCommission,
        platformWallet.balance + platformCommission,
        '任务平台抽成 10%',
      );
    });

    approveTx();

    // 通知提交者
    try {
      const submitter = db.prepare('SELECT username FROM users WHERE id = ?').get(submission.submitter_id) as any;
      createNotification({
        userId: submission.submitter_id,
        type: 'task',
        title: '提交已通过',
        content: `您的提交已被发布者批准，获得 ${rewardAmount} SEED 奖励（实际到账 ${Math.floor(rewardAmount * 0.9)} SEED）`,
        link: `/tasks/${submission.task_id}`
      });
    } catch (e) {
      console.warn('[Task] 发送批准通知失败:', e);
    }

    return { success: true };
  } catch (error) {
    console.error('批准提交失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 驳回提交（不再退回 assigned）
 */
export function rejectSubmission(
  submissionId: string,
  publisherId: string,
  notes?: string
): { success: boolean; error?: string } {
  try {
    const submission = db.prepare(`
      SELECT s.*, t.publisher_id, t.title as task_title
      FROM task_submissions s
      JOIN novel_tasks t ON s.task_id = t.id
      WHERE s.id = ?
    `).get(submissionId) as any;

    if (!submission) {
      return { success: false, error: '提交记录不存在' };
    }
    if (submission.publisher_id !== publisherId) {
      return { success: false, error: '无权操作此提交' };
    }
    if (submission.status !== 'submitted') {
      return { success: false, error: '该提交已被处理' };
    }

    // 更新提交状态（不移回 assigned）
    db.prepare(`
      UPDATE task_submissions SET status = 'rejected', publisher_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(notes || null, submissionId);

    // 通知提交者
    try {
      createNotification({
        userId: submission.submitter_id,
        type: 'task',
        title: '提交被驳回',
        content: `您的提交「${submission.title || submission.task_title}」被发布者驳回${notes ? '：' + notes : ''}`,
        link: `/tasks/${submission.task_id}`
      });
    } catch (e) {
      console.warn('[Task] 发送驳回通知失败:', e);
    }

    return { success: true };
  } catch (error) {
    console.error('驳回提交失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 关闭接单（新增）
 */
export function closeTask(taskId: string, publisherId: string): { success: boolean; error?: string } {
  try {
    const task = db.prepare('SELECT status, publisher_id FROM novel_tasks WHERE id = ?').get(taskId) as {
      status: string;
      publisher_id: string;
    } | undefined;

    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    if (task.publisher_id !== publisherId) {
      return { success: false, error: '无权操作此任务' };
    }
    if (task.status !== 'open') {
      return { success: false, error: '任务未在开放状态' };
    }

    db.prepare(`
      UPDATE novel_tasks SET status = 'reviewing', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(taskId);

    return { success: true };
  } catch (error) {
    console.error('关闭接单失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 完成审核（发布者完成审核，退回剩余预算）
 */
export function completeTask(taskId: string, publisherId: string): { success: boolean; error?: string } {
  try {
    const task = db.prepare('SELECT status, publisher_id, budget FROM novel_tasks WHERE id = ?').get(taskId) as {
      status: string;
      publisher_id: string;
      budget: number;
    } | undefined;

    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    if (task.publisher_id !== publisherId) {
      return { success: false, error: '无权操作此任务' };
    }
    if (task.status !== 'reviewing') {
      return { success: false, error: '任务未在审核中状态' };
    }

    // 计算剩余预算（总预算 - 已批准的奖励）
    const approvedTotal = db.prepare(`
      SELECT COALESCE(SUM(reward_amount), 0) as total
      FROM task_submissions
      WHERE task_id = ? AND status = 'approved'
    `).get(taskId) as { total: number };

    const refundAmount = task.budget - approvedTotal.total;

    // 使用事务
    const completeTx = db.transaction(() => {
      // 1. 退回剩余预算给发布者
      if (refundAmount > 0) {
        const publisherWallet = getOrCreateWallet(publisherId);
        db.prepare(
          'UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
        ).run(refundAmount, publisherId);

        db.prepare(
          'INSERT INTO transactions (id, user_id, type, ref_id, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
        ).run(
          uuidv4(),
          publisherId,
          'compensate',
          taskId,
          refundAmount,
          publisherWallet.balance + refundAmount,
          '任务审核完成，剩余预算退回',
        );
      }

      // 2. 更新任务状态
      db.prepare(`
        UPDATE novel_tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(taskId);
    });

    completeTx();

    // 通知所有已接单但未被批准的用户
    try {
      const unapprovedAssignees = db.prepare(`
        SELECT DISTINCT a.user_id
        FROM task_assignments a
        WHERE a.task_id = ? AND a.user_id NOT IN (
          SELECT submitter_id FROM task_submissions WHERE task_id = ? AND status = 'approved'
        )
      `).all(taskId, taskId) as { user_id: string }[];

      for (const u of unapprovedAssignees) {
        createNotification({
          userId: u.user_id,
          type: 'task',
          title: '任务已完成',
          content: `任务已由发布者完成审核，感谢您的参与`,
          link: `/tasks/${taskId}`
        });
      }
    } catch (e) {
      console.warn('[Task] 发送完成通知失败:', e);
    }

    return { success: true };
  } catch (error) {
    console.error('完成审核失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 取消任务（退款）
 */
export function cancelTask(taskId: string, userId: string): { success: boolean; refundAmount?: number; error?: string } {
  try {
    const task = db.prepare('SELECT status, publisher_id, budget FROM novel_tasks WHERE id = ?').get(taskId) as {
      status: string;
      publisher_id: string;
      budget: number;
    } | undefined;

    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    if (task.publisher_id !== userId) {
      return { success: false, error: '无权操作此任务' };
    }
    if (task.status === 'completed') {
      return { success: false, error: '已完成的任务不能取消' };
    }

    // 计算剩余预算
    const approvedTotal = db.prepare(`
      SELECT COALESCE(SUM(reward_amount), 0) as total
      FROM task_submissions
      WHERE task_id = ? AND status = 'approved'
    `).get(taskId) as { total: number };

    const refundAmount = task.budget - approvedTotal.total;

    // 使用事务
    const cancelTransaction = db.transaction(() => {
      // 1. 退还剩余SEED
      if (refundAmount > 0) {
        const userWalletBefore = getOrCreateWallet(userId);
        db.prepare(
          'UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
        ).run(refundAmount, userId);

        db.prepare(
          'INSERT INTO transactions (id, user_id, type, ref_id, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
        ).run(
          uuidv4(),
          userId,
          'compensate',
          taskId,
          refundAmount,
          userWalletBefore.balance + refundAmount,
          '任务取消退款',
        );
      }

      // 2. 更新任务状态
      db.prepare(`
        UPDATE novel_tasks SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(taskId);
    });

    cancelTransaction();
    return { success: true, refundAmount };
  } catch (error) {
    console.error('取消任务失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}
