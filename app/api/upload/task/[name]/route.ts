import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/upload/task/[name]
 * 提供任务附件下载
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const fileName = params.name;

  // 安全检查：防止路径穿越
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return NextResponse.json({ error: '无效的文件名' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), '.uploads', 'tasks', fileName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(fileName).toLowerCase();

    // 根据扩展名设置 Content-Type
    const mimeTypes: Record<string, string> = {
      '.md': 'text/markdown; charset=utf-8',
      '.txt': 'text/plain; charset=utf-8',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.zip': 'application/zip',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[Upload Serve] 读取文件失败:', error);
    return NextResponse.json({ error: '读取文件失败' }, { status: 500 });
  }
}
