import { NextRequest } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getBalance, burnSeed } from '@/lib/seed';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

/**
 * POST /api/seed/burn
 * 销毁 SEED（通缩机制）
 * Body: { amount: number, reason?: string }
 * Auth: 需要登录
 * 用途：用户主动销毁 SEED，用于通缩或特定功能消耗
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return apiError('AUTH_REQUIRED', '请先登录', 401);

    const rl = checkRateLimit(request, `burn:${userId}`, 'auth');
    const rlResp = rateLimitResponse(rl);
    if (rlResp) return rlResp;

    const bodyText = await request.text();

    const parsed = safeParseJSON(bodyText);

    if (!parsed.success) return parsed.response;

    const body = parsed.data;
    const amount = parseInt(body.amount);

    if (!amount || amount <= 0) {
      return apiError('VALIDATION_INVALID_PARAM', '销毁数量必须为正整数', 400);
    }
    if (amount > 10000) {
      return apiError('VALIDATION_INVALID_PARAM', '单次最多销毁 10000', 400);
    }

    const balance = getBalance(userId);
    if (balance < amount) {
      return apiError('SEED_INSUFFICIENT', `余额不足: ${balance} < ${amount}`, 402);
    }

    // 先转到平台账户再从平台销毁
    const { transferSeed } = await import('@/lib/seed');
    transferSeed(userId, -amount, 'burn', {
      refId: `burn_${Date.now()}`,
      description: body.reason ? `用户销毁: ${body.reason}` : '用户主动销毁',
    });

    // 从平台销毁（实际通缩）
    try {
      burnSeed(amount, `用户 ${userId.slice(0,8)} 销毁`);
    } catch {
      // 平台余额不足时只是记录
    }

    const newBalance = getBalance(userId);

    return apiSuccess({
      burned: amount,
      balance: newBalance,
      message: `🔥 已销毁 ${amount} 🌱 SEED`,
    });
  } catch (error: any) {
    console.error('[Seed Burn] Error:', error);
    if (error.message?.includes('余额不足')) {
      return apiError('SEED_INSUFFICIENT', error.message, 402);
    }
    return apiError('INTERNAL_ERROR', '销毁失败', 500);
  }
}

/**
 * GET /api/seed/burn
 * 获取用户的销毁记录
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return apiError('AUTH_REQUIRED', '请先登录', 401);

    const { default: db } = await import('@/lib/db');
    const logs = db.prepare(`
      SELECT amount, description, created_at FROM transactions
      WHERE user_id = ? AND type = 'burn'
      ORDER BY created_at DESC LIMIT 20
    `).all(userId) as any[];

    const totalBurned = db.prepare(
      "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE user_id = ? AND type = 'burn'"
    ).get(userId) as { total: number };

    return apiSuccess({ logs, total_burned: totalBurned.total });
  } catch (error) {
    console.error('[Seed Burn] GET error:', error);
    return apiError('INTERNAL_ERROR', '获取销毁记录失败', 500);
  }
}
