import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id: novelId } = await params;
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const { title, content, order, branch, choices } = await request.json();
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
    db.prepare(`
      INSERT INTO chapters (id, novel_id, title, content, order_num, branch, word_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(dbChapterId, novelId, title, content, order, branch || 'main', content?.length || 0);

    return NextResponse.json({ success: true, chapterId });
  } catch (error) {
    console.error('Create chapter error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
