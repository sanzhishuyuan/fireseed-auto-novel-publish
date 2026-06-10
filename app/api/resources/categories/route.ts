import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/resources/categories
 * 获取所有资源分类
 */
export const GET = withRoute({ auth: 'none' }, async () => {
  try {
    const rows = db.prepare(
      'SELECT DISTINCT category FROM trusted_resources WHERE is_active = 1 ORDER BY category'
    ).all() as { category: string }[];

    const categories = rows.map(r => r.category);

    return apiSuccess(categories);
  } catch (error) {
    console.error('[Resources Categories] GET error:', error);
    return apiError('INTERNAL_ERROR', '获取分类列表失败', 500);
  }
});
