import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 小说总数（未删除）
    const novelCount = (db.prepare('SELECT COUNT(*) as count FROM novels WHERE deleted_at IS NULL').get() as { count: number }).count;

    // 章节总数
    const chapterCount = (db.prepare('SELECT COUNT(*) as count FROM chapters c INNER JOIN novels n ON c.novel_id = n.id WHERE n.deleted_at IS NULL').get() as { count: number }).count;

    // 总字数 — 优先用 word_count 列，降级为章节数 × 2000 估算
    let totalWords = 0;
    try {
      totalWords = (db.prepare('SELECT COALESCE(SUM(c.word_count), 0) as total FROM chapters c INNER JOIN novels n ON c.novel_id = n.id WHERE n.deleted_at IS NULL').get() as { total: number }).total;
    } catch {
      totalWords = chapterCount * 2000;
    }
    if (totalWords === 0 && chapterCount > 0) {
      totalWords = chapterCount * 2000;
    }

    // 注册作者数 — 优先用 author_id，降级用 author 文本字段去重
    let authorCount = 0;
    try {
      authorCount = (db.prepare(
        "SELECT COUNT(DISTINCT author_id) as count FROM novels WHERE author_id IS NOT NULL AND author_id != '' AND deleted_at IS NULL"
      ).get() as { count: number }).count;
    } catch {
      // author_id 列可能不存在
    }
    if (authorCount === 0) {
      try {
        authorCount = (db.prepare(
          "SELECT COUNT(DISTINCT author) as count FROM novels WHERE author IS NOT NULL AND author != '' AND author != 'FireSeed AI' AND deleted_at IS NULL"
        ).get() as { count: number }).count;
      } catch {
        // 忽略
      }
    }

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
