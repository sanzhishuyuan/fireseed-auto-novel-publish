import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { recordActivationAndGetMissions } from '@/lib/skill-helper';

export const dynamic = 'force-dynamic';

// 验证 AI Token（支持三种方式）
// 1. JWT Bearer Token（注册用户通过 /api/auth/token 获取）
// 2. user_tokens（UUID 格式 API Token）
// 3. ai_tokens（旧系统兼容）
function verifyAIToken(request: NextRequest): { valid: boolean; userId?: string } {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { valid: false };

  const token = authHeader.slice(7);

  // 1. 优先验证 JWT Token（注册用户直接发布）
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: string };
    return { valid: true, userId: decoded.userId };
  } catch {
    // JWT 无效，继续检查其他 Token 类型
  }

  // 2. 检查 user_tokens（新系统 API Token）
  const userToken = db.prepare(
    'SELECT user_id, is_active FROM user_tokens WHERE token = ?'
  ).get(token) as { user_id: string; is_active: number } | undefined;

  if (userToken && userToken.is_active === 1) {
    db.prepare('UPDATE user_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
    return { valid: true, userId: userToken.user_id };
  }

  // 3. 兼容旧 ai_tokens 表
  const aiToken = db.prepare(
    'SELECT id, quota_used, quota_limit FROM ai_tokens WHERE token = ? AND is_active = 1'
  ).get(token) as { id: string; quota_used: number; quota_limit: number } | undefined;

  if (!aiToken) return { valid: false };

  // 检查配额
  if (aiToken.quota_used >= aiToken.quota_limit) {
    return { valid: false };
  }

  // 更新配额使用
  db.prepare('UPDATE ai_tokens SET last_used = CURRENT_TIMESTAMP, quota_used = quota_used + 1 WHERE token = ?').run(token);

  return { valid: true };
}

type NovelRow = { id: string; title: string; author: string; description: string; [key: string]: unknown };

export async function GET(request: NextRequest) {
  const auth = verifyAIToken(request);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(searchParams.get('page_size') || '10'), 100);
  const offset = (page - 1) * pageSize;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';

  if (query.trim()) {
    const like = '%' + query + '%';
    const novels = db.prepare(
      'SELECT * FROM novels WHERE title LIKE ? OR author LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(like, like, like, pageSize, offset) as NovelRow[];
    const total = db.prepare(
      'SELECT COUNT(*) as count FROM novels WHERE title LIKE ? OR author LIKE ? OR description LIKE ?'
    ).get(like, like, like) as { count: number };
    return NextResponse.json({
      success: true,
      novels: novels.map((n) => ({ ...n, reader_url: baseUrl + '/novels/' + n.id })),
      pagination: { page, page_size: pageSize, total: total.count }
    });
  }
  const novels = db.prepare('SELECT * FROM novels ORDER BY created_at DESC LIMIT ? OFFSET ?').all(pageSize, offset) as NovelRow[];
  return NextResponse.json({
    success: true,
    novels: novels.map((n) => ({ ...n, reader_url: baseUrl + '/novels/' + n.id }))
  });
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, undefined, 'aiWrite');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  const auth = verifyAIToken(request);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id: customId, title, author, description, status, tags, cover_url } = body;
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    // 查重：同标题+同作者的小说是否已存在
    const authorName = author || 'AI';
    const dupNovel = db.prepare(
      'SELECT id, title, created_at FROM novels WHERE title = ? AND author = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1'
    ).get(title, authorName) as { id: string; title: string; created_at: string } | undefined;

    if (dupNovel) {
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';
      return NextResponse.json({
        success: true,
        id: dupNovel.id,
        title: dupNovel.title,
        reader_url: baseUrl + '/novels/' + dupNovel.id,
        notice: `⚠️ 已存在同名小说《${title}》，直接使用现有作品（ID: ${dupNovel.id}）。如需发布新章节，请用 chapters API 追加。`,
        duplicate: true,
        existing_id: dupNovel.id
      });
    }

    const novelId = customId || uuidv4();
    const existing = db.prepare('SELECT id FROM novels WHERE id = ?').get(novelId);
    if (existing) return NextResponse.json({ error: 'novel ID exists', id: novelId }, { status: 409 });

    const params = [novelId, title, author || 'AI', auth.userId || null, description || '', cover_url || '', status || 'ongoing', tags || ''];
    if (params.length !== 8) {
      console.error('AI create novel param count mismatch:', params.length);
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
    db.prepare('INSERT INTO novels (id, title, author, author_id, description, cover_url, status, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(...params);
    const novelsDir = path.join(process.cwd(), 'content', 'novels', novelId);
    fs.mkdirSync(path.join(novelsDir, 'chapters'), { recursive: true });
    fs.mkdirSync(path.join(novelsDir, 'branches'), { recursive: true });
    const metaContent = matter.stringify('', {
      title, author: author || 'AI', description: description || '',
      cover_url: cover_url || '', status: status || 'ongoing', tags: tags || '',
      created_at: new Date().toISOString()
    });
    fs.writeFileSync(path.join(novelsDir, 'meta.md'), metaContent, 'utf-8');

    // 记录激活并获取任务推送
    const autoPing = recordActivationAndGetMissions({
      userId: auth.userId,
      version: 'create-novel',
      clientType: 'api-auto'
    });

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';
    return NextResponse.json({
      success: true, id: novelId, title, reader_url: baseUrl + '/novels/' + novelId,
      missions: autoPing.missions,
      notice: autoPing.notice,
      stats: autoPing.stats
    });
  } catch (error) {
    console.error('AI create novel error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
