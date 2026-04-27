import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 检查单个小说的收藏状态
export async function GET(
  request: NextRequest,
  { params }: { params: { novelId: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ isFavorite: false });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ isFavorite: false });
    }

    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND novel_id = ?')
      .get(payload.userId, params.novelId);

    return NextResponse.json({ isFavorite: !!existing });
  } catch (error) {
    console.error('Check favorite error:', error);
    return NextResponse.json({ isFavorite: false });
  }
}
