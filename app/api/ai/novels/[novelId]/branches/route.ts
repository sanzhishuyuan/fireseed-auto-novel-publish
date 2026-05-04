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

// 验证并提取用户信息
function verifyAndGetUser(request: NextRequest): { valid: boolean; userId?: string; username?: string } {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { valid: false };
  const token = authHeader.slice(7);

  // 1. JWT Token
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    return { valid: true, userId: decoded.userId, username: decoded.username };
  } catch { /* 继续 */ }

  // 2. user_tokens
  const userToken = db.prepare(
    'SELECT ut.user_id, u.username FROM user_tokens ut JOIN users u ON ut.user_id = u.id WHERE ut.token = ? AND ut.is_active = 1'
  ).get(token) as { user_id: string; username: string } | undefined;
  if (userToken) {
    db.prepare('UPDATE user_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
    return { valid: true, userId: userToken.user_id, username: userToken.username };
  }

  // 3. ai_tokens
  const record = db.prepare('SELECT id FROM ai_tokens WHERE token = ? AND is_active = 1').get(token);
  if (record) {
    db.prepare('UPDATE ai_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
    return { valid: true, userId: undefined, username: 'AI 作者' };
  }

  return { valid: false };
}

/**
 * POST /api/ai/novels/[novelId]/branches
 * 发布支线章节（任何有效 AI Token 均可为任何小说写分支）
 * 
 * body:
 *   branch: string           - 分支标识（如 'trust', 'caution'）
 *   branch_title: string     - 分支显示名称（如 '信任线', '警惕线'）
 *   title: string            - 章节标题
 *   content: string          - 章节正文（Markdown，至少1500字）
 *   choices?: array          - 下一步分歧选项
 *   custom_branch_enabled?: boolean
 *   source_chapter_id?: string - 从哪个章节分歧（可选）
 *   source_choice_text?: string - 分歧选项的文字
 */
export async function POST(request: NextRequest, { params }: Params) {
  const rateLimit = checkRateLimit(request, undefined, 'aiWrite');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  const user = verifyAndGetUser(request);
  if (!user.valid) {
    return NextResponse.json({ error: '无效的 AI Token' }, { status: 401 });
  }

  const { novelId } = await params;

  try {
    const body = await request.json();
    const {
      branch, branch_title, title, content,
      choices = [], custom_branch_enabled = false,
      source_chapter_id, source_choice_text
    } = body;

    if (!branch || !title || !content) {
      return NextResponse.json({ error: 'branch、title、content 均为必填' }, { status: 400 });
    }

    // 字数校验
    const contentStr = String(content);
    const wordCount = contentStr.replace(/\s/g, '').length;
    if (wordCount < 1500) {
      return NextResponse.json({
        error: '章节字数不足',
        detail: `分支章节至少 1500 字，当前字数：${wordCount}`,
        current_word_count: wordCount,
        minimum_required: 1500
      }, { status: 400 });
    }

    const novel = db.prepare('SELECT id, author, author_id FROM novels WHERE id = ?').get(novelId) as any;
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

    // 分支显示名称
    const displayName = branch_title || branch;

    // 写入 branches 目录
    const branchesDir = path.join(process.cwd(), 'content', 'novels', novelId, 'branches');
    fs.mkdirSync(branchesDir, { recursive: true });

    const meta = {
      title, book: novelId, branch,
      choices: finalChoices, custom_branch_enabled,
      word_count: wordCount,
      author_id: user.userId,
      author_name: user.username,
      created_at: new Date().toISOString()
    };

    const fileContent = matter.stringify(contentStr, meta);
    fs.writeFileSync(path.join(branchesDir, `${branch}.md`), fileContent, 'utf-8');

    // 写入 chapters 表（含作者信息）
    const dbChapterId = uuidv4();
    db.prepare(`
      INSERT INTO chapters (id, novel_id, title, content, order_num, branch, word_count, choices, custom_branch_enabled, author_id, author_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      dbChapterId, novelId, title, contentStr, 0, branch,
      wordCount, JSON.stringify(finalChoices), custom_branch_enabled ? 1 : 0,
      user.userId || null, user.username || ''
    );

    // 写入/更新 branches 元数据表
    const existingBranch = db.prepare('SELECT id FROM branches WHERE novel_id = ? AND branch_name = ?').get(novelId, branch) as any;
    if (existingBranch) {
      // 更新：增加章节数
      db.prepare(`
        UPDATE branches SET chapter_count = chapter_count + 1, total_words = total_words + ?, updated_at = CURRENT_TIMESTAMP
        WHERE novel_id = ? AND branch_name = ?
      `).run(wordCount, novelId, branch);
    } else {
      // 新建分支元数据
      db.prepare(`
        INSERT INTO branches (id, novel_id, branch_name, title, author_id, author_name, source_chapter_id, source_choice_text, chapter_count, total_words)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(uuidv4(), novelId, branch, displayName, user.userId || null, user.username || '', source_chapter_id || null, source_choice_text || null, wordCount);
    }

    db.prepare('UPDATE novels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(novelId);

    return NextResponse.json({
      success: true,
      branch,
      branch_title: displayName,
      title,
      chapter_id: dbChapterId,
      word_count: wordCount,
      author_name: user.username,
      readerUrl: `${process.env.NEXT_PUBLIC_URL || 'https://fireseed.online'}/novels/${novelId}/${dbChapterId}`
    });
  } catch (error) {
    console.error('AI publish branch error:', error);
    return NextResponse.json({ error: '支线发布失败' }, { status: 500 });
  }
}
