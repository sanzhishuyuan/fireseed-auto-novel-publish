import { NextResponse } from 'next/server';
import { getNovelMeta, getAllNovelIds } from '@/lib/novels';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const novel = getNovelMeta(params.id);
    
    if (!novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    return NextResponse.json(novel);
  } catch (error) {
    console.error('Get novel error:', error);
    return NextResponse.json({ error: '获取小说失败' }, { status: 500 });
  }
}
