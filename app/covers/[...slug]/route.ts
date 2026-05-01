import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const COVERS_DIR = path.join(process.cwd(), 'covers');

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const filename = params.slug.join(path.sep);

  // 安全检查：防止路径遍历
  if (filename.includes('..') || filename.includes('~')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const filePath = path.join(COVERS_DIR, filename);

  try {
    if (!fs.existsSync(filePath)) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    const buffer = fs.readFileSync(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
