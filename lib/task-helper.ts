/**
 * 任务系统辅助函数
 */

import db from './db';
import { getOrCreateWallet } from './seed';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTaskInput {
  title: string;
  description: string;
  genre?: string;
  target_words?: number;
  budget: number;
  deadline: string; // ISO date string
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
  assignee_id?: string;
  assigned_at?: string;
  completed_at?: string;
  delivery_url?: string;
  rating?: number;
  review?: string;
  created_at: string;
  updated_at: string;
  publisher_name?: string;
  assignee_name?: string;
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

      // 3. 创建任务记录
      db.prepare(`
        INSERT INTO novel_tasks (
          id, publisher_id, title, description, genre, target_words, 
          budget, deadline, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        taskId,
        publisherId,
        input.title,
        input.description,
        input.genre || null,
        input.target_words || null,
        input.budget,
        input.deadline
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
 * 获取任务列表
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
    conditions.push('t.status = ?');
    params.push(filters.status);
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

  // 查询任务列表
  const query = `
    SELECT 
      t.*,
      u1.username as publisher_name,
      u2.username as assignee_name
    FROM novel_tasks t
    LEFT JOIN users u1 ON t.publisher_id = u1.id
    LEFT JOIN users u2 ON t.assignee_id = u2.id
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
 * 获取任务详情
 */
export function getTaskById(taskId: string): TaskResponse | null {
  const task = db.prepare(`
    SELECT 
      t.*,
      u1.username as publisher_name,
      u2.username as assignee_name
    FROM novel_tasks t
    LEFT JOIN users u1 ON t.publisher_id = u1.id
    LEFT JOIN users u2 ON t.assignee_id = u2.id
    WHERE t.id = ?
  `).get(taskId) as TaskResponse | undefined;

  return task || null;
}

/**
 * 接单
 */
export function assignTask(taskId: string, assigneeId: string): { success: boolean; error?: string } {
  try {
    // 检查任务状态
    const task = db.prepare('SELECT status, budget FROM novel_tasks WHERE id = ?').get(taskId) as { status: string; budget: number } | undefined;
    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    if (task.status !== 'open') {
      return { success: false, error: '任务已被接单或已完成' };
    }

    // 更新任务状态
    db.prepare(`
      UPDATE novel_tasks 
      SET status = 'assigned', assignee_id = ?, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'open'
    `).run(assigneeId, taskId);

    return { success: true };
  } catch (error) {
    console.error('接单失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 提交完成
 */
export function completeTask(taskId: string, assigneeId: string, deliveryUrl: string): { success: boolean; error?: string } {
  try {
    // 检查任务状态和权限
    const task = db.prepare('SELECT status, assignee_id FROM novel_tasks WHERE id = ?').get(taskId) as { status: string; assignee_id: string } | undefined;
    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    if (task.status !== 'assigned') {
      return { success: false, error: '任务状态不正确' };
    }
    if (task.assignee_id !== assigneeId) {
      return { success: false, error: '无权操作此任务' };
    }

    // 更新任务状态
    db.prepare(`
      UPDATE novel_tasks 
      SET status = 'pending_review', delivery_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(deliveryUrl, taskId);

    return { success: true };
  } catch (error) {
    console.error('提交完成失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 确认完成并支付
 */
export function confirmTask(taskId: string, publisherId: string, rating?: number, review?: string): { success: boolean; error?: string } {
  try {
    // 检查任务状态和权限
    const task = db.prepare('SELECT status, publisher_id, budget, assignee_id FROM novel_tasks WHERE id = ?').get(taskId) as { 
      status: string; 
      publisher_id: string; 
      budget: number;
      assignee_id: string;
    } | undefined;
    
    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    if (task.status !== 'pending_review') {
      return { success: false, error: '任务状态不正确' };
    }
    if (task.publisher_id !== publisherId) {
      return { success: false, error: '无权操作此任务' };
    }

    // 计算佣金（90%给作者，10%平台抽成）
    const authorAmount = Math.floor(task.budget * 0.9);
    const platformCommission = task.budget - authorAmount;

    // 使用事务执行支付
    const confirmTransaction = db.transaction(() => {
      // 1. 给作者转账
      // 给作者转账（自动创建钱包）
      const authorWalletBefore = getOrCreateWallet(task.assignee_id!);
      db.prepare(
        'UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      ).run(authorAmount, authorAmount, task.assignee_id);

      db.prepare(
        'INSERT INTO transactions (id, user_id, target_id, type, ref_id, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(
        uuidv4(),
        task.assignee_id,
        null,
        'task_reward',
        taskId,
        authorAmount,
        authorWalletBefore.balance + authorAmount,
        '完成任务获得奖励',
      );

      // 2. 平台抽成
      const platformWalletBefore = getOrCreateWallet('platform');
      db.prepare(
        'UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      ).run(platformCommission, platformCommission, 'platform');

      db.prepare(
        'INSERT INTO transactions (id, user_id, target_id, type, ref_id, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(
        uuidv4(),
        'platform',
        null,
        'task_reward',
        taskId,
        platformCommission,
        platformWalletBefore.balance + platformCommission,
        '任务平台抽成 10%',
      );

      // 3. 更新任务状态
      db.prepare(`
        UPDATE novel_tasks 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, rating = ?, review = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(rating || null, review || null, taskId);
    });

    confirmTransaction();
    return { success: true };
  } catch (error) {
    console.error('确认完成失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 取消任务（退款）
 */
export function cancelTask(taskId: string, userId: string): { success: boolean; refundAmount?: number; error?: string } {
  try {
    // 检查任务状态和权限
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

    // 如果已分配，需要先解除分配
    if (task.status === 'assigned' || task.status === 'pending_review') {
      db.prepare('UPDATE novel_tasks SET status = \'open\', assignee_id = NULL, assigned_at = NULL WHERE id = ?').run(taskId);
    }

    // 退款
    const cancelTransaction = db.transaction(() => {
      // 1. 退还SEED给用户（自动创建钱包）
      const userWalletBefore = getOrCreateWallet(userId);
      db.prepare(
        'UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      ).run(task.budget, userId);

      db.prepare(
        'INSERT INTO transactions (id, user_id, target_id, type, ref_id, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(
        uuidv4(),
        userId,
        null,
        'compensate',
        taskId,
        task.budget,
        userWalletBefore.balance + task.budget,
        '任务取消退款',
      );

      // 2. 更新任务状态
      db.prepare(`
        UPDATE novel_tasks 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(taskId);
    });

    cancelTransaction();
    return { success: true, refundAmount: task.budget };
  } catch (error) {
    console.error('取消任务失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}
