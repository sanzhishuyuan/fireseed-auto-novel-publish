/**
 * GET /api/rpg/fund — 创作者基金概况
 * POST /api/rpg/fund/distribute — 手动触发月度分配（管理员）
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { transferSeed, getBalance } from '@/lib/seed';
import { CREATOR_LEVELS, CREATOR_FUND_RATE } from '@/lib/rpg/economy';

export const dynamic = 'force-dynamic';

/** GET — 基金概况 */
export async function GET() {
  try {
    // 平台钱包余额
    const platformBalance = getBalance('platform');

    // 基金历史分配
    const distributions = db.prepare(`
      SELECT * FROM transactions 
      WHERE type = 'rpg_fund_reward' 
      ORDER BY created_at DESC LIMIT 20
    `).all();

    // 当月 RPG 交易总额
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString();

    const monthStats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'rpg_purchase' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN type = 'rpg_purchase' AND amount < 0 THEN 1 ELSE 0 END), 0) as total_transactions,
        COALESCE(SUM(CASE WHEN type = 'rpg_gm_interact' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_gm_income
      FROM transactions 
      WHERE created_at >= ? AND (type = 'rpg_purchase' OR type = 'rpg_gm_interact')
    `).get(monthStartStr) as any;

    // 本月应注入基金的量（平台收入的 50%）
    const projectedFund = Math.floor(((monthStats.total_sales || 0) * 0.1 + (monthStats.total_gm_income || 0) * 0.5) * 0.5);

    return NextResponse.json({
      success: true,
      data: {
        platformBalance,
        projectedFund,
        totalSales: monthStats.total_sales || 0,
        totalTransactions: monthStats.total_transactions || 0,
        totalGMIncome: monthStats.total_gm_income || 0,
        recentDistributions: distributions,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** POST — 月度创作者基金分配 */
export async function POST(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (admin instanceof Response) return admin;

    const body = await request.json();
    const { action } = body;

    if (action === 'distribute') {
      return distributeFunds();
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** 基金分配逻辑 */
function distributeFunds() {
  const result = db.transaction(() => {
    // 1. 计算本月基金总额
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString();

    const monthData = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'rpg_purchase' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN type = 'rpg_gm_interact' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_gm_income
      FROM transactions WHERE created_at >= ?
    `).get(monthStartStr) as any;

    const fundPool = Math.floor((monthData.total_sales * 0.05) + (monthData.total_gm_income * 0.1));

    if (fundPool < 100) {
      throw new Error(`基金池不足（${fundPool} SEED），至少需要 100 SEED 才能分配`);
    }

    // 2. 分配规则
    const contestPool = Math.floor(fundPool * 0.4);   // 40% 创作大赛
    const newCreatorPool = Math.floor(fundPool * 0.3); // 30% 新创作者扶持
    const advisorPool = Math.floor(fundPool * 0.2);    // 20% L4/L5 顾问津贴
    const reservePool = fundPool - contestPool - newCreatorPool - advisorPool; // 10% 储备

    // 3. 发放 L4/L5 顾问津贴
    const advisors = db.prepare(`
      SELECT id, username, creator_level FROM users WHERE creator_level >= 4 ORDER BY creator_level DESC
    `).all() as any[];

    let advisorDistributed = 0;
    if (advisors.length > 0) {
      const perAdvisor = Math.floor(advisorPool / advisors.length);
      for (const adv of advisors) {
        const amount = adv.creator_level >= 5 ? Math.floor(perAdvisor * 1.5) : perAdvisor;
        if (amount > 0) {
          const txId = uuidv4();
          transferSeed(adv.id, amount, 'rpg_fund_reward', {
            description: `创作者基金 - L${adv.creator_level} 顾问津贴 ${amount} SEED`,
          });
          advisorDistributed += amount;
        }
      }
    }

    // 4. 新创作者扶持（达到 L2 的创作者奖励）
    const newL2Creators = db.prepare(`
      SELECT id, username FROM users 
      WHERE creator_level >= 2 AND creator_level <= 3
      ORDER BY creator_score ASC LIMIT 10
    `).all() as any[];

    let newCreatorDistributed = 0;
    if (newL2Creators.length > 0) {
      const perCreator = Math.floor(newCreatorPool / newL2Creators.length);
      for (const cr of newL2Creators) {
        if (perCreator > 0) {
          transferSeed(cr.id, perCreator, 'rpg_fund_reward', {
            description: `创作者基金 - 新创作者扶持 ${perCreator} SEED`,
          });
          newCreatorDistributed += perCreator;
        }
      }
    }

    // 记录日志
    const logId = uuidv4();
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, balance_after, description)
      VALUES (?, 'platform', 'rpg_fund_reward', ?, 0, ?)
    `).run(logId, -fundPool, `创作者基金月度分配：大赛 ${contestPool} + 扶持 ${newCreatorDistributed} + 顾问 ${advisorDistributed} + 储备 ${reservePool}`);

    return {
      fundPool,
      allocations: {
        contestPool,
        newCreatorPool: newCreatorDistributed,
        advisorPool: advisorDistributed,
        reservePool,
        advisors: advisors.length,
        newCreatorsAwarded: newL2Creators.length,
      },
    };
  });

  return NextResponse.json({ success: true, data: result });
}
