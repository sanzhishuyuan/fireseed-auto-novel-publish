import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const COVERS_DIR = path.resolve(process.cwd(), 'covers');

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

  // 路径遍历防护：确保解析后的路径在 COVERS_DIR 内
  const resolvedPath = path.resolve(COVERS_DIR, filename);
  if (!resolvedPath.startsWith(COVERS_DIR + path.sep) && resolvedPath !== COVERS_DIR) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const filePath = resolvedPath;

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
