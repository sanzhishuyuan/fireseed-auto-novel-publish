import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { validateContentSize, CONTENT_MAX_BYTES } from '@/lib/api-guard';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { recordActivationAndGetMissions } from '@/lib/skill-helper';
import { transferSeed } from '@/lib/seed';
import { extractChoicesFromContent } from '@/lib/markdown-flow';
import { withRoute } from '@/lib/with-route';
import type { AIContext } from '@/lib/with-route';
import { apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export const GET = withRoute({ auth: 'ai' }, async (request: NextRequest, ctx: AIContext) => {
  const { novelId } = ctx.params!;
  const chapters = db.prepare('SELECT * FROM chapters WHERE novel_id = ? ORDER BY order_num ASC').all(novelId);
  return NextResponse.json({ success: true, chapters });
});

export const POST = withRoute({ auth: 'ai', body: true }, async (request: NextRequest, ctx: AIContext) => {
  // P0-4: AI 发布接口速率限制（每分钟最多30次）
  const rateLimit = checkRateLimit(request, undefined, 'aiWrite');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  const auth = ctx.ai;
  const isUser = auth.tokenType === 'jwt' || auth.tokenType === 'user_token';
  const { novelId } = ctx.params!;
  const record = auth.aiTokenRecord!;
  
  // user_tokens 不检查旧配额限制
  if (!isUser) {
    const quotaUsed = (record.quota_used as number) || 0;
    const quotaLimit = (record.quota_limit as number) || 50;
    if (quotaUsed >= quotaLimit) {
      return NextResponse.json({
        error: 'Daily quota exceeded (50 chapters/day)',
        code: 'quota_exceeded',
        quota_used: quotaUsed,
        quota_limit: quotaLimit,
        quota_reset_at: record.quota_reset_at
      }, { status: 429 });
    }
  }
  
  try {
    const { title, content, order: rawOrder, branch = 'main', choices = [], custom_branch_enabled = false } = ctx.body || {};
    
    // 验证必填字段
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });
    
    // 确保 content 是字符串类型
    const contentStr = String(content);
    // 计算实际字数（去除空白字符）
    const checkWordCount = contentStr.replace(/\s/g, '').length;
    if (checkWordCount < 1500) {
      return NextResponse.json({
        error: '章节字数不足',
        detail: '单章至少 1500 字以保证阅读体验，当前字数：' + checkWordCount + '，建议充实内容后重试',
        current_word_count: checkWordCount,
        minimum_required: 1500
      }, { status: 400 });
    }
    
    const novel = db.prepare('SELECT id FROM novels WHERE id = ?').get(novelId);
    if (!novel) return NextResponse.json({ error: 'novel not found' }, { status: 404 });

    // 自动计算 order：不传时取当前最大 order_num + 1（避免默认插到第1章）
    let order = rawOrder;
    if (order === undefined) {
      const maxRow = db.prepare(
        'SELECT COALESCE(MAX(order_num), 0) as max_order FROM chapters WHERE novel_id = ? AND branch = ?'
      ).get(novelId, branch) as { max_order: number };
      order = maxRow.max_order + 1;
    }

    // 后移已有章节：把 >= 目标 order 的现有章节全部 +1，为新章腾位置
    // 追加场景（order > 当前最大值）不受影响，因为没有行命中
    db.prepare(`
      UPDATE chapters SET order_num = order_num + 1
      WHERE novel_id = ? AND branch = ? AND order_num >= ?
    `).run(novelId, branch, order);

    const chapterId = String(order || Date.now()) + '-' + Date.now();
    const dbChapterId = uuidv4();
    const wordCount = contentStr.replace(/\s/g, '').length;

    const finalChoices = [...choices];
    // 自动从 MarkdownFlow 语法的 ?[...] 中提取选项
    const mfChoices = extractChoicesFromContent(contentStr);
    for (const mc of mfChoices) {
      // 避免与手工传入的 choices 重复
      if (!finalChoices.some(c => c.text === mc.text && c.branch === mc.branch)) {
        finalChoices.push(mc);
      }
    }
    if (custom_branch_enabled) {
      finalChoices.push({ text: 'Custom storyline (reader-written)', branch: 'custom', is_custom: true });
    }

    // 确定作者信息
    const chapterAuthorId = isUser ? (auth.aiTokenRecord?.user_id as string) : null;
    let chapterAuthorName = '';
    if (chapterAuthorId) {
      const authorUser = db.prepare('SELECT username FROM users WHERE id = ?').get(chapterAuthorId) as { username: string } | undefined;
      chapterAuthorName = authorUser?.username || '';
    }

    const chaptersDir = path.join(process.cwd(), 'content', 'novels', novelId, 'chapters');
    fs.mkdirSync(chaptersDir, { recursive: true });
    const meta = {
      title, book: novelId,
      order: parseInt(String(order)) || 1,
      branch, choices: finalChoices, custom_branch_enabled,
      word_count: wordCount,
      author_id: chapterAuthorId,
      author_name: chapterAuthorName,
      created_at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(chaptersDir, chapterId + '.md'), matter.stringify(contentStr, meta), 'utf-8');

    const choicesJson = JSON.stringify(finalChoices);
    db.prepare('INSERT INTO chapters (id, novel_id, title, content, order_num, branch, word_count, choices, custom_branch_enabled, author_id, author_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      dbChapterId, novelId, title, contentStr, order || 1, branch, wordCount, choicesJson, custom_branch_enabled ? 1 : 0, chapterAuthorId, chapterAuthorName
    );
    db.prepare('UPDATE novels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(novelId);
    // 配额已由 requireAI() 统一管理，无需重复更新

    // 🌱 发布章节奖励
    if (chapterAuthorId) {
      try {
        transferSeed(chapterAuthorId, 10, 'publish_chapter', {
          refId: dbChapterId,
          description: `更新章节《${title}》奖励 10 🌱`,
        });
      } catch (e) { /* 非关键 */ }
    }

    // 记录激活并获取任务推送
    const autoPing = recordActivationAndGetMissions({
      userId: isUser ? (auth.aiTokenRecord?.user_id as string) : null,
      version: 'create-chapter',
      clientType: 'api-auto'
    });

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';
    return NextResponse.json({
      success: true, chapterId, dbChapterId, title, wordCount,
      choices: finalChoices,
      readerUrl: baseUrl + '/novels/' + novelId + '/' + chapterId,
      novelUrl: baseUrl + '/novels/' + novelId,
      missions: autoPing.missions,
      notice: autoPing.notice
    });
  } catch (error) {
    console.error('AI publish chapter error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});
