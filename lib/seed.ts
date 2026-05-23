import { v4 as uuidv4 } from 'uuid';
import db from './db';

// ===== SEED 种子币核心工具 =====

export interface Wallet {
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  target_id: string | null;
  type: TransactionType;
  ref_id: string | null;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export type TransactionType =
  | 'publish_novel'     // 发布小说 +100
  | 'publish_chapter'   // 发布章节 +10
  | 'like'              // 点赞 -1 / +1
  | 'favorite'          // 收藏 -10 / +8 / +2(平台)
  | 'register_bonus'    // 注册赠送 +100
  | 'seed_in'           // 管理员手动充值
  | 'admin_deduct'      // 管理员手动扣减
  | 'vote_reward'      // 章节有用投票奖励 +1
  | 'resource_upload'  // 提交新资源 +1
  | 'resource_vote'   // 资源投票消耗/奖励
  | 'opp_publish'     // 发布商机 -1
  | 'opp_vote'       // 商机投票 +1
  | 'task_reward'    // 完成任务奖励
  | 'burn'           // SEED 销毁
  | 'compensate'     // 失效退款
  | 'auto_feedback'; // AI 自动反馈

/**
 * 获取用户钱包，不存在则自动创建
 */
export function getOrCreateWallet(userId: string): Wallet {
  let wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId) as Wallet | undefined;
  if (!wallet) {
    db.prepare('INSERT INTO wallets (user_id, balance, total_earned, total_spent) VALUES (?, 0, 0, 0)').run(userId);
    wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId) as Wallet;
  }
  return wallet;
}

/**
 * 查询用户余额
 */
export function getBalance(userId: string): number {
  const wallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(userId) as { balance: number } | undefined;
  return wallet?.balance ?? 0;
}

/**
 * 执行 SEED 转账（原子操作）
 * @returns 交易后的余额
 */
export function transferSeed(
  userId: string,
  amount: number,
  type: TransactionType,
  options?: {
    targetId?: string;
    refId?: string;
    description?: string;
  }
): number {
  // 如果是支出，检查余额
  if (amount < 0) {
    const currentBalance = getBalance(userId);
    if (currentBalance + amount < 0) {
      throw new Error(`余额不足：当前 ${currentBalance} 🌱，需要 ${Math.abs(amount)} 🌱`);
    }
  }

  const transaction = db.transaction(() => {
    // 更新钱包
    const wallet = getOrCreateWallet(userId);
    const newBalance = wallet.balance + amount;

    db.prepare(`
      UPDATE wallets SET balance = ?, total_earned = total_earned + ?, total_spent = total_spent + ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(
      newBalance,
      amount > 0 ? amount : 0,
      amount < 0 ? Math.abs(amount) : 0,
      userId
    );

    // 记录流水
    const txId = uuidv4();
    db.prepare(`
      INSERT INTO transactions (id, user_id, target_id, type, ref_id, amount, balance_after, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(txId, userId, options?.targetId || null, type, options?.refId || null, amount, newBalance, options?.description || null);

    return newBalance;
  });

  return transaction();
}

/**
 * 从 A 向 B 转移 SEED（原子操作）
 * 例如用户点赞，用户扣 1 SEED，作者加 1 SEED
 */
export function transferBetweenUsers(
  fromUserId: string,
  toUserId: string,
  amount: number,
  type: TransactionType,
  options?: {
    refId?: string;
    description?: string;
    platformShare?: number; // 平台抽佣，例如 2 表示抽 2 SEED
  }
): { fromBalance: number; toBalance: number; platformBalance?: number } {
  if (amount <= 0) throw new Error('转账金额必须为正数');

  const platformShare = options?.platformShare || 0;
  const toAmount = amount - platformShare;

  const result = db.transaction(() => {
    const fromBalance = transferSeed(fromUserId, -amount, type, {
      refId: options?.refId,
      description: options?.description,
    });

    const toBalance = transferSeed(toUserId, toAmount, type, {
      targetId: fromUserId,
      refId: options?.refId,
      description: options?.description,
    });

    let platformBalance: number | undefined;
    if (platformShare > 0) {
      // 平台收入暂存在一个特殊账户 admin_platform
      platformBalance = transferSeed('platform', platformShare, type, {
        refId: options?.refId,
        description: `平台抽佣 ${platformShare} SEED`,
      });
    }

    return { fromBalance, toBalance, platformBalance };
  });

  return result();
}

/**
 * 获取用户交易流水
 */
export function getTransactions(userId: string, limit = 20, offset = 0): Transaction[] {
  return db.prepare(`
    SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(userId, limit, offset) as Transaction[];
}

/**
 * 获取 SEED 富豪榜（按余额降序）
 */
export function getLeaderboard(limit = 20): { user_id: string; username: string; balance: number; total_earned: number }[] {
  return db.prepare(`
    SELECT w.user_id, u.username, w.balance, w.total_earned
    FROM wallets w
    JOIN users u ON w.user_id = u.id
    WHERE w.balance > 0 AND u.role != 'admin'
    ORDER BY w.balance DESC
    LIMIT ?
  `).all(limit) as any[];
}

/**
 * 获取小说作者ID（从novels表查找author_id）
 */
export function getNovelAuthorId(novelId: string): string | null {
  const novel = db.prepare('SELECT author_id FROM novels WHERE id = ?').get(novelId) as { author_id: string } | undefined;
  return novel?.author_id || null;
}

/**
 * 销毁 SEED（从平台账户销毁，通缩）
 * 记录到 daily_economy_stats
 */
export function burnSeed(amount: number, description?: string): void {
  const platformBalance = getBalance('platform');
  if (platformBalance < amount) {
    throw new Error(`平台余额不足: ${platformBalance} < ${amount}`);
  }
  transferSeed('platform', -amount, 'burn', {
    description: description || `销毁 ${amount} SEED`,
  });
  // 更新每日统计
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO daily_economy_stats (date, seed_burned)
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET seed_burned = seed_burned + ?
  `).run(today, amount, amount);
}
