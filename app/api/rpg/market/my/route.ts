/**
 * GET /api/rpg/market/my — 我的挂牌和购买记录
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getUserListings, getPurchasedAssets } from '@/lib/rpg/economy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'listings';

    if (tab === 'purchases') {
      const purchases = getPurchasedAssets(user.userId);
      return NextResponse.json({ success: true, data: purchases });
    }

    const listings = getUserListings(user.userId);
    return NextResponse.json({ success: true, data: listings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取失败' }, { status: 500 });
  }
}
