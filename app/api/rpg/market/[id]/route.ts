/**
 * GET/POST/DELETE /api/rpg/market/:id — 资产详情 / 购买 / 下架
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import db from '@/lib/db';
import { buyAsset, delistAsset } from '@/lib/rpg/economy';

export const dynamic = 'force-dynamic';

/** GET /api/rpg/market/:id — 资产详情 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const listing = db.prepare(`
      SELECT ml.*, u.username as seller_name,
             c.name as char_name, json_extract(c.card_data, '$.description') as char_desc, c.card_data, c.avatar_url, c.system,
             l.name as lore_name, l.description as lore_desc, l.entries,
             cp.name as campaign_name, cp.world_brief,
             COALESCE(c.avg_rating, l.avg_rating, 0) as avg_rating,
             COALESCE(c.rating_count, l.rating_count, 0) as rating_count
      FROM rpg_market_listings ml
      LEFT JOIN rpg_characters c ON ml.asset_type = 'character' AND ml.asset_id = c.id
      LEFT JOIN rpg_lorebooks l ON ml.asset_type = 'lorebook' AND ml.asset_id = l.id
      LEFT JOIN rpg_campaigns cp ON ml.asset_type = 'module' AND ml.asset_id = cp.id
      LEFT JOIN users u ON ml.seller_id = u.id
      WHERE ml.id = ?
    `).get(id);

    if (!listing) {
      return NextResponse.json({ success: false, error: '商品不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: listing });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取详情失败' }, { status: 500 });
  }
}

/** POST /api/rpg/market/:id/buy — 购买资产 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const { id } = await params;
    const result = buyAsset(user.userId, id);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '购买失败' }, { status: 400 });
  }
}

/** DELETE /api/rpg/market/:id — 下架资产 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const { id } = await params;
    delistAsset(user.userId, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '下架失败' }, { status: 400 });
  }
}
