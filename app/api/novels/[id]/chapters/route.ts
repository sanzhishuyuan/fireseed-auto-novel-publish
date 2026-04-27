import { NextResponse } from 'next/server';
import { getNovelChapters } from '@/lib/novels';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const chapters = getNovelChapters(params.id);
    return NextResponse.json(chapters);
  } catch (error) {
    console.error('Get chapters error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
