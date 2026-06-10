import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Props) {
  const admin = requireAdmin(request, 'content.edit');
  if (admin instanceof Response) return admin;

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, content, order, branch, choices } = body;

    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(id) as any;
    if (!chapter) {
      return apiError('NOT_FOUND', '章节不存在', 404);
    }

    const newTitle = title || chapter.title;
    const newContent = content !== undefined ? String(content) : chapter.content;
    const newOrder = order !== undefined ? parseInt(String(order)) : chapter.order_num;
    const newBranch = branch || chapter.branch || 'main';
    const wordCount = newContent.replace(/\s/g, '').length;
    const newChoices = choices !== undefined ? JSON.stringify(choices) : (chapter.choices || '[]');

    db.prepare(`
      UPDATE chapters
      SET title = ?, content = ?, order_num = ?, branch = ?, word_count = ?, choices = ?
      WHERE id = ?
    `).run(newTitle, newContent, newOrder, newBranch, wordCount, newChoices, id);

    // 同步更新文件系统
    const chaptersDir = path.join(process.cwd(), 'content', 'novels', chapter.novel_id, 'chapters');
    if (fs.existsSync(chaptersDir)) {
      const files = fs.readdirSync(chaptersDir);
      const chapterFile = files.find(f => {
        const parsed = path.parse(f);
        return parsed.name.startsWith(String(chapter.order_num) + '-') || f.startsWith(chapter.id);
      });
      if (chapterFile) {
        const filePath = path.join(chaptersDir, chapterFile);
        if (newOrder !== chapter.order_num) {
          const newFileName = `${newOrder}-${chapterFile.replace(/^\d+-/, '')}`;
          const newFilePath = path.join(chaptersDir, newFileName);
          fs.renameSync(filePath, newFilePath);
        }
      }
    }

    return apiSuccess({ message: `章节「${newTitle}」已更新` });
  } catch (error) {
    console.error('Admin update chapter error:', error);
    return apiError('INTERNAL', '更新失败', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const admin = requireAdmin(request, 'content.delete');
  if (admin instanceof Response) return admin;

  const { id } = await params;

  try {
    const chapter = db.prepare('SELECT id, novel_id, title, order_num FROM chapters WHERE id = ?').get(id) as { id: string; novel_id: string; title: string; order_num: number } | undefined;

    if (!chapter) {
      return apiError('NOT_FOUND', '章节不存在', 404);
    }

    // 尝试删除文件系统中的章节文件
    const chaptersDir = path.join(process.cwd(), 'content', 'novels', chapter.novel_id, 'chapters');
    if (fs.existsSync(chaptersDir)) {
      const files = fs.readdirSync(chaptersDir);
      const chapterFile = files.find(f => f.startsWith(`${chapter.order_num}-`));
      if (chapterFile) {
        fs.unlinkSync(path.join(chaptersDir, chapterFile));
      }
    }

    db.prepare('DELETE FROM chapters WHERE id = ?').run(id);

    return apiSuccess({ message: `章节「${chapter.title}」已删除` });
  } catch (error) {
    console.error('Admin delete chapter error:', error);
    return apiError('INTERNAL', '删除失败', 500);
  }
}
