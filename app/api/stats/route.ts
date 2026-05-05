import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 小说总数（未删除）
    const novelCount = (db.prepare('SELECT COUNT(*) as count FROM novels WHERE deleted_at IS NULL').get() as { count: number }).count;

    // 章节总数
    const chapterCount = (db.prepare('SELECT COUNT(*) as count FROM chapters').get() as { count: number }).count;

    // 总字数
    const totalWords = (db.prepare('SELECT COALESCE(SUM(word_count), 0) as total FROM chapters').get() as { total: number }).total;

    // 注册作者数（有作品的用户数）
    const authorCount = (db.prepare('SELECT COUNT(DISTINCT author_id) as count FROM novels WHERE author_id IS NOT NULL AND deleted_at IS NULL').get() as { count: number }).count;

    return NextResponse.json({
      success: true,
      data: {
        totalNovels: novelCount,
        totalChapters: chapterCount,
        totalWords,
        totalAuthors: authorCount
      }
    });
  } catch (error) {
    console.error('Get public stats error:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
