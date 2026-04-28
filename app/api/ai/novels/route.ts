import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export const dynamic = 'force-dynamic';

// 验证 AI Token
function verifyAIToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const record = db.prepare('SELECT id FROM ai_tokens WHERE token = ? AND is_active = 1').get(token);
  if (!record) return false;
  // 更新最后使用时间
  db.prepare('UPDATE ai_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
  return true;
}

// GET /api/ai/novels - 获取所有小说列表
export async function GET(request: NextRequest) {
  if (!verifyAIToken(request)) {
    return NextResponse.json({ error: '无效的 AI Token' }, { status: 401 });
  }

  const novels = db.prepare('SELECT * FROM novels ORDER BY created_at DESC').all();
  return NextResponse.json({ success: true, novels });
}

// POST /api/ai/novels - 创建新小说
export async function POST(request: NextRequest) {
  if (!verifyAIToken(request)) {
    return NextResponse.json({ error: '无效的 AI Token' }, { status: 401 });
  }

  try {
    const { id: customId, title, author, description, status, tags, cover_url } = await request.json();

    if (!title) {
      return NextResponse.json({ error: '小说标题不能为空' }, { status: 400 });
    }

    // 支持自定义 ID（便于技能端管理），否则生成 UUID
    const novelId = customId || uuidv4();

    // 检查 ID 是否已存在
    const existing = db.prepare('SELECT id FROM novels WHERE id = ?').get(novelId);
    if (existing) {
      return NextResponse.json({ error: '小说ID已存在', id: novelId }, { status: 409 });
    }

    // 写入数据库
    db.prepare(`
      INSERT INTO novels (id, title, author, description, cover_url, status, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      novelId,
      title,
      author || 'AI创作',
      description || '',
      cover_url || '',
      status || 'ongoing',
      tags || ''
    );

    // 创建文件目录
    const novelsDir = path.join(process.cwd(), 'content', 'novels', novelId);
    fs.mkdirSync(path.join(novelsDir, 'chapters'), { recursive: true });
    fs.mkdirSync(path.join(novelsDir, 'branches'), { recursive: true });

    // 写入 meta.md
    const metaContent = matter.stringify('', {
      title,
      author: author || 'AI创作',
      description: description || '',
      cover_url: cover_url || '',
      status: status || 'ongoing',
      tags: tags || '',
      created_at: new Date().toISOString()
    });
    fs.writeFileSync(path.join(novelsDir, 'meta.md'), metaContent, 'utf-8');

    return NextResponse.json({ success: true, id: novelId, title });
  } catch (error) {
    console.error('AI create novel error:', error);
    return NextResponse.json({ error: '创建失败', detail: String(error) }, { status: 500 });
  }
}
