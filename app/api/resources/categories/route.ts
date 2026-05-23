import db from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/resources/categories
 * 获取所有资源分类
 */
export async function GET() {
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
}
