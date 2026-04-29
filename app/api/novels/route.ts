import { NextResponse } from 'next/server';
import { getAllNovelIds, getNovelChapters } from '@/lib/novels';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const novelList = getAllNovelIds();
    
    // 获取已软删除的小说ID列表
    const deletedNovels = db.prepare('SELECT id FROM novels WHERE deleted_at IS NOT NULL').all() as { id: string }[];
    const deletedIds = new Set(deletedNovels.map(n => n.id));

    const novels = novelList
      .filter(novel => !deletedIds.has(novel.id))
      .map(novel => {
        const chapters = getNovelChapters(novel.id);
        const chapterCount = chapters.filter(c => c.meta.branch === 'main').length;
        
        return {
          id: novel.id,
          title: novel.title,
          author: novel.author,
          description: novel.description,
          tags: novel.tags,
          status: novel.status,
          chapterCount
        };
      }).filter(n => n.title);

    return NextResponse.json({ success: true, novels });
  } catch (error) {
    console.error('Get novels error:', error);
    return NextResponse.json({ success: false, novels: [] }, { status: 500 });
  }
}
