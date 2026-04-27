import { NextResponse } from 'next/server';
import { getAllNovelIds, getNovelChapters } from '@/lib/novels';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const novelList = getAllNovelIds();
    
    const novels = novelList.map(novel => {
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

    return NextResponse.json(novels);
  } catch (error) {
    console.error('Get novels error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
