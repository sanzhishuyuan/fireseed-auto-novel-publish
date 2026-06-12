/**
 * GET/POST /api/rpg/market — 市场浏览 + 上架资产
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { browseMarket, listAsset } from '@/lib/rpg/economy';

export const dynamic = 'force-dynamic';

/** GET /api/rpg/market — 浏览市场 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const options = {
      assetType: searchParams.get('type') || undefined,
      sort: (searchParams.get('sort') || 'newest') as any,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('q') || undefined,
    };

    const result = browseMarket(options);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取市场列表失败' }, { status: 500 });
  }
}

/** POST /api/rpg/market — 上架资产 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const body = await request.json();
    const { asset_type, asset_id, price, license_mode } = body;

    if (!asset_type || !asset_id || !price) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    if (price < 1) {
      return NextResponse.json({ success: false, error: '价格至少为 1 SEED' }, { status: 400 });
    }

    const listing = listAsset(
      user.userId,
      asset_type,
      asset_id,
      price,
      license_mode || 'full_copy'
    );

    return NextResponse.json({ success: true, data: listing });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '上架失败' }, { status: 400 });
  }
}
