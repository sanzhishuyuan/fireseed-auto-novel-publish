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
    const novel = db.prepare('SELECT deleted_at, id FROM novels WHERE id = ?').get(params.id) as { deleted_at: string | null; id: string } | undefined;
    if (novel?.deleted_at) {
      return NextResponse.json({ success: false, chapters: [], Count: 0 }, { status: 404 });
    }

    // 优先从数据库读取章节（AI API 创建的小说没有文件系统章节）
    if (novel) {
      const dbChapters = db.prepare(`
        SELECT id, title, order_num as "order", branch, word_count, author_id, author_name, choices, custom_branch_enabled, created_at
        FROM chapters WHERE novel_id = ?
        ORDER BY order_num ASC, created_at ASC
      `).all(params.id) as any[];

      if (dbChapters.length > 0) {
        return NextResponse.json({
          success: true,
          chapters: dbChapters,
          Count: dbChapters.length
        });
      }
    }

    // 回退：从文件系统读取（兼容旧版内容目录小说）
    const chapters = getNovelChapters(params.id);
    return NextResponse.json({ success: true, chapters, Count: chapters.length });
  } catch (error) {
    console.error('Get chapters error:', error);
    return NextResponse.json({ success: false, chapters: [], Count: 0 }, { status: 500 });
  }
}

