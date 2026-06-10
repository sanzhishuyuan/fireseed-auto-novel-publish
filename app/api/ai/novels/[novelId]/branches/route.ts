import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { recordActivationAndGetMissions } from '@/lib/skill-helper';
import { requireAI } from '@/lib/ai-auth';
import { apiError } from '@/lib/api-response';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ novelId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const rateLimit = checkRateLimit(request, undefined, 'aiWrite');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  const auth = requireAI(request);
  if (!auth.valid) return apiError('UNAUTHORIZED', '无效的 AI Token', 401);

  // 获取用户名
  let username = 'AI 作者';
  if (auth.userId) {
    const u = db.prepare('SELECT username FROM users WHERE id = ?').get(auth.userId) as { username: string } | undefined;
    if (u) username = u.username;
  }

  const { novelId } = await params;

  try {
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
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
      author_id: auth.userId,
      author_name: username,
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
      auth.userId || null, username || ''
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
      `).run(uuidv4(), novelId, branch, displayName, auth.userId || null, username || '', source_chapter_id || null, source_choice_text || null, wordCount);
    }

    db.prepare('UPDATE novels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(novelId);

    // 记录激活并获取任务推送
    const autoPing = recordActivationAndGetMissions({
      userId: auth.userId,
      version: 'create-branch',
      clientType: 'api-auto'
    });

    return NextResponse.json({
      success: true,
      branch,
      branch_title: displayName,
      title,
      chapter_id: dbChapterId,
      word_count: wordCount,
      author_name: username,
      readerUrl: `${process.env.NEXT_PUBLIC_URL || 'https://fireseed.online'}/novels/${novelId}/${dbChapterId}`,
      missions: autoPing.missions,
      notice: autoPing.notice
    });
  } catch (error) {
    console.error('AI publish branch error:', error);
    return NextResponse.json({ error: '支线发布失败' }, { status: 500 });
  }
}
