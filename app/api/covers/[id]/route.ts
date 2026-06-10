import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { withRoute } from '@/lib/with-route';

const COVERS_DIR = '/var/data/ai-novel/covers';

const MIME_MAP: Record<string, string> = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'webp': 'image/webp',
  'gif': 'image/gif',
};

export const GET = withRoute({ auth: 'none' }, async (_request: NextRequest, ctx) => {
  try {
    const { id } = ctx.params!;
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');

    for (const ext of ['webp', 'jpg', 'jpeg', 'png', 'gif']) {
      const filePath = path.join(COVERS_DIR, `${safeId}.${ext}`);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const mimeType = MIME_MAP[ext] || 'image/webp';
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    return NextResponse.json({ error: '封面不存在' }, { status: 404 });
  } catch (error) {
    console.error('Get cover error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
});
