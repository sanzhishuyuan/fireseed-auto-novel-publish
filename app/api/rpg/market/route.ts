/**
 * GET /api/rpg/market — 浏览市场（带分页/筛选/搜索/排序）
 * POST /api/rpg/market — 上架资产
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import db from '@/lib/db';
import { listAsset } from '@/lib/rpg/economy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const sort = searchParams.get('sort') || 'newest';
    const q = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Build query
    const conditions: string[] = ["ml.status = 'active'"];
    const params: any[] = [];

    if (type !== 'all') {
      conditions.push('ml.asset_type = ?');
      params.push(type);
    }

    if (q) {
      conditions.push('(c.name LIKE ? OR l.name LIKE ? OR cp.name LIKE ? OR l.description LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const where = conditions.length ? conditions.join(' AND ') : '1=1';

    // Sort
    let orderBy = 'ml.created_at DESC';
    switch (sort) {
      case 'popular': orderBy = 'ml.buyer_count DESC, ml.created_at DESC'; break;
      case 'price_low': orderBy = 'ml.price ASC'; break;
      case 'price_high': orderBy = 'ml.price DESC'; break;
      case 'rating': orderBy = 'COALESCE(c.avg_rating, l.avg_rating, 0) DESC'; break;
      default: orderBy = 'ml.created_at DESC';
    }

    // Count total
    const countResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM rpg_market_listings ml
      LEFT JOIN rpg_characters c ON ml.asset_type = 'character' AND ml.asset_id = c.id
      LEFT JOIN rpg_lorebooks l ON ml.asset_type = 'lorebook' AND ml.asset_id = l.id
      LEFT JOIN rpg_campaigns cp ON ml.asset_type = 'module' AND ml.asset_id = cp.id
      WHERE ${where}
    `).get(...params) as any;
    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Fetch page
    const items = db.prepare(`
      SELECT
        ml.id,
        ml.asset_type as type,
        ml.asset_id,
        ml.seller_id,
        ml.price,
        ml.license_mode,
        ml.created_at,
        COALESCE(c.name, l.name, cp.name, '未命名') as name,
        COALESCE(json_extract(c.card_data, '$.description'), l.description, cp.world_brief, '') as description,
        u.username as sellerName,
        COALESCE(c.avg_rating, l.avg_rating, 0) as rating,
        COALESCE(c.rating_count, l.rating_count, 0) as ratingCount
      FROM rpg_market_listings ml
      LEFT JOIN rpg_characters c ON ml.asset_type = 'character' AND ml.asset_id = c.id
      LEFT JOIN rpg_lorebooks l ON ml.asset_type = 'lorebook' AND ml.asset_id = l.id
      LEFT JOIN rpg_campaigns cp ON ml.asset_type = 'module' AND ml.asset_id = cp.id
      LEFT JOIN users u ON ml.seller_id = u.id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return NextResponse.json({ success: true, items, total, totalPages });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取市场列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const body = await request.json();
    const { asset_type, asset_id, price, license_mode } = body;

    if (!asset_type || !asset_id) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    const result = listAsset(user.userId, asset_type, asset_id, price || 0, license_mode || 'full_copy');
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '上架失败' }, { status: 400 });
  }
}
