import { NextRequest, NextResponse } from 'next/server';
import { getNovelChapters } from '@/lib/novels';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const chapters = getNovelChapters(id);
  return NextResponse.json({ chapters });
}
