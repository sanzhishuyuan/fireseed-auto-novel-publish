import db from './db';

/**
 * FireSeed 经济系统核心配置
 * Phase 2: 固定日产出 + 平台抽成 + 销毁机制
 */

// ===== 经济参数 =====

/** 每日 SEED 固定产出上限 */
export const DAILY_SEED_LIMIT = 10000;

/** 平台交易抽成比例 (10%) */
export const PLATFORM_COMMISSION_RATE = 0.10;

/** 平台收入销毁比例 (50%) */
export const BURN_RATE = 0.50;

/** 新用户注册赠送 */
export const REGISTER_BONUS = 100;

/** 发布小说奖励 */
export const PUBLISH_NOVEL_REWARD = 100;

/** 发布章节奖励 */
export const PUBLISH_CHAPTER_REWARD = 10;

// ===== 统计查询 =====

/**
 * 获取今日已产出的 SEED 总量
 */
export function getTodayIssued(): number {
  const row = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE amount > 0 AND date(created_at) = date('now')"
  ).get() as { total: number };
  return row.total;
}

/**
 * 获取今日已销毁的 SEED 总量
 */
export function getTodayBurned(): number {
  const row = db.prepare(
    "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE type = 'burn' AND date(created_at) = date('now')"
  ).get() as { total: number };
  return row.total;
}

/**
 * 检查今日还能产出多少 SEED
 */
export function getTodayRemainingBudget(): number {
  const issued = getTodayIssued();
  return Math.max(0, DAILY_SEED_LIMIT - issued);
}

/**
 * 检查是否还能发行指定数量的 SEED
 */
export function canIssueSeed(amount: number): boolean {
  return getTodayRemainingBudget() >= amount;
}

/**
 * 获取当前流通中的 SEED 总量
 */
export function getCirculatingSupply(): number {
  const row = db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM wallets').get() as { total: number };
  return row.total;
}

/**
 * 获取今日活跃用户数（有交易的用户）
 */
export function getTodayActiveUsers(): number {
  const row = db.prepare(
    "SELECT COUNT(DISTINCT user_id) as c FROM transactions WHERE date(created_at) = date('now')"
  ).get() as { c: number };
  return row.c;
}

/**
 * 获取平台累计收入
 */
export function getPlatformTotalIncome(): number {
  const wallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get('platform') as { balance: number } | undefined;
  return wallet?.balance || 0;
}

/**
 * 获取今日平台交易笔数
 */
export function getTodayTransactions(): number {
  const row = db.prepare(
    "SELECT COUNT(*) as c FROM transactions WHERE date(created_at) = date('now')"
  ).get() as { c: number };
  return row.c;
}

/**
 * 获取经济概览（聚合数据）
 */
export function getEconomyOverview() {
  return {
    today_issued: getTodayIssued(),
    today_burned: getTodayBurned(),
    today_remaining_budget: getTodayRemainingBudget(),
    circulating_supply: getCirculatingSupply(),
    today_active_users: getTodayActiveUsers(),
    today_transactions: getTodayTransactions(),
    platform_income: getPlatformTotalIncome(),
    daily_limit: DAILY_SEED_LIMIT,
  };
}
