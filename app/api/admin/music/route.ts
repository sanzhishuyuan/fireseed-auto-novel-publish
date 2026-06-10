import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import fs from 'fs';
import path from 'path';

const MUSIC_DIR = '/var/data/ai-novel/music';

// GET: 获取音乐列表
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;

  try {
    if (!fs.existsSync(MUSIC_DIR)) {
      return apiSuccess({ songs: [] });
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

    return apiSuccess({ songs: files });
  } catch (error) {
    console.error('Get music list error:', error);
    return apiError('INTERNAL', '获取失败', 500);
  }
}

// POST: 上传音乐
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('BAD_REQUEST', '请选择音乐文件', 400);
    }

    if (!file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i)) {
      return apiError('BAD_REQUEST', '不支持的音频格式，支持 mp3/wav/ogg/flac/aac/m4a', 400);
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return apiError('BAD_REQUEST', '文件太大，最大 20MB', 400);
    }

    if (!fs.existsSync(MUSIC_DIR)) {
      fs.mkdirSync(MUSIC_DIR, { recursive: true });
    }

    const safeName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(MUSIC_DIR, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return apiSuccess({
      song: {
        name: safeName,
        size: buffer.length,
        url: '/music/' + safeName
      }
    });
  } catch (error) {
    console.error('Upload music error:', error);
    return apiError('INTERNAL', '上传失败', 500);
  }
}

// DELETE: 删除音乐
export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;

  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');

    if (!fileName) {
      return apiError('BAD_REQUEST', '缺少文件名', 400);
    }

    const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(MUSIC_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return apiError('NOT_FOUND', '文件不存在', 404);
    }

    fs.unlinkSync(filePath);

    return apiSuccess({ message: '已删除' });
  } catch (error) {
    console.error('Delete music error:', error);
    return apiError('INTERNAL', '删除失败', 500);
  }
}
