import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const MUSIC_DIR = '/var/data/ai-novel/music';

function requireAdmin() {
  return async () => {
    const cookieStore = await cookies();
    if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    return null;
  };
}

// GET: 获取音乐列表
export async function GET() {
  const authError = await requireAdmin()();
  if (authError) return authError;

  try {
    if (!fs.existsSync(MUSIC_DIR)) {
      return NextResponse.json({ success: true, songs: [] });
    }

    const files = fs.readdirSync(MUSIC_DIR)
      .filter(f => /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(MUSIC_DIR, f));
        return {
          name: f,
          size: stat.size,
          sizeText: stat.size > 1024 * 1024
            ? (stat.size / 1024 / 1024).toFixed(1) + 'MB'
            : (stat.size / 1024).toFixed(0) + 'KB',
          url: '/music/' + f,
          modified: stat.mtime.toISOString()
        };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));

    return NextResponse.json({ success: true, songs: files });
  } catch (error) {
    console.error('Get music list error:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// POST: 上传音乐
export async function POST(request: NextRequest) {
  const authError = await requireAdmin()();
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择音乐文件' }, { status: 400 });
    }

    if (!file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i)) {
      return NextResponse.json({ error: '不支持的音频格式，支持 mp3/wav/ogg/flac/aac/m4a' }, { status: 400 });
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: '文件太大，最大 20MB' }, { status: 400 });
    }

    if (!fs.existsSync(MUSIC_DIR)) {
      fs.mkdirSync(MUSIC_DIR, { recursive: true });
    }

    // 避免文件名冲突，加时间戳前缀
    const safeName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(MUSIC_DIR, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      song: {
        name: safeName,
        size: buffer.length,
        url: '/music/' + safeName
      }
    });
  } catch (error) {
    console.error('Upload music error:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}

// DELETE: 删除音乐
export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin()();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');

    if (!fileName) {
      return NextResponse.json({ error: '缺少文件名' }, { status: 400 });
    }

    const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(MUSIC_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    fs.unlinkSync(filePath);

    return NextResponse.json({ success: true, message: '已删除' });
  } catch (error) {
    console.error('Delete music error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
