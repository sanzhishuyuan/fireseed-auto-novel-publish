import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { transferSeed } from '@/lib/seed';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

const VALID_VOTES = ['useful', 'useless'] as const;
type VoteType = typeof VALID_VOTES[number];

interface ResourceRow {
  id: string;
  title: string;
  provider_id: string | null;
  provider_name: string;
}

/**
 * POST /api/resources/[id]/vote
 * 对资源投"有用/无用"票
 *
 * Body: { vote: 'useful'|'useless', reason? }
 * Auth: 必须登录
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;

    // 1. 认证
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return apiError('AUTH_REQUIRED', '请先登录后再评分', 401);
    }

    // 2. 速率限制
    const rl = checkRateLimit(request, `vote:${userId}`, 'aiWrite');
    const rlResponse = rateLimitResponse(rl);
    if (rlResponse) return rlResponse;

    // 3. 解析请求体
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const { vote, reason } = body;

    if (!vote || !VALID_VOTES.includes(vote as VoteType)) {
      return apiError('VALIDATION_INVALID_PARAM', '无效的投票类型，必须为 useful 或 useless', 400);
    }

    if (reason && typeof reason === 'string' && reason.length > 500) {
      return apiError('VALIDATION_INVALID_PARAM', '原因过长，最多500字', 400);
    }

    // 4. 验证资源存在
    const resource = db.prepare(
      'SELECT id, title, provider_id, provider_name FROM trusted_resources WHERE id = ? AND is_active = 1'
    ).get(resourceId) as ResourceRow | undefined;

    if (!resource) {
      return apiError('NOT_FOUND', '资源不存在', 404);
    }

    // 5. 防自投
    if (resource.provider_id && resource.provider_id === userId) {
      return apiError('VALIDATION_SELF_VOTE', '不能给自己的资源评分', 400);
    }

    // 6. 检查是否已投票（允许切换投票）
    const existingVote = db.prepare(
      'SELECT id, vote FROM resource_votes WHERE voter_id = ? AND resource_id = ?'
    ).get(userId, resourceId) as { id: string; vote: string } | undefined;

    // 7. 如果是相同投票，直接返回（幂等）
    if (existingVote && existingVote.vote === vote) {
      const counts = getVoteCounts(resourceId);
      return apiSuccess({
        ...counts,
        user_vote: vote,
        message: vote === 'useful' ? '已标记为有用' : '已标记为无用',
      });
    }

    // 8. 执行投票事务
    const result = db.transaction(() => {
      if (existingVote) {
        // 更新已有投票
        const oldVote = existingVote.vote;

        // 如果之前投的是"有用"，提供者失去奖励（扣回）
        if (oldVote === 'useful' && resource.provider_id) {
          try {
            transferSeed(resource.provider_id, -1, 'resource_vote', {
              refId: resourceId,
              description: `撤回有用评分: ${resource.title}`,
            });
          } catch (e) {
            // 如果撤回时余额不足，记录但不阻止投票更新
            console.warn('[Resource Vote] Failed to reverse reward:', e);
          }
        }

        db.prepare(`
          UPDATE resource_votes SET vote = ?, reason = ?, created_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(vote, reason || null, existingVote.id);
      } else {
        // 新建投票
        const voteId = uuidv4();
        db.prepare(`
          INSERT INTO resource_votes (id, resource_id, voter_id, voter_type, vote, reason)
          VALUES (?, ?, ?, 'user', ?, ?)
        `).run(voteId, resourceId, userId, vote, reason || null);
      }

      // 9. 如果投"有用"且资源有提供者，给提供者 SEED 奖励
      if (vote === 'useful' && resource.provider_id) {
        try {
          transferSeed(resource.provider_id, 1, 'resource_vote', {
            refId: resourceId,
            description: `资源获有用评分: ${resource.title}`,
          });
        } catch (e) {
          console.warn('[Resource Vote] Failed to reward provider:', e);
        }
      }

      // 10. 更新资源表的计数
      const counts = getVoteCounts(resourceId);
      db.prepare(`
        UPDATE trusted_resources SET useful_count = ?, useless_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(counts.useful_count, counts.useless_count, resourceId);

      return counts;
    })();

    return apiSuccess({
      ...result,
      user_vote: vote,
      message: vote === 'useful' ? '标记为有用' : '已标记',
    });
  } catch (error: any) {
    console.error('[Resource Vote] POST error:', error);

    if (error.message?.includes('余额不足')) {
      return apiError('SEED_INSUFFICIENT', error.message, 402);
    }

    return apiError('INTERNAL_ERROR', '评分失败，请稍后重试', 500);
  }
}

/**
 * GET /api/resources/[id]/vote
 * 获取资源的投票统计
 *
 * Auth: 可选（已登录时返回 user_vote）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;

    // 验证资源存在
    const resource = db.prepare('SELECT id FROM trusted_resources WHERE id = ? AND is_active = 1')
      .get(resourceId);
    if (!resource) {
      return apiError('NOT_FOUND', '资源不存在', 404);
    }

    const counts = getVoteCounts(resourceId);

    // 如果用户已登录，返回他们的投票
    const userId = getUserIdFromRequest(request);
    let userVote: string | null = null;

    if (userId) {
      const existing = db.prepare(
        'SELECT vote FROM resource_votes WHERE voter_id = ? AND resource_id = ?'
      ).get(userId, resourceId) as { vote: string } | undefined;
      if (existing) {
        userVote = existing.vote;
      }
    }

    return apiSuccess({ ...counts, user_vote: userVote });
  } catch (error) {
    console.error('[Resource Vote] GET error:', error);
    return apiError('INTERNAL_ERROR', '获取评分失败', 500);
  }
}

/**
 * 获取资源投票统计
 */
function getVoteCounts(resourceId: string): { useful_count: number; useless_count: number } {
  const useful = db.prepare(
    "SELECT COUNT(*) as c FROM resource_votes WHERE resource_id = ? AND vote = 'useful'"
  ).get(resourceId) as { c: number };

  const useless = db.prepare(
    "SELECT COUNT(*) as c FROM resource_votes WHERE resource_id = ? AND vote = 'useless'"
  ).get(resourceId) as { c: number };

  return {
    useful_count: useful.c,
    useless_count: useless.c,
  };
}
