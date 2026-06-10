import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { transferSeed, getBalance } from '@/lib/seed';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/auto-feedback
 * AI Agent 自动反馈——AI 对资源/内容自动评分
 *
 * Body: { resource_id: string, resource_type: string, vote: 'useful'|'useless', token: string }
 * Auth: Bearer Token（AI Agent）
 *
 * 用途：AI 在消费内容后自动投票，帮助平台积累可信评分
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证 AI Agent 身份
    const authHeader = request.headers.get('Authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const token = bearerToken || body.token;

    let userId: string | null = null;
    if (token) {
      try {
        const decoded = verifyToken(token) as any;
        if (decoded?.userId) userId = decoded.userId;
      } catch {
        const ut = db.prepare('SELECT user_id FROM user_tokens WHERE token = ? AND is_active = 1').get(token) as any;
        if (ut) userId = ut.user_id;
      }
    }

    if (!userId) {
      return apiError('AUTH_REQUIRED', 'AI Agent 认证失败，请提供有效 Token', 401);
    }

    // 2. 速率限制
    const rl = checkRateLimit(request, `auto-feedback:${userId}`, 'read');
    const rlResp = rateLimitResponse(rl);
    if (rlResp) return rlResp;

    const { resource_id, resource_type, vote } = body;

    if (!resource_id || !resource_type || !vote) {
      return apiError('VALIDATION_REQUIRED', '缺少 resource_id, resource_type 或 vote', 400);
    }
    if (!['useful', 'useless'].includes(vote)) {
      return apiError('VALIDATION_INVALID_PARAM', 'vote 必须为 useful 或 useless', 400);
    }

    // 3. 根据资源类型处理
    if (resource_type === 'resource') {
      // 可信资源库投票
      const resource = db.prepare('SELECT id, provider_id, title FROM trusted_resources WHERE id = ? AND is_active = 1').get(resource_id) as any;
      if (!resource) return apiError('NOT_FOUND', '资源不存在', 404);

      // 去重
      const existing = db.prepare('SELECT vote FROM resource_votes WHERE resource_id = ? AND voter_id = ?')
        .get(resource_id, userId) as any;
      if (existing) {
        return apiSuccess({ message: '已投过票，不可重复', existing_vote: existing.vote });
      }

      const voteId = uuidv4().replace(/-/g, '').slice(0, 16);
      db.prepare(`INSERT INTO resource_votes (id, resource_id, voter_id, voter_type, vote) VALUES (?, ?, ?, 'ai', ?)`)
        .run(voteId, resource_id, userId, vote);

      // 有用投票奖励发布者
      if (vote === 'useful' && resource.provider_id) {
        transferSeed(resource.provider_id, 1, 'auto_feedback', {
          refId: resource_id,
          description: `AI 自动反馈: ${resource.title?.slice(0, 30)}`,
        });
      }

      const useful = (db.prepare("SELECT COUNT(*) as c FROM resource_votes WHERE resource_id = ? AND vote = 'useful'").get(resource_id) as any).c;
      const useless = (db.prepare("SELECT COUNT(*) as c FROM resource_votes WHERE resource_id = ? AND vote = 'useless'").get(resource_id) as any).c;

      return apiSuccess({ resource_id, vote, useful_count: useful, useless_count: useless, voter_type: 'ai' });

    } else if (resource_type === 'chapter') {
      // 章节投票（复用 Phase 0 投票系统）
      const chapter = db.prepare('SELECT id, author_id, title FROM chapters WHERE id = ?').get(resource_id) as any;
      if (!chapter) return apiError('NOT_FOUND', '章节不存在', 404);

      const existing = db.prepare('SELECT vote_type FROM chapter_votes WHERE chapter_id = ? AND user_id = ?')
        .get(resource_id, userId) as any;
      if (existing) {
        return apiSuccess({ message: '已投过票', existing_vote: existing.vote_type });
      }

      const voteId = uuidv4();
      db.prepare(`INSERT INTO chapter_votes (id, user_id, chapter_id, novel_id, vote_type) VALUES (?, ?, ?, (SELECT novel_id FROM chapters WHERE id = ?), ?)`)
        .run(voteId, userId, resource_id, resource_id, vote === 'useful' ? 'useful' : 'useless');

      if (vote === 'useful' && chapter.author_id) {
        transferSeed(chapter.author_id, 1, 'auto_feedback', {
          refId: resource_id,
          description: `AI 自动反馈: ${chapter.title?.slice(0, 30)}`,
        });
      }

      return apiSuccess({ resource_id, vote, voter_type: 'ai' });

    } else if (resource_type === 'opportunity') {
      // 商机投票
      const opp = db.prepare('SELECT id, author_id, title FROM opportunities WHERE id = ? AND is_active = 1').get(resource_id) as any;
      if (!opp) return apiError('NOT_FOUND', '商机不存在', 404);

      const existing = db.prepare('SELECT vote FROM opportunity_votes WHERE opportunity_id = ? AND voter_id = ?')
        .get(resource_id, userId) as any;
      if (existing) return apiSuccess({ message: '已投过票', existing_vote: existing.vote });

      const voteId = uuidv4().replace(/-/g, '').slice(0, 16);
      db.prepare(`INSERT INTO opportunity_votes (id, opportunity_id, voter_id, voter_type, vote) VALUES (?, ?, ?, 'ai', ?)`)
        .run(voteId, resource_id, userId, vote);

      if (vote === 'useful' && opp.author_id) {
        transferSeed(opp.author_id, 1, 'auto_feedback', {
          refId: resource_id,
          description: `AI 自动反馈: ${opp.title?.slice(0, 30)}`,
        });
      }

      return apiSuccess({ resource_id, vote, voter_type: 'ai' });

    } else {
      return apiError('VALIDATION_INVALID_PARAM', '不支持的 resource_type，可选: resource / chapter / opportunity', 400);
    }
  } catch (error: any) {
    console.error('[Auto Feedback] Error:', error);
    if (error.message?.includes('余额不足')) {
      return apiError('SEED_INSUFFICIENT', 'SEED 余额不足', 402);
    }
    return apiError('INTERNAL_ERROR', '自动反馈失败', 500);
  }
}
