import { NextResponse } from 'next/server';
import { getAllNovelIds } from '@/lib/novels';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 从数据库读取所有未删除的小说
    const dbNovels = db.prepare(`
      SELECT 
        n.id, n.title, n.author, n.description, n.status, n.tags, 
        n.created_at, n.updated_at,
        COUNT(c.id) as chapter_count
      FROM novels n
      LEFT JOIN chapters c ON n.id = c.novel_id
      WHERE n.deleted_at IS NULL
      GROUP BY n.id
      ORDER BY n.updated_at DESC
    `).all() as any[];

    // 2. 从文件系统读取小说（兼容旧版内容目录）
    const fileNovels = getAllNovelIds();
    const fileNovelIds = new Set(fileNovels.map(n => n.id));

    // 3. 合并数据：数据库优先，文件系统补充
    const novelsMap = new Map<string, any>();

    // 先加入数据库小说
    for (const novel of dbNovels) {
      novelsMap.set(novel.id, {
        id: novel.id,
        title: novel.title,
        author: novel.author || 'Spark AI',
        description: novel.description || '',
        tags: novel.tags || '',
        status: novel.status || 'ongoing',
        chapterCount: novel.chapter_count || 0,
        created_at: novel.created_at,
        updated_at: novel.updated_at
      });
    }

    // 再加入文件系统小说（排除已在数据库中的）
    for (const novel of fileNovels) {
      if (!novelsMap.has(novel.id)) {
        const chapters = db.prepare(`
          SELECT COUNT(*) as count FROM chapters WHERE novel_id = ?
        `).get(novel.id) as { count: number } | undefined;

        novelsMap.set(novel.id, {
          id: novel.id,
          title: novel.title || novel.id,
          author: novel.author || 'Spark AI',
          description: novel.description || '',
          tags: novel.tags || '',
          status: novel.status || 'ongoing',
          chapterCount: chapters?.count || 0,
          updatedAt: novel.updated_at || new Date().toISOString()
        });
      }
    }

    const novels = Array.from(novelsMap.values()).filter(n => n.title);

    return NextResponse.json({ success: true, novels });
  } catch (error) {
    console.error('Get novels error:', error);
    return NextResponse.json({ success: false, novels: [] }, { status: 500 });
  }
}
