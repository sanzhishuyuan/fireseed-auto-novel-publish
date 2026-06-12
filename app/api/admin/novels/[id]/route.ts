import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logAdminAction } from '@/lib/audit';

const COVERS_DIR = '/var/data/ai-novel/covers';

export const PUT = withRoute({ auth: 'admin', permission: 'content.edit', body: true }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;

  // 检查小说是否存在
  const novel = db.prepare('SELECT id, cover_url FROM novels WHERE id = ?').get(id) as any;
  if (!novel) {
    return apiError('NOT_FOUND', '小说不存在', 404);
  }

  const { title, author, description, tags, status, cover_image } = ctx.body;

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
      return apiError('BAD_REQUEST', '图片太大（最大5MB）', 400);
    }

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
    return apiError('BAD_REQUEST', '没有要更新的字段', 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  const sql = `UPDATE novels SET ${updates.join(', ')} WHERE id = ?`;
  values.push(id);

  db.prepare(sql).run(...values);

  // 审计日志
  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'edit_novel',
      targetType: 'novel',
      targetId: id,
      detail: { updatedFields: Object.keys(ctx.body).filter(k => k !== 'cover_image') },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
  } catch (e) {
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({ cover_url: newCoverUrl });
});

export const GET = withRoute({ auth: 'admin', permission: 'content.view' }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;

  const novel = db.prepare('SELECT * FROM novels WHERE id = ?').get(id) as any;
  if (!novel) {
    return apiError('NOT_FOUND', '小说不存在', 404);
  }

  return apiSuccess(novel);
});

export const DELETE = withRoute({ auth: 'admin', permission: 'content.delete' }, async (request, ctx: AdminContext) => {
  const { id } = ctx.params!;

  const novel = db.prepare('SELECT id, title, retention_days FROM novels WHERE id = ?').get(id) as { id: string; title: string; retention_days: number } | undefined;

  if (novel) {
    const now = new Date().toISOString();
    const retentionDays = novel.retention_days || 7;

    db.prepare(`
      UPDATE novels
      SET deleted_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(now, id);

    // 审计日志
    try {
      logAdminAction({
        adminId: ctx.admin.id,
        adminUsername: ctx.admin.username,
        action: 'delete_novel',
        targetType: 'novel',
        targetId: id,
        detail: { title: novel.title, retentionDays, method: 'soft_delete' },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      });
    } catch (e) {
      console.warn('审计日志写入失败:', e);
    }

    return apiSuccess({
      message: `小说「${novel.title}」已标记为删除，将在 ${retentionDays} 天后自动清理`
    });
  }

  // 没有数据库记录 → 文件系统孤立小说
  const contentDir = path.join(process.cwd(), 'content', 'novels');
  const novelDir = path.join(contentDir, id);

  if (!fs.existsSync(novelDir)) {
    return apiError('NOT_FOUND', '小说不存在', 404);
  }

  fs.rmSync(novelDir, { recursive: true });

  // 审计日志
  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'delete_novel',
      targetType: 'novel',
      targetId: id,
      detail: { method: 'filesystem_orphan' },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
  } catch (e) {
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({ message: `文件系统小说「${id}」已永久删除` });
});
