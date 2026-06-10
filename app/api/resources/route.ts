import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { transferSeed } from '@/lib/seed';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

const VALID_SORTS = ['useful', 'newest', 'votes'] as const;
type SortType = typeof VALID_SORTS[number];

interface ResourceRow {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  tags: string;
  provider_id: string | null;
  provider_name: string;
  status: string;
  useful_count: number;
  useless_count: number;
  verified_count: number;
  last_verified_at: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/resources
 * 获取可信资源列表
 *
 * Query: ?category=xxx&sort=useful|newest|votes&page=1&limit=20
 * Auth: 可选（已登录时返回 user_vote 状态）
 */
export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') || '';
  const sortParam = searchParams.get('sort') || 'useful';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
  const offset = (page - 1) * limit;

  const sort = VALID_SORTS.includes(sortParam as SortType) ? sortParam : 'useful';

  // 构建查询
  let whereSql = 'WHERE is_active = 1 AND status = \'verified\'';
  const params: any[] = [];

  if (category) {
    whereSql += ' AND category = ?';
    params.push(category);
  }

  // 排序
  let orderSql: string;
  switch (sort) {
    case 'newest':
      orderSql = 'ORDER BY created_at DESC';
      break;
    case 'votes':
      orderSql = 'ORDER BY (useful_count + useless_count) DESC, useful_count DESC';
      break;
    case 'useful':
    default:
      orderSql = 'ORDER BY useful_count DESC, created_at DESC';
      break;
  }

  // 查询总数
  const countResult = db.prepare(
    `SELECT COUNT(*) as total FROM trusted_resources ${whereSql}`
  ).get(...params) as { total: number };

  // 查询资源列表
  const resources = db.prepare(
    `SELECT * FROM trusted_resources ${whereSql} ${orderSql} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as ResourceRow[];

  // 获取登录用户的投票状态
  const userId = getUserIdFromRequest(request);
  let userVotes: Record<string, string> = {};

  if (userId && resources.length > 0) {
    const resourceIds = resources.map(r => r.id);
    const placeholders = resourceIds.map(() => '?').join(',');
    const votes = db.prepare(
      `SELECT resource_id, vote FROM resource_votes WHERE voter_id = ? AND resource_id IN (${placeholders})`
    ).all(userId, ...resourceIds) as { resource_id: string; vote: string }[];

    for (const v of votes) {
      userVotes[v.resource_id] = v.vote;
    }
  }

  // 获取所有分类
  const categories = db.prepare(
    'SELECT DISTINCT category FROM trusted_resources WHERE is_active = 1 ORDER BY category'
  ).all() as { category: string }[];

  // 附加用户投票到资源
  const resourcesWithVote = resources.map(r => ({
    ...r,
    user_vote: userVotes[r.id] || null,
  }));

  return apiSuccess(resourcesWithVote, {
    page,
    page_size: limit,
    total: countResult.total,
    has_more: offset + limit < countResult.total,
  });
});

/**
 * POST /api/resources
 * 提交新的可信资源
 *
 * Body: { title, url, description, category, tags }
 * Auth: 必须登录
 */
export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const userId = ctx.user.id;
  const { title, url, description, category, tags } = ctx.body;

  // 验证必填字段
  if (!title || typeof title !== 'string' || !title.trim()) {
    return apiError('VALIDATION_REQUIRED', '标题不能为空', 400);
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    return apiError('VALIDATION_REQUIRED', 'URL 不能为空', 400);
  }

  if (description && typeof description === 'string' && description.length > 500) {
    return apiError('VALIDATION_INVALID_PARAM', '描述不能超过500字', 400);
  }

  if (!category || typeof category !== 'string' || !category.trim()) {
    return apiError('VALIDATION_REQUIRED', '分类不能为空', 400);
  }

  // URL 唯一性检查
  const existingUrl = db.prepare(
    'SELECT id FROM trusted_resources WHERE url = ? AND is_active = 1'
  ).get(url.trim()) as { id: string } | undefined;

  if (existingUrl) {
    return apiError('VALIDATION_DUPLICATE', '该 URL 已被提交，请勿重复提交', 409);
  }

  // 获取用户信息用于 provider_name
  const user = db.prepare('SELECT username, nickname FROM users WHERE id = ?')
    .get(userId) as { username: string; nickname: string | null } | undefined;
  const providerName = user?.nickname || user?.username || '';

  // 创建资源
  const newId = uuidv4();
  const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

  db.prepare(`
    INSERT INTO trusted_resources (id, title, url, description, category, tags, provider_id, provider_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(newId, title.trim(), url.trim(), description?.trim() || null, category.trim(), tagsStr, userId, providerName);

  // SEED 奖励
  try {
    transferSeed(userId, 1, 'resource_upload', {
      refId: newId,
      description: '提交资源',
    });
  } catch (seedError: any) {
    // SEED 奖励失败不影响资源创建
    console.warn('[Resources] SEED reward failed:', seedError?.message);
  }

  // 返回创建的资源
  const resource = db.prepare('SELECT * FROM trusted_resources WHERE id = ?').get(newId) as ResourceRow;

  return apiSuccess({
    ...resource,
    user_vote: null,
  });
});
