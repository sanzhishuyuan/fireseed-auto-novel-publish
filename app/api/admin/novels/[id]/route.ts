import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const COVERS_DIR = '/var/data/ai-novel/covers';

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Props) {
  const { id } = await params;

  const admin = requireAdmin(request, 'content.edit');
  if (admin instanceof Response) return admin;

  try {
    // 检查小说是否存在
    const novel = db.prepare('SELECT id, cover_url FROM novels WHERE id = ?').get(id) as any;
    if (!novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    const body = await request.json();
    const { title, author, description, tags, status, cover_image } = body;

    // 构建更新字段
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (author !== undefined) {
      updates.push('author = ?');
      values.push(author);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(tags);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    // 处理封面上传（base64）
    let newCoverUrl: string | null = null;
    if (cover_image) {
      let base64Data = cover_image;
      let mimeType = 'image/webp';
      const match = cover_image.match(/^data:(image\/\w+);base64,([\s\S]+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }

      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return NextResponse.json({ error: '图片太大（最大5MB）' }, { status: 400 });
      }

      // 确保目录存在
      if (!fs.existsSync(COVERS_DIR)) {
        fs.mkdirSync(COVERS_DIR, { recursive: true });
      }

      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg', 'image/jpg': 'jpg',
        'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
      };
      const ext = extMap[mimeType] || 'webp';
      const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeId}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const filePath = path.join(COVERS_DIR, filename);

      fs.writeFileSync(filePath, buffer);
      newCoverUrl = `/covers/${filename}`;

      updates.push('cover_url = ?');
      values.push(newCoverUrl);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE novels SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    db.prepare(sql).run(...values);

    return NextResponse.json({
      success: true,
      cover_url: newCoverUrl
    });
  } catch (error) {
    console.error('Update novel error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;

  const admin = requireAdmin(request, 'content.view');
  if (admin instanceof Response) return admin;

  try {
    const novel = db.prepare('SELECT * FROM novels WHERE id = ?').get(id) as any;
    if (!novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: novel });
  } catch (error) {
    console.error('Get novel error:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params;

  const admin = requireAdmin(request, 'content.delete');
  if (admin instanceof Response) return admin;

  try {
    const novel = db.prepare('SELECT id, title, retention_days FROM novels WHERE id = ?').get(id) as { id: string; title: string; retention_days: number } | undefined;

    if (novel) {
      const now = new Date().toISOString();
      const retentionDays = novel.retention_days || 7;

      db.prepare(`
        UPDATE novels
        SET deleted_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(now, id);

      return NextResponse.json({
        success: true,
        message: `小说「${novel.title}」已标记为删除，将在 ${retentionDays} 天后自动清理`
      });
    }

    // 没有数据库记录 → 文件系统孤立小说
    const contentDir = path.join(process.cwd(), 'content', 'novels');
    const novelDir = path.join(contentDir, id);

    if (!fs.existsSync(novelDir)) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    fs.rmSync(novelDir, { recursive: true });

    return NextResponse.json({
      success: true,
      message: `文件系统小说「${id}」已永久删除`
    });
  } catch (error) {
    console.error('Admin delete novel error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
