import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getTransactions } from '@/lib/seed';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seed/transactions — 我的交易流水
 * query: ?limit=20&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const txs = getTransactions(userId, Math.min(limit, 50), offset);
    return NextResponse.json({ success: true, data: txs });
  } catch (error) {
    console.error('[Seed Transactions] Error:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}
