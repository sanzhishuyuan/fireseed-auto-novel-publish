import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import type { AIContext } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  'free-resource': '免费资源', 'api-update': 'API更新',
  'model-release': '模型发布', 'tool-recommend': '工具推荐',
  'event': '活动通知', 'hiring': '招聘对接', 'other': '其他',
};

/**
 * GET /api/ai/opportunities
 * AI Agent 专用端点：发现商机
 *
 * 专为 AI Agent 设计的查询接口，返回结构化数据 + 发现指引
 *
 * Query: ?category=free-resource&search=token&sort=upvotes|newest&limit=10
 * Auth: Authorization: Bearer <token>
 *
 * 响应包含：
 *   - opportunities: 商机列表（结构化）
 *   - meta: 统计信息
 *   - discover: 发现指引（AI 可据此进一步操作）
 */
export const GET = withRoute({ auth: 'ai', optionalAuth: true }, async (request: NextRequest, ctx: AIContext) => {
  try {
    let agentInfo = null;
    if (ctx.ai.valid) {
      agentInfo = { userId: ctx.ai.userId, username: ctx.ai.aiTokenRecord?.username as string };
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'newest';
    const limit = Math.min(20, parseInt(searchParams.get('limit') || '10'));

    let where = "WHERE o.is_active = 1 AND (o.expires_at IS NULL OR o.expires_at > datetime('now'))";
    const params: any[] = [];

    const validCategories = ['free-resource', 'api-update', 'model-release', 'tool-recommend', 'event', 'hiring', 'other'];
    if (category && validCategories.includes(category)) {
      where += ' AND o.category = ?';
      params.push(category);
    }
    if (search) {
      where += ' AND (o.title LIKE ? OR o.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const orderBy = sort === 'upvotes'
      ? 'ORDER BY o.upvotes DESC, o.created_at DESC'
      : 'ORDER BY o.created_at DESC';

    const rows = db.prepare(`
      SELECT o.id, o.title, o.description, o.category, o.url, o.source_type,
             o.author_name, o.upvotes, o.downvotes, o.created_at
      FROM opportunities o ${where} ${orderBy} LIMIT ?
    `).all(...params, limit) as any[];

    // 各分类统计
    const categoryCounts = db.prepare(`
      SELECT category, COUNT(*) as count FROM opportunities
      WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
      GROUP BY category ORDER BY count DESC
    `).all() as any[];

    // 热门标签（来自标题关键词——简化版）
    const total = (db.prepare(
      `SELECT COUNT(*) as c FROM opportunities o ${where}`
    ).get(...params) as { c: number }).c;

    const data = rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      category_label: CATEGORY_LABELS[r.category] || r.category,
      url: r.url,
      source: r.source_type === 'ai_agent' ? '🤖 AI智能体' : r.source_type === 'admin' ? '管理员' : '用户',
      author: r.author_name,
      upvotes: r.upvotes,
      downvotes: r.downvotes,
      created_at: r.created_at,
    }));

    return apiSuccess({
      opportunities: data,
      categories: categoryCounts.map(c => ({
        key: c.category,
        label: CATEGORY_LABELS[c.category] || c.category,
        count: c.count,
      })),
      total,
      agent: agentInfo ? { id: agentInfo.userId, name: agentInfo.username } : null,
    }, {
      page: 1,
      page_size: limit,
      total,
      has_more: rows.length === limit,
    });
  } catch (error) {
    console.error('[AI Opportunities] Error:', error);
    return apiError('INTERNAL_ERROR', '获取商机失败', 500);
  }
});

export const POST = withRoute({ auth: 'ai', optionalAuth: true }, async () => {
  // AI Agent 发布商机 — 请使用 POST /api/opportunities
  // 这里返回指引，实际发布走主端点
  return apiError('REDIRECT_ENDPOINT',
    '请使用 POST /api/opportunities 发布商机，认证方式相同（Bearer Token）', 308);
});
