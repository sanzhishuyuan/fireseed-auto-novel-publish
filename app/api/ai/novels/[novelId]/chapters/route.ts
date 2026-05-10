import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';
import { validateContentSize, CONTENT_MAX_BYTES } from '@/lib/api-guard';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { recordActivationAndGetMissions } from '@/lib/skill-helper';
import { transferSeed } from '@/lib/seed';

export const dynamic = 'force-dynamic';

interface Params { params: Promise<{ novelId: string }>; }

// 验证 token 字符串（支持 JWT / user_tokens / ai_tokens 三种方式）
function verifyTokenString(token: string): { valid: boolean; token: string; record?: Record<string, unknown>; isUserToken: boolean } {
  // 1. JWT Token
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: string };
    return { valid: true, token, record: { user_id: decoded.userId }, isUserToken: true };
  } catch {
    // JWT 无效，继续
  }

  // 2. user_tokens
  const userToken = db.prepare(
    'SELECT id, user_id, is_active FROM user_tokens WHERE token = ?'
  ).get(token) as { id: string; user_id: string; is_active: number } | undefined;
  if (userToken && userToken.is_active === 1) {
    db.prepare('UPDATE user_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
    return { valid: true, token, record: { user_id: userToken.user_id }, isUserToken: true };
  }

  // 3. ai_tokens
  const record = db.prepare('SELECT * FROM ai_tokens WHERE token = ? AND is_active = 1').get(token) as Record<string, unknown> | undefined;
  if (!record) return { valid: false, token, isUserToken: false };
  const now = new Date();
  const resetAt = new Date(record.quota_reset_at as string);
  if (now >= resetAt) {
    db.prepare('UPDATE ai_tokens SET quota_used = 0, quota_reset_at = datetime("now", "+1 day") WHERE token = ?').run(token);
    record.quota_used = 0;
    record.quota_reset_at = new Date(resetAt.getTime() + 86400000).toISOString();
  }
  db.prepare('UPDATE ai_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
  return { valid: true, token, record, isUserToken: false };
}

// 统一 Token 验证：先尝试 Header，再尝试 Body
function verifyAITokenRecord(request: NextRequest, bodyToken?: string): { valid: boolean; token: string; record?: Record<string, unknown>; isUserToken: boolean } {
  // 1. 优先 Header Bearer Token
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const result = verifyTokenString(authHeader.slice(7));
    if (result.valid) return result;
  }

  // 2. 回退 Body token（兼容 upload-md 风格）
  if (bodyToken) {
    const result = verifyTokenString(bodyToken);
    if (result.valid) return result;
  }

  return { valid: false, token: '', isUserToken: false };
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = verifyAITokenRecord(request);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { novelId } = await params;
  const chapters = db.prepare('SELECT * FROM chapters WHERE novel_id = ? ORDER BY order_num ASC').all(novelId);
  return NextResponse.json({ success: true, chapters });
}

export async function POST(request: NextRequest, { params }: Params) {
  // P0-4: AI 发布接口速率限制（每分钟最多30次）
  const rateLimit = checkRateLimit(request, undefined, 'aiWrite');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  // 先解析 body 获取可能的内嵌 token（兼容 upload-md 风格 body 传 token）
  let bodyToken: string | undefined;
  let body: any;
  try {
    const rawText = await request.text();
    try {
      body = JSON.parse(rawText);
      bodyToken = body?.token;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    // 重新构造 request 给后续用（实际上后续直接用 body 变量）
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // 验证：Header Bearer 优先，Body token 回退
  const auth = verifyAITokenRecord(request, bodyToken);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
  const { novelId } = await params;
  const record = auth.record!;
  
  // user_tokens 不检查旧配额限制
  if (!auth.isUserToken) {
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
    const { title, content, order: rawOrder, branch = 'main', choices = [], custom_branch_enabled = false } = body || {};
    
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
    if (custom_branch_enabled) {
      finalChoices.push({ text: 'Custom storyline (reader-written)', branch: 'custom', is_custom: true });
    }

    // 确定作者信息
    const chapterAuthorId = auth.isUserToken ? (auth.record?.user_id as string) : null;
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
    db.prepare('UPDATE ai_tokens SET quota_used = quota_used + 1 WHERE token = ?').run(auth.token);

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
      userId: auth.isUserToken ? (auth.record?.user_id as string) : null,
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
}
