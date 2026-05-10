import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';
import { getBalance, getOrCreateWallet } from '@/lib/seed';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seed/balance — 查看我的 SEED 余额
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    let userId = '';
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.userId || '';
      } catch { /* ignore */ }
    }

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
