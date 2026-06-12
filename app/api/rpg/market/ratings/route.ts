/**
 * POST /api/rpg/market/ratings — 提交评价
 * GET /api/rpg/market/ratings?userId=xxx — 查看创作者评价
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { submitRating, getCreatorRatings } from '@/lib/rpg/economy';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const body = await request.json();
    const { listing_id, rating, review } = body;

    if (!listing_id || !rating) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }

    submitRating(listing_id, user.userId, rating, review);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '评价失败' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少 userId 参数' }, { status: 400 });
    }

    const result = getCreatorRatings(userId, page, limit);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '获取评价失败' }, { status: 500 });
  }
}
