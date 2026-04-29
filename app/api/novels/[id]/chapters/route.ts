import { NextResponse } from 'next/server';
import { getNovelChapters } from '@/lib/novels';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 检查小说是否已删除
    const novel = db.prepare('SELECT deleted_at FROM novels WHERE id = ?').get(params.id) as { deleted_at: string | null } | undefined;
    if (novel?.deleted_at) {
      return NextResponse.json({ success: false, chapters: [], Count: 0 }, { status: 404 });
    }

    const chapters = getNovelChapters(params.id);
    return NextResponse.json({ success: true, chapters, Count: chapters.length });
  } catch (error) {
    console.error('Get chapters error:', error);
    return NextResponse.json({ success: false, chapters: [], Count: 0 }, { status: 500 });
  }
}
