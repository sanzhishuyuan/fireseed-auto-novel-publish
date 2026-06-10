import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export const POST = withRoute({ auth: 'admin', permission: 'content.create', body: true }, async (request, ctx: AdminContext) => {
  const { id: novelId } = ctx.params!;
  const { title, content, order, branch, choices } = ctx.body;
  const chapterId = `${order}-${Date.now()}`;

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

  return apiSuccess({ chapterId });
});
