import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ novelId: string }>;
}

// 验证 AI Token（支持 JWT / user_tokens / ai_tokens）
function verifyAIToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);

  // 1. 优先验证 JWT Token
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    // JWT 无效，继续
  }

  // 2. 检查 user_tokens
  const userToken = db.prepare(
    'SELECT id FROM user_tokens WHERE token = ? AND is_active = 1'
  ).get(token);
  if (userToken) {
    db.prepare('UPDATE user_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
    return true;
  }

  // 3. 兼容旧 ai_tokens
  const record = db.prepare('SELECT id FROM ai_tokens WHERE token = ? AND is_active = 1').get(token);
  if (!record) return false;
  db.prepare('UPDATE ai_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
  return true;
}

/**
 * POST /api/ai/novels/[novelId]/branches
 * 发布支线章节内容（对应某个分歧选项的剧情分支）
 * 
 * body:
 *   branch: string         - 分支名称（对应 choices 中的 branch 字段）
 *   title: string          - 章节标题
 *   content: string        - 章节正文（Markdown）
 *   choices?: array        - 下一步分歧选项
 *   custom_branch_enabled?: boolean - 是否允许读者自定义续写
 */
export async function POST(request: NextRequest, { params }: Params) {
  // P0-4: AI 发布接口速率限制（每分钟最多30次）
  const rateLimit = checkRateLimit(request, undefined, 'aiWrite');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  if (!verifyAIToken(request)) {
    return NextResponse.json({ error: '无效的 AI Token' }, { status: 401 });
  }

  const { novelId } = await params;

  try {
    const body = await request.json();
    const {
      branch,
      title,
      content,
      choices = [],
      custom_branch_enabled = false
    } = body;

    if (!branch || !title || !content) {
      return NextResponse.json({ error: 'branch、title、content 均为必填' }, { status: 400 });
    }

    const novel = db.prepare('SELECT id FROM novels WHERE id = ?').get(novelId);
    if (!novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    const finalChoices = [...choices];
    if (custom_branch_enabled) {
      finalChoices.push({
        text: '✍️ 自定义剧情走向（由读者续写）',
        branch: 'custom',
        is_custom: true
      });
    }

    // 写入 branches 目录
    const branchesDir = path.join(process.cwd(), 'content', 'novels', novelId, 'branches');
    fs.mkdirSync(branchesDir, { recursive: true });

    const meta = {
      title,
      book: novelId,
      branch,
      choices: finalChoices,
      custom_branch_enabled,
      word_count: content.replace(/\s/g, '').length,
      created_at: new Date().toISOString()
    };

    const fileContent = matter.stringify(content, meta);
    fs.writeFileSync(path.join(branchesDir, `${branch}.md`), fileContent, 'utf-8');

    // 写入数据库
    db.prepare(`
      INSERT INTO chapters (id, novel_id, title, content, order_num, branch, word_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), novelId, title, content, 0, branch,
      content.replace(/\s/g, '').length
    );

    db.prepare('UPDATE novels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(novelId);

    return NextResponse.json({
      success: true,
      branch,
      title,
      branchUrl: `${process.env.NEXT_PUBLIC_URL || 'https://fireseed.online'}/novels/${novelId}?branch=${branch}`
    });
  } catch (error) {
    console.error('AI publish branch error:', error);
    return NextResponse.json({ error: '支线发布失败' }, { status: 500 });
  }
}
