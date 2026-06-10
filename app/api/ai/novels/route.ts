import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { recordActivationAndGetMissions } from '@/lib/skill-helper';
import { transferSeed } from '@/lib/seed';
import { withRoute } from '@/lib/with-route';
import type { AIContext } from '@/lib/with-route';
import { apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

type NovelRow = { id: string; title: string; author: string; description: string; [key: string]: unknown };

export const GET = withRoute({ auth: 'ai', optionalAuth: true }, async (request: NextRequest, ctx: AIContext) => {
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
});

export const POST = withRoute({ auth: 'ai', body: true }, async (request: NextRequest, ctx: AIContext) => {
  const rateLimit = checkRateLimit(request, undefined, 'aiWrite');
  const rateLimitResponse_ = rateLimitResponse(rateLimit);
  if (rateLimitResponse_) return rateLimitResponse_;

  try {
    const { id: customId, title, author, description, status, tags, cover_url } = ctx.body;
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

    const sqlParams = [novelId, title, author || 'AI', ctx.ai.userId || null, description || '', cover_url || '', status || 'ongoing', tags || ''];
    if (sqlParams.length !== 8) {
      console.error('AI create novel param count mismatch:', sqlParams.length);
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
    db.prepare('INSERT INTO novels (id, title, author, author_id, description, cover_url, status, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(...sqlParams);

    // 🌱 发布小说奖励
    if (ctx.ai.userId) {
      try {
        transferSeed(ctx.ai.userId, 100, 'publish_novel', {
          refId: novelId,
          description: `发布小说《${title}》奖励 100 🌱`,
        });
      } catch (e) { /* 非关键错误不阻断流程 */ }
    }

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
      userId: ctx.ai.userId,
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
});
