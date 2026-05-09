import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { safeParseJSON } from '@/lib/request-parser';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id: novelId } = await params;
  const cookieStore = await cookies();
  const admin = requireAdmin(request, 'content.create');
  if (admin instanceof Response) return admin;
  }

  try {
    // 修复: request.json() 解析异常兼容
    const bodyText = await request.text();

    // 安全解析 JSON，非法请求体返回 400 而非 500
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;

    const { title, content, order, branch, choices } = parsed.data;
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

    return NextResponse.json({ success: true, chapterId });
  } catch (error) {
    console.error('Create chapter error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
