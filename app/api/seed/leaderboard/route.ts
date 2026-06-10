import { withRoute } from '@/lib/with-route';
import { apiSuccess } from '@/lib/api-response';
import { getLeaderboard } from '@/lib/seed';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seed/leaderboard — SEED 富豪榜
 */
export const GET = withRoute({ auth: 'none' }, async () => {
  try {
    const board = getLeaderboard(20);
    return apiSuccess(board);
  } catch (error) {
    console.error('[Seed Leaderboard] Error:', error);
    return apiSuccess([]);
  }
});
