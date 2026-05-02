import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

interface Props {
  params: Promise<{ id: string }>;
}

function requireAdmin() {
  return async (_request: NextRequest) => {
    const cookieStore = await cookies();
    if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    return null;
  };
}

export async function PUT(request: NextRequest, { params }: Props) {
  const authError = await requireAdmin()(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, content, order, branch, choices } = body;

    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(id) as any;
    if (!chapter) {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 });
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
        // 如果改动了排序号，需要重命名文件
        if (newOrder !== chapter.order_num) {
          const newFileName = `${newOrder}-${chapterFile.replace(/^\d+-/, '')}`;
          const newFilePath = path.join(chaptersDir, newFileName);
          fs.renameSync(filePath, newFilePath);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `章节「${newTitle}」已更新`
    });
  } catch (error) {
    console.error('Admin update chapter error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    // 查找章节
    const chapter = db.prepare('SELECT id, novel_id, title, order_num FROM chapters WHERE id = ?').get(id) as { id: string; novel_id: string; title: string; order_num: number } | undefined;

    if (!chapter) {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 });
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

    // 从数据库删除
    db.prepare('DELETE FROM chapters WHERE id = ?').run(id);

    return NextResponse.json({
      success: true,
      message: `章节「${chapter.title}」已删除`
    });
  } catch (error) {
    console.error('Admin delete chapter error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
