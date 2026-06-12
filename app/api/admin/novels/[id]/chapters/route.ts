import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { logAdminAction } from '@/lib/audit';

export const POST = withRoute({ auth: 'admin', permission: 'content.create', body: true }, async (request, ctx: AdminContext) => {
  const { id: novelId } = ctx.params!;
  const { title, content, order, branch, choices } = ctx.body;
  const chapterId = `${order}-${Date.now()}`;

  // 获取小说信息用于审计
  const novel = db.prepare('SELECT title FROM novels WHERE id = ?').get(novelId) as { title: string } | undefined;

  // 保存到文件系统
  const chaptersDir = path.join(process.cwd(), 'content', 'novels', novelId, 'chapters');
  fs.mkdirSync(chaptersDir, { recursive: true });

  const meta = {
    title,
    book: novelId,
    order: parseInt(order),
    branch: branch || 'main',
    choices: choices || []
  };

  const fileContent = matter.stringify(content, meta);
  const filePath = path.join(chaptersDir, `${chapterId}.md`);
  fs.writeFileSync(filePath, fileContent, 'utf-8');

  // 保存到数据库
  const dbChapterId = uuidv4();
  const choicesJson = JSON.stringify(choices || []);
  db.prepare(`
    INSERT INTO chapters (id, novel_id, title, content, order_num, branch, word_count, choices)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(dbChapterId, novelId, title, content, order, branch || 'main', content?.length || 0, choicesJson);

  // 审计日志
  try {
    logAdminAction({
      adminId: ctx.admin.id,
      adminUsername: ctx.admin.username,
      action: 'create_chapter',
      targetType: 'chapter',
      targetId: dbChapterId,
      detail: { novelId, novelTitle: novel?.title, chapterTitle: title, order },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
  } catch (e) {
    console.warn('审计日志写入失败:', e);
  }

  return apiSuccess({ chapterId: dbChapterId });
});
