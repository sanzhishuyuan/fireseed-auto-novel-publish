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

export const dynamic = 'force-dynamic';

interface Params { params: Promise<{ novelId: string }>; }

// 统一 Token 验证（支持 JWT / user_tokens / ai_tokens 三种方式）
function verifyAITokenRecord(request: NextRequest): { valid: boolean; token: string; record?: Record<string, unknown>; isUserToken: boolean } {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { valid: false, token: '', isUserToken: false };
  const token = authHeader.slice(7);

  // 1. 优先验证 JWT Token（注册用户通过 /api/auth/token 获取）
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: string };
    return { valid: true, token, record: { user_id: decoded.userId }, isUserToken: true };
  } catch {
    // JWT 无效，继续检查其他 Token 类型
  }

  // 2. 检查 user_tokens（新系统 API Token）
  const userToken = db.prepare(
    'SELECT id, user_id, is_active FROM user_tokens WHERE token = ?'
  ).get(token) as { id: string; user_id: string; is_active: number } | undefined;

  if (userToken && userToken.is_active === 1) {
    db.prepare('UPDATE user_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
    return { valid: true, token, record: { user_id: userToken.user_id }, isUserToken: true };
  }

  // 3. 兼容旧 ai_tokens 表
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

  const auth = verifyAITokenRecord(request);
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
    // 检查请求体大小（最大 5MB）
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > 5 * 1024 * 1024) {
      return NextResponse.json({
        error: 'Payload too large',
        detail: 'Chapter content exceeds 5MB limit',
        received_length: contentLength
      }, { status: 413 });
    }
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      // JSON 解析失败，尝试读取原始文本
      const rawText = await request.text();
      console.error('JSON parse error, raw length:', rawText?.length);
      return NextResponse.json({
        error: 'Invalid JSON format',
        detail: 'Request body must be valid JSON. Check for special characters or encoding issues.',
        received_length: rawText?.length,
        received_preview: rawText?.substring(0, 200)
      }, { status: 400 });
    }
    
    const { title, content, order, branch = 'main', choices = [], custom_branch_enabled = false } = body;
    
    // 验证必填字段
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });
    
    // 确保 content 是字符串类型
    const contentStr = String(content);
    if (contentStr.length < 10) {
      return NextResponse.json({
        error: 'content too short',
        detail: 'Content must be at least 10 characters',
        received_length: contentStr.length
      }, { status: 400 });
    }
    
    const novel = db.prepare('SELECT id FROM novels WHERE id = ?').get(novelId);
    if (!novel) return NextResponse.json({ error: 'novel not found' }, { status: 404 });

    const chapterId = String(order || Date.now()) + '-' + Date.now();
    const dbChapterId = uuidv4();
    const wordCount = contentStr.replace(/\s/g, '').length;

    const finalChoices = [...choices];
    if (custom_branch_enabled) {
      finalChoices.push({ text: 'Custom storyline (reader-written)', branch: 'custom', is_custom: true });
    }

    const chaptersDir = path.join(process.cwd(), 'content', 'novels', novelId, 'chapters');
    fs.mkdirSync(chaptersDir, { recursive: true });
    const meta = {
      title, book: novelId,
      order: parseInt(String(order)) || 1,
      branch, choices: finalChoices, custom_branch_enabled,
      word_count: wordCount,
      created_at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(chaptersDir, chapterId + '.md'), matter.stringify(contentStr, meta), 'utf-8');

    const choicesJson = JSON.stringify(finalChoices);
    db.prepare('INSERT INTO chapters (id, novel_id, title, content, order_num, branch, word_count, choices, custom_branch_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      dbChapterId, novelId, title, contentStr, order || 1, branch, wordCount, choicesJson, custom_branch_enabled ? 1 : 0
    );
    db.prepare('UPDATE novels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(novelId);
    db.prepare('UPDATE ai_tokens SET quota_used = quota_used + 1 WHERE token = ?').run(auth.token);

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';
    return NextResponse.json({
      success: true, chapterId, dbChapterId, title, wordCount,
      choices: finalChoices,
      readerUrl: baseUrl + '/novels/' + novelId + '/' + chapterId,
      novelUrl: baseUrl + '/novels/' + novelId
    });
  } catch (error) {
    console.error('AI publish chapter error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
