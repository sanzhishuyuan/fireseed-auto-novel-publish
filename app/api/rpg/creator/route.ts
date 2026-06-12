/**
 * GET /api/rpg/creator/:userId — 创作者档案
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCreatorProfile } from '@/lib/rpg/economy';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少 userId' }, { status: 400 });
    }

    const profile = getCreatorProfile(userId);
    if (!profile) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    // 统计该创作者的市场挂牌
    const activeListings = (db.prepare(`
      SELECT COUNT(*) as c FROM rpg_market_listings WHERE seller_id = ? AND status = 'active'
    `).get(userId) as any).c;

    const totalSales = (db.prepare(`
      SELECT COUNT(*) as c FROM rpg_market_listings WHERE seller_id = ? AND status = 'sold'
    `).get(userId) as any).c;

    // 共享资产数
    const sharedCharacters = (db.prepare(`
      SELECT COUNT(*) as c FROM rpg_characters WHERE user_id = ? AND license_type IN ('public_free', 'public_full')
    `).get(userId) as any).c;

    const sharedLorebooks = (db.prepare(`
      SELECT COUNT(*) as c FROM rpg_lorebooks WHERE user_id = ? AND license_type IN ('public_free', 'public_full')
    `).get(userId) as any).c;

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        activeListings,
        totalSales,
        sharedAssets: sharedCharacters + sharedLorebooks,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取失败' }, { status: 500 });
  }
}
