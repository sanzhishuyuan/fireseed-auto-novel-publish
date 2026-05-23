/**
 * 每日 SEED 经济结算脚本
 * 运行方式: node scripts/economy-daily.js
 * 建议定时: cron: 0 0 * * *
 *
 * 功能:
 * 1. 计算昨日平台收入
 * 2. 销毁 50% 平台收入
 * 3. 更新 daily_economy_stats 表
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'novel.db');
const db = new Database(dbPath);

function runDailySettlement() {
  console.log('=== 每日经济结算 ===');
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // 1. 计算昨日平台收入
  const platformIncome = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE target_id = 'platform' AND date(created_at) = ?
  `).get(yesterday) || { total: 0 };

  console.log(`昨日平台收入: ${platformIncome.total} SEED`);

  // 2. 计算昨日产出
  const yesterdayIssued = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE amount > 0 AND date(created_at) = ?
  `).get(yesterday) || { total: 0 };

  // 3. 计算昨日销毁
  const yesterdayBurned = db.prepare(`
    SELECT COALESCE(SUM(ABS(amount)), 0) as total
    FROM transactions
    WHERE type = 'burn' AND date(created_at) = ?
  `).get(yesterday) || { total: 0 };

  // 4. 销毁 50% 平台收入
  const burnAmount = Math.floor(platformIncome.total * 0.5);
  if (burnAmount > 0) {
    const platformWallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get('platform');
    if (platformWallet && platformWallet.balance >= burnAmount) {
      db.prepare(`
        UPDATE wallets SET balance = balance - ?, total_spent = total_spent + ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = 'platform'
      `).run(burnAmount, burnAmount);
      console.log(`销毁 ${burnAmount} SEED (50% of ${platformIncome.total})`);
    }
  }

  // 5. 获取当前流通量
  const circulating = db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM wallets').get() || { total: 0 };

  // 6. 获取活跃用户数
  const activeUsers = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as c FROM transactions WHERE date(created_at) = ?
  `).get(yesterday) || { c: 0 };

  // 7. 交易笔数
  const txnCount = db.prepare(`
    SELECT COUNT(*) as c FROM transactions WHERE date(created_at) = ?
  `).get(yesterday) || { c: 0 };

  // 8. 写入 daily_economy_stats
  db.prepare(`
    INSERT INTO daily_economy_stats (date, seed_issued, seed_burned, seed_circulating, active_users, total_transactions, platform_income)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      seed_issued = excluded.seed_issued,
      seed_burned = excluded.seed_burned,
      seed_circulating = excluded.seed_circulating,
      active_users = excluded.active_users,
      total_transactions = excluded.total_transactions,
      platform_income = excluded.platform_income
  `).run(
    yesterday,
    yesterdayIssued.total,
    yesterdayBurned.total + burnAmount,
    circulating.total,
    activeUsers.c,
    txnCount.c,
    platformIncome.total
  );

  console.log(`写入结算: ${yesterday}`);
  console.log(`  产出: ${yesterdayIssued.total}`);
  console.log(`  销毁: ${yesterdayBurned.total + burnAmount}`);
  console.log(`  流通: ${circulating.total}`);
  console.log(`  活跃: ${activeUsers.c}`);
  console.log(`  交易: ${txnCount.c}`);
  console.log('=== 结算完成 ===');
}

try {
  runDailySettlement();
} catch (error) {
  console.error('结算失败:', error);
  process.exit(1);
} finally {
  db.close();
}
