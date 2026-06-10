import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { transferSeed, getBalance } from '@/lib/seed';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = [
  'free-resource', 'api-update', 'model-release',
  'tool-recommend', 'event', 'hiring', 'other'
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  'free-resource': '免费资源',
  'api-update': 'API更新',
  'model-release': '模型发布',
  'tool-recommend': '工具推荐',
  'event': '活动通知',
  'hiring': '招聘对接',
  'other': '其他',
};

/**
 * GET /api/opportunities
 * 商机列表（AI 可发现/搜索）
 *
 * Query: ?category=free-resource&search=token&sort=newest|upvotes&page=1&limit=20
 * Auth: 可选（已登录时返回 user_vote）
 */
export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  // 构建查询
  let where = "WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))";
  const params: any[] = [];

  if (category && VALID_CATEGORIES.includes(category as any)) {
    where += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    where += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const orderBy = sort === 'upvotes'
    ? 'ORDER BY upvotes DESC, created_at DESC'
    : 'ORDER BY created_at DESC';

  // 查询总数
  const total = (db.prepare(
    `SELECT COUNT(*) as c FROM opportunities ${where}`
  ).get(...params) as { c: number }).c;

  // 查询数据
  const rows = db.prepare(`
    SELECT id, title, description, category, url, source_type, author_id, author_name,
           upvotes, downvotes, expires_at, created_at
    FROM opportunities ${where} ${orderBy} LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  // 如果用户已登录，返回他们的投票状态
  const userId = getUserIdFromRequest(request);
  let userVotes: Record<string, string> = {};

  if (userId && rows.length > 0) {
    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const votes = db.prepare(
      `SELECT opportunity_id, vote FROM opportunity_votes WHERE voter_id = ? AND opportunity_id IN (${placeholders})`
    ).all(userId, ...ids) as any[];
    for (const v of votes) {
      userVotes[v.opportunity_id] = v.vote;
    }
  }

  const data = rows.map(r => ({
    ...r,
    category_label: CATEGORY_LABELS[r.category] || r.category,
    user_vote: userVotes[r.id] || null,
  }));

  return apiSuccess(data, {
    page, page_size: limit, total, has_more: offset + limit < total,
  });
});

/**
 * POST /api/opportunities
 * 发布商机（人类用户或 AI Agent）
 *
 * Body: { title, description, category, url? }
 * Auth: 需要登录（Cookie 或 Bearer Token）
 * 经济: 消耗 1 SEED（防 spam）
 */
export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const userId = ctx.user.id;

  // 速率限制
  const rl = checkRateLimit(request, `opp:${userId}`, 'aiWrite');
  const rlResp = rateLimitResponse(rl);
  if (rlResp) return rlResp;

  const { title, description, category, url } = ctx.body;

  // 校验
  if (!title || title.trim().length < 2) {
    return apiError('VALIDATION_REQUIRED', '标题至少 2 个字', 400);
  }
  if (title.length > 200) {
    return apiError('VALIDATION_INVALID_PARAM', '标题最多 200 字', 400);
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return apiError('VALIDATION_INVALID_PARAM', '无效的分类', 400);
  }
  if (description && description.length > 2000) {
    return apiError('VALIDATION_INVALID_PARAM', '描述最多 2000 字', 400);
  }
  if (url && url.length > 500) {
    return apiError('VALIDATION_INVALID_PARAM', '链接过长', 400);
  }

  // 检查 SEED 余额（人类发布消耗 1 SEED，AI Agent 减半）
  const balance = getBalance(userId);
  const cost = 1;
  if (balance < cost) {
    return apiError('SEED_INSUFFICIENT', `余额不足，需要 ${cost} 🌱`, 402);
  }

  // 判断来源类型
  const authHeader = request.headers.get('Authorization') || '';
  const sourceType = authHeader.startsWith('Bearer ') ? 'ai_agent' : 'user';

  // 获取用户名
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as any;
  const authorName = user?.username || '未知用户';

  // 事务：扣 SEED + 插入商机
  const result = db.transaction(() => {
    // 扣 SEED
    transferSeed(userId, -cost, 'opp_publish', {
      description: `发布商机: ${title.trim().slice(0, 50)}`,
    });

    // 插入
    const id = uuidv4().replace(/-/g, '').slice(0, 16);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7天后过期

    db.prepare(`
      INSERT INTO opportunities (id, title, description, category, url, source_type, author_id, author_name, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title.trim(), description?.trim() || null, category, url?.trim() || null,
           sourceType, userId, authorName, expiresAt.toISOString());

    return id;
  })();

  return apiSuccess({
    id: result,
    title: title.trim(),
    category,
    source_type: sourceType,
    message: '商机发布成功！消耗 1 🌱（7天自动过期）',
  });
});
