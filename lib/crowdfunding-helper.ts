/**
 * 众筹系统辅助函数
 */

import db from './db';
import { getOrCreateWallet } from './seed';
import { v4 as uuidv4 } from 'uuid';

export interface CreateCrowdfundingInput {
  title: string;
  description: string;
  target_amount: number;
  deadline: string; // ISO date string
  rewards?: Array<{
    tier_name: string;
    min_amount: number;
    benefits: string[];
    limit_count?: number;
  }>;
}

export interface CrowdfundingProject {
  id: string;
  author_id: string;
  novel_id?: string;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  supporter_count: number;
  deadline: string;
  status: string;
  rewards: string; // JSON string
  min_support_amount: number;
  stretch_goals: string; // JSON string
  updates_count: number;
  success_stories: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  progress_percentage?: number;
  days_left?: number;
}

export interface CrowdfundingReward {
  id: string;
  project_id: string;
  tier_name: string;
  min_amount: number;
  benefits: string; // JSON array string
  limit_count: number;
  claimed_count: number;
}

/**
 * 验证众筹输入数据
 */
export function validateCrowdfundingInput(input: CreateCrowdfundingInput): { valid: boolean; error?: string } {
  // 标题验证
  if (!input.title || input.title.trim().length < 5) {
    return { valid: false, error: '项目标题至少5个字符' };
  }
  if (input.title.length > 100) {
    return { valid: false, error: '项目标题不能超过100个字符' };
  }

  // 描述验证
  if (!input.description || input.description.trim().length < 50) {
    return { valid: false, error: '项目描述至少50个字符' };
  }
  if (input.description.length > 5000) {
    return { valid: false, error: '项目描述不能超过5000个字符' };
  }

  // 目标金额验证
  if (!input.target_amount || input.target_amount < 500) {
    return { valid: false, error: '目标金额至少500 SEED' };
  }
  if (input.target_amount > 100000) {
    return { valid: false, error: '目标金额不能超过100000 SEED' };
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
  if (daysDiff < 7) {
    return { valid: false, error: '众筹期限至少7天' };
  }
  if (daysDiff > 90) {
    return { valid: false, error: '众筹期限不能超过90天' };
  }

  // 回报档位验证（如果提供）
  if (input.rewards && input.rewards.length > 0) {
    if (input.rewards.length > 10) {
      return { valid: false, error: '回报档位不能超过10个' };
    }

    for (let i = 0; i < input.rewards.length; i++) {
      const reward = input.rewards[i];
      if (!reward.tier_name || reward.tier_name.length < 2) {
        return { valid: false, error: `第${i + 1}个档位名称至少2个字符` };
      }
      if (!reward.min_amount || reward.min_amount < 10) {
        return { valid: false, error: `第${i + 1}个档位最低支持金额至少10 SEED` };
      }
      if (!reward.benefits || reward.benefits.length === 0) {
        return { valid: false, error: `第${i + 1}个档位必须包含权益描述` };
      }
    }
  }

  return { valid: true };
}

/**
 * 创建众筹项目
 */
export function createCrowdfunding(authorId: string, input: CreateCrowdfundingInput): { success: boolean; projectId?: string; error?: string } {
  try {
    // 验证输入
    const validation = validateCrowdfundingInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 使用事务执行所有操作
    const insertProject = db.transaction(() => {
      const projectId = uuidv4();
      const rewardsJson = input.rewards ? JSON.stringify(input.rewards) : '[]';

      // 1. 创建众筹项目
      db.prepare(`
        INSERT INTO crowdfunding_projects (
          id, author_id, title, description, target_amount, current_amount,
          supporter_count, deadline, status, rewards, min_support_amount,
          stretch_goals, updates_count, success_stories, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, 'active', ?, 10, '[]', 0, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        projectId,
        authorId,
        input.title,
        input.description,
        input.target_amount,
        input.deadline,
        rewardsJson
      );

      // 2. 如果有回报档位，创建回报记录
      if (input.rewards && input.rewards.length > 0) {
        const insertReward = db.prepare(`
          INSERT INTO crowdfunding_rewards (
            id, project_id, tier_name, min_amount, benefits, limit_count, claimed_count
          ) VALUES (?, ?, ?, ?, ?, ?, 0)
        `);

        for (const reward of input.rewards) {
          insertReward.run(
            uuidv4(),
            projectId,
            reward.tier_name,
            reward.min_amount,
            JSON.stringify(reward.benefits),
            reward.limit_count || 0
          );
        }
      }

      return projectId;
    });

    const projectId = insertProject();
    return { success: true, projectId };
  } catch (error) {
    console.error('创建众筹项目失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 获取众筹项目列表
 */
export function getCrowdfundingProjects(filters: {
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): { projects: CrowdfundingProject[]; total: number; page: number; totalPages: number } {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.status) {
    conditions.push('p.status = ?');
    params.push(filters.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 排序
  let orderBy = 'p.created_at DESC';
  if (filters.sort === 'popular') {
    orderBy = 'p.current_amount DESC';
  } else if (filters.sort === 'ending_soon') {
    orderBy = 'p.deadline ASC';
  }

  // 查询总数
  const countQuery = `SELECT COUNT(*) as total FROM crowdfunding_projects p ${whereClause}`;
  const totalResult = db.prepare(countQuery).get(...params) as { total: number };
  const total = totalResult.total;

  // 查询项目列表
  const query = `
    SELECT 
      p.*,
      u.username as author_name,
      CAST((p.current_amount * 100.0 / p.target_amount) AS INTEGER) as progress_percentage,
      CAST(julianday(p.deadline) - julianday('now') AS INTEGER) as days_left
    FROM crowdfunding_projects p
    LEFT JOIN users u ON p.author_id = u.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const projects = db.prepare(query).all(...params, limit, offset) as CrowdfundingProject[];

  return {
    projects,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * 获取众筹项目详情
 */
export function getCrowdfundingById(projectId: string): { project: CrowdfundingProject | null; rewards: CrowdfundingReward[] } {
  const project = db.prepare(`
    SELECT 
      p.*,
      u.username as author_name,
      CAST((p.current_amount * 100.0 / p.target_amount) AS INTEGER) as progress_percentage,
      CAST(julianday(p.deadline) - julianday('now') AS INTEGER) as days_left
    FROM crowdfunding_projects p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.id = ?
  `).get(projectId) as CrowdfundingProject | undefined;

  const rewards = db.prepare(`
    SELECT * FROM crowdfunding_rewards WHERE project_id = ? ORDER BY min_amount ASC
  `).all(projectId) as CrowdfundingReward[];

  return {
    project: project || null,
    rewards
  };
}

/**
 * 支持众筹
 */
export function supportCrowdfunding(projectId: string, userId: string, amount: number, rewardTier?: string): { success: boolean; error?: string } {
  try {
    // 检查项目状态
    const project = db.prepare('SELECT status, target_amount, current_amount, deadline FROM crowdfunding_projects WHERE id = ?').get(projectId) as {
      status: string;
      target_amount: number;
      current_amount: number;
      deadline: string;
    } | undefined;

    if (!project) {
      return { success: false, error: '众筹项目不存在' };
    }

    if (project.status !== 'active') {
      return { success: false, error: '众筹项目已结束' };
    }

    // 检查是否已过期
    const deadline = new Date(project.deadline);
    if (new Date() > deadline) {
      return { success: false, error: '众筹已过期' };
    }

    // 检查用户余额（自动创建钱包）
    const wallet = getOrCreateWallet(userId);
    if (wallet.balance < amount) {
      return { success: false, error: `余额不足，当前余额: ${wallet.balance} SEED，需要: ${amount} SEED` };
    }

    // 检查是否已支持过（每人只能支持一次）
    const existingSupport = db.prepare('SELECT id FROM crowdfunding_supporters WHERE project_id = ? AND user_id = ?').get(projectId, userId);
    if (existingSupport) {
      return { success: false, error: '您已经支持过此项目' };
    }

    // 如果使用回报档位，验证档位
    if (rewardTier) {
      const reward = db.prepare('SELECT min_amount, limit_count, claimed_count FROM crowdfunding_rewards WHERE project_id = ? AND tier_name = ?').get(projectId, rewardTier) as {
        min_amount: number;
        limit_count: number;
        claimed_count: number;
      } | undefined;

      if (!reward) {
        return { success: false, error: '无效的回报档位' };
      }

      if (amount < reward.min_amount) {
        return { success: false, error: `此档位最低支持金额为 ${reward.min_amount} SEED` };
      }

      if (reward.limit_count > 0 && reward.claimed_count >= reward.limit_count) {
        return { success: false, error: '此档位限量已售罄' };
      }
    }

    // 使用事务执行支持操作
    const supportTransaction = db.transaction(() => {
      const supporterId = uuidv4();

      // 1. 从用户钱包扣款（冻结资金）
      db.prepare(
        'UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      ).run(amount, userId);

      // 2. 记录交易
      db.prepare(
        'INSERT INTO transactions (id, user_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(
        uuidv4(),
        userId,
        'crowdfunding_support',
        -amount,
        wallet.balance - amount,
        `支持众筹项目`,
      );

      // 3. 创建支持者记录
      db.prepare(`
        INSERT INTO crowdfunding_supporters (id, project_id, user_id, amount, reward_tier, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(supporterId, projectId, userId, amount, rewardTier || '');

      // 4. 更新项目进度
      db.prepare(`
        UPDATE crowdfunding_projects 
        SET current_amount = current_amount + ?, supporter_count = supporter_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(amount, projectId);

      // 5. 如果使用了回报档位，更新已领取数量
      if (rewardTier) {
        db.prepare(`
          UPDATE crowdfunding_rewards 
          SET claimed_count = claimed_count + 1
          WHERE project_id = ? AND tier_name = ?
        `).run(projectId, rewardTier);
      }
    });

    supportTransaction();
    return { success: true };
  } catch (error) {
    console.error('支持众筹失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 检查众筹状态（定时任务调用）
 */
export function checkCrowdfundingStatus(): { checked: number; successful: number; failed: number } {
  try {
    const now = new Date().toISOString();

    // 查找已到期的活跃项目
    const expiredProjects = db.prepare(`
      SELECT id, target_amount, current_amount FROM crowdfunding_projects
      WHERE status = 'active' AND deadline <= ?
    `).all(now) as Array<{ id: string; target_amount: number; current_amount: number }>;

    let successful = 0;
    let failed = 0;

    const updateStatus = db.transaction((projectId: string, targetAmount: number, currentAmount: number) => {
      if (currentAmount >= targetAmount) {
        // 众筹成功
        db.prepare(`
          UPDATE crowdfunding_projects SET status = 'successful', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(projectId);

        // 将资金转给作者
        const project = db.prepare('SELECT author_id FROM crowdfunding_projects WHERE id = ?').get(projectId) as { author_id: string } | undefined;
        if (project) {
          const commission = Math.floor(currentAmount * 0.1); // 10%平台抽成
          const authorAmount = currentAmount - commission;

          // 给作者转账
          const authorWallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(project.author_id) as { balance: number } | undefined;
          if (authorWallet) {
            db.prepare(
              'UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
            ).run(authorAmount, project.author_id);

            db.prepare(
              'INSERT INTO transactions (id, user_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
            ).run(
              uuidv4(),
              project.author_id,
              'crowdfunding_success',
              authorAmount,
              authorWallet.balance + authorAmount,
              `众筹成功获得资金`,
            );
          }

          // 平台收入
          const platformWallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get('platform') as { balance: number } | undefined;
          if (platformWallet) {
            db.prepare(
              'UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
            ).run(commission, 'platform');

            db.prepare(
              'INSERT INTO transactions (id, user_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
            ).run(
              uuidv4(),
              'platform',
              'commission',
              commission,
              platformWallet.balance + commission,
              `众筹平台抽成`,
            );
          }
        }

        successful++;
      } else {
        // 众筹失败，退款
        db.prepare(`
          UPDATE crowdfunding_projects SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(projectId);

        // 退还所有支持者
        const supporters = db.prepare('SELECT user_id, amount FROM crowdfunding_supporters WHERE project_id = ?').all(projectId) as Array<{ user_id: string; amount: number }>;

        for (const supporter of supporters) {
          const supporterWallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(supporter.user_id) as { balance: number } | undefined;
          if (supporterWallet) {
            db.prepare(
              'UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
            ).run(supporter.amount, supporter.user_id);

            db.prepare(
              'INSERT INTO transactions (id, user_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
            ).run(
              uuidv4(),
              supporter.user_id,
              'crowdfunding_refund',
              supporter.amount,
              supporterWallet.balance + supporter.amount,
              `众筹失败退款`,
            );
          }
        }

        failed++;
      }
    });

    for (const project of expiredProjects) {
      updateStatus(project.id, project.target_amount, project.current_amount);
    }

    return {
      checked: expiredProjects.length,
      successful,
      failed
    };
  } catch (error) {
    console.error('检查众筹状态失败:', error);
    return { checked: 0, successful: 0, failed: 0 };
  }
}

/**
 * 发布众筹更新
 */
export function postCrowdfundingUpdate(projectId: string, authorId: string, title: string, content: string): { success: boolean; error?: string } {
  try {
    // 验证权限
    const project = db.prepare('SELECT author_id FROM crowdfunding_projects WHERE id = ?').get(projectId) as { author_id: string } | undefined;
    if (!project) {
      return { success: false, error: '项目不存在' };
    }
    if (project.author_id !== authorId) {
      return { success: false, error: '无权操作此项目' };
    }

    // 创建更新
    db.prepare(`
      INSERT INTO crowdfunding_updates (id, project_id, title, content, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(uuidv4(), projectId, title, content);

    // 更新项目的更新次数
    db.prepare(`
      UPDATE crowdfunding_projects SET updates_count = updates_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(projectId);

    return { success: true };
  } catch (error) {
    console.error('发布更新失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}
