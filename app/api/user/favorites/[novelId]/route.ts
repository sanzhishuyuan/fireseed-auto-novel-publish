import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 检查单个小说的收藏状态（soft-fail：未登录返回 false）
export async function GET(
  request: NextRequest,
  { params }: { params: { novelId: string } }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ isFavorite: false });
    }

    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND novel_id = ?')
      .get(userId, params.novelId);

    return NextResponse.json({ isFavorite: !!existing });
  } catch (error) {
    console.error('Check favorite error:', error);
    return NextResponse.json({ isFavorite: false });
  }
}
