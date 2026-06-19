import { NextRequest, NextResponse } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { logAdminAction } from '@/lib/audit';

export const GET = withRoute({ auth: 'admin', permission: 'content.view' }, async (request, ctx: AdminContext) => {
  const novels = db.prepare('SELECT * FROM novels ORDER BY created_at DESC').all();
  return NextResponse.json({ novels });
});

export const POST = withRoute({ auth: 'admin', permission: 'content.create', body: true }, async (request, ctx: AdminContext) => {
  const { title, author, description, status, tags, category } = ctx.body;
  const id = uuidv4();

  // 保存到数据库
  db.prepare(`
    INSERT INTO novels (id, title, author, description, status, tags, category)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, author || '', description || '', status || 'ongoing', tags || '', category || '');

  // 创建小说内容目录
  const novelsDir = path.join(process.cwd(), 'content', 'novels', id);
  fs.mkdirSync(novelsDir, { recursive: true });
  fs.mkdirSync(path.join(novelsDir, 'chapters'), { recursive: true });
  fs.mkdirSync(path.join(novelsDir, 'branches'), { recursive: true });

  // 创建meta.md
  const meta = matter.stringify('', {
    title,
    author,
    description,
    status,
    tags,
    category,
    created_at: new Date().toISOString()
  });
  fs.writeFileSync(path.join(novelsDir, 'meta.md'), meta);

  // 审计日志
  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'create_novel',
      targetType: 'novel',
      targetId: id,
      detail: { title, author },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
  } catch (e) {
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({ id });
});
