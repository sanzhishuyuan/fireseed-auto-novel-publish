import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/seed';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seed/leaderboard — SEED 富豪榜
 */
export async function GET() {
  try {
    const board = getLeaderboard(20);
    return NextResponse.json({ success: true, data: board });
  } catch (error) {
    console.error('[Seed Leaderboard] Error:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}
