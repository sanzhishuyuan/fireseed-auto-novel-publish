import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ novelId: string }>;
}

// 验证 AI Token
function verifyAIToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const record = db.prepare('SELECT id FROM ai_tokens WHERE token = ? AND is_active = 1').get(token);
  if (!record) return false;
  db.prepare('UPDATE ai_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
  return true;
}

// GET /api/ai/novels/[novelId]/chapters - 获取章节列表
export async function GET(request: NextRequest, { params }: Params) {
  if (!verifyAIToken(request)) {
    return NextResponse.json({ error: '无效的 AI Token' }, { status: 401 });
  }

  const { novelId } = await params;
  const chapters = db.prepare(
    'SELECT * FROM chapters WHERE novel_id = ? ORDER BY order_num ASC'
  ).all(novelId);

  return NextResponse.json({ success: true, chapters });
}

// POST /api/ai/novels/[novelId]/chapters - 发布章节（含分歧选项）
export async function POST(request: NextRequest, { params }: Params) {
  if (!verifyAIToken(request)) {
    return NextResponse.json({ error: '无效的 AI Token' }, { status: 401 });
  }

  const { novelId } = await params;

  try {
    const body = await request.json();
    const {
      title,
      content,
      order,
      branch = 'main',
      choices = [],        // [{text: "选项A", branch: "branch-a"}, ...]
      custom_branch_enabled = false  // 是否允许用户自定义剧情走向
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: '章节标题和内容不能为空' }, { status: 400 });
    }

    // 确认小说存在
    const novel = db.prepare('SELECT id FROM novels WHERE id = ?').get(novelId);
    if (!novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    const chapterId = `${order || Date.now()}-${Date.now()}`;
    const dbChapterId = uuidv4();
    const wordCount = content.replace(/\s/g, '').length;

    // 构建 choices 元数据（支持自定义分歧）
    const finalChoices = [...choices];
    if (custom_branch_enabled) {
      finalChoices.push({
        text: '✍️ 自定义剧情走向（由读者续写）',
        branch: 'custom',
        is_custom: true
      });
    }

    // 写入文件系统
    const chaptersDir = path.join(process.cwd(), 'content', 'novels', novelId, 'chapters');
    fs.mkdirSync(chaptersDir, { recursive: true });

    const meta = {
      title,
      book: novelId,
      order: parseInt(String(order)) || 1,
      branch,
      choices: finalChoices,
      custom_branch_enabled,
      word_count: wordCount,
      created_at: new Date().toISOString()
    };

    const fileContent = matter.stringify(content, meta);
    fs.writeFileSync(path.join(chaptersDir, `${chapterId}.md`), fileContent, 'utf-8');

    // 写入数据库
    db.prepare(`
      INSERT INTO chapters (id, novel_id, title, content, order_num, branch, word_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(dbChapterId, novelId, title, content, order || 1, branch, wordCount);

    // 更新小说 updated_at
    db.prepare('UPDATE novels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(novelId);

    return NextResponse.json({
      success: true,
      chapterId,
      dbChapterId,
      title,
      wordCount,
      choices: finalChoices,
      novelUrl: `${process.env.NEXT_PUBLIC_URL || 'https://fireseed.online'}/novels/${novelId}`
    });
  } catch (error) {
    console.error('AI publish chapter error:', error);
    return NextResponse.json({ error: '发布失败', detail: String(error) }, { status: 500 });
  }
}
