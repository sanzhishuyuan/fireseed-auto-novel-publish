import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { safeParseJSON } from '@/lib/request-parser';

export async function GET() {
  const cookieStore = await cookies();
  const admin = requireAdmin(request, 'content.view');
  if (admin instanceof Response) return admin;
  }

  const novels = db.prepare('SELECT * FROM novels ORDER BY created_at DESC').all();
  return NextResponse.json({ novels });
}

export async function POST(request: NextRequest) {
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

    const { title, author, description, status, tags } = parsed.data;
    const id = uuidv4();

    // 保存到数据库
    db.prepare(`
      INSERT INTO novels (id, title, author, description, status, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, author || '', description || '', status || 'ongoing', tags || '');

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
      created_at: new Date().toISOString()
    });
    fs.writeFileSync(path.join(novelsDir, 'meta.md'), meta);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Create novel error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
