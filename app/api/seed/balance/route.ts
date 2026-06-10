import { NextRequest } from 'next/server';
import { getOrCreateWallet } from '@/lib/seed';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seed/balance — 查看我的 SEED 余额
 */
export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  const wallet = getOrCreateWallet(ctx.user.id);
  return apiSuccess({
    balance: wallet.balance,
    total_earned: wallet.total_earned,
    total_spent: wallet.total_spent,
  });
});
