import { NextRequest } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getEconomyOverview } from '@/lib/economy';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seed/stats
 * 经济统计概览（公开）
 */
export async function GET(request: NextRequest) {
  try {
    const overview = getEconomyOverview();

    // 如果已登录，返回用户的个性化统计
    const userId = getUserIdFromRequest(request);
    let userStats = null;

    if (userId) {
      const { default: db } = await import('@/lib/db');
      const wallet = db.prepare('SELECT balance, total_earned, total_spent FROM wallets WHERE user_id = ?')
        .get(userId) as any;

      const userTxnCount = db.prepare(
        'SELECT COUNT(*) as c FROM transactions WHERE user_id = ?'
      ).get(userId) as { c: number };

      const userBurned = db.prepare(
        "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE user_id = ? AND type = 'burn'"
      ).get(userId) as { total: number };

      userStats = {
        balance: wallet?.balance || 0,
        total_earned: wallet?.total_earned || 0,
        total_spent: wallet?.total_spent || 0,
        transaction_count: userTxnCount.c,
        total_burned: userBurned.total,
      };
    }

    return apiSuccess({ ...overview, user: userStats });
  } catch (error) {
    console.error('[Seed Stats] Error:', error);
    return apiError('INTERNAL_ERROR', '获取统计失败', 500);
  }
}
