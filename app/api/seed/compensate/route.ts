import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { transferSeed } from '@/lib/seed';
import { apiSuccess, apiError } from '@/lib/api-response';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

/**
 * POST /api/seed/compensate
 * 资源失效后自动退款给投票者
 * Body: { resource_id: string, resource_type: string }
 * Auth: 管理员
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return apiError('AUTH_REQUIRED', '请先登录', 401);

    // 仅允许管理员
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any;
    if (!user || !['admin', 'super_admin', 'editor'].includes(user.role)) {
      return apiError('FORBIDDEN', '仅管理员可操作', 403);
    }

    const bodyText = await request.text();

    const parsed = safeParseJSON(bodyText);

    if (!parsed.success) return parsed.response;

    const body = parsed.data;
    const { resource_id, resource_type } = body;

    if (!resource_id || !resource_type) {
      return apiError('VALIDATION_REQUIRED', '缺少 resource_id 或 resource_type', 400);
    }

    // 验证资源存在且为过期状态
    if (resource_type === 'trusted_resource') {
      const resource = db.prepare('SELECT title, status FROM trusted_resources WHERE id = ?').get(resource_id) as any;
      if (!resource) return apiError('NOT_FOUND', '资源不存在', 404);
      if (resource.status !== 'expired') {
        return apiError('VALIDATION_INVALID_PARAM', '只有过期状态的资源才可退款', 400);
      }
    }

    // 查找投过 "useful" 的用户，每人退 0.5 SEED
    const votes = db.prepare(`
      SELECT rv.voter_id, rv.vote
      FROM resource_votes rv
      WHERE rv.resource_id = ? AND rv.vote = 'useful'
    `).all(resource_id) as any[];

    if (votes.length === 0) {
      return apiSuccess({ compensated: 0, message: '没有需要退款的投票' });
    }

    let compensated = 0;
    const txResult = db.transaction(() => {
      for (const vote of votes) {
        try {
          transferSeed(vote.voter_id, 1, 'compensate', {
            refId: resource_id,
            description: `资源失效退款: ${resource_id.slice(0, 8)}`,
          });
          compensated++;
        } catch (e) {
          // 跳过余额异常的用户
        }
      }
      // 标记资源已验证过退款
      return compensated;
    })();

    return apiSuccess({
      compensated: txResult,
      total_voters: votes.length,
      message: `已向 ${txResult} 位用户退款`,
    });
  } catch (error) {
    console.error('[Compensate] Error:', error);
    return apiError('INTERNAL_ERROR', '退款失败', 500);
  }
}
