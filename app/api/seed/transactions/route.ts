import { NextRequest } from 'next/server';
import { getTransactions } from '@/lib/seed';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seed/transactions — 我的交易流水
 * query: ?limit=20&offset=0
 */
export const GET = withRoute({ auth: 'user' }, async (request, ctx) => {
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const txs = getTransactions(ctx.user.id, Math.min(limit, 50), offset);
  return apiSuccess(txs);
});
