import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

interface Props {
  params: Promise<{ id: string }>;
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
