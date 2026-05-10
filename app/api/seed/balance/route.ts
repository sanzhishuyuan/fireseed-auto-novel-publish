import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getOrCreateWallet } from '@/lib/seed';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seed/balance — 查看我的 SEED 余额
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const wallet = getOrCreateWallet(userId);
    return NextResponse.json({
      success: true,
      balance: wallet.balance,
      total_earned: wallet.total_earned,
      total_spent: wallet.total_spent,
    });
  } catch (error) {
    console.error('[Seed Balance] Error:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}
