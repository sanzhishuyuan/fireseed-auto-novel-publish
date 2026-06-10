import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { transferSeed } from '@/lib/seed';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getUserIdFromRequest } from '@/lib/auth';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

/**
 * POST /api/opportunities/[id]/vote
 * 商机投票（有用/无用，AI Agent 也可以投票）
 *
 * Body: { vote: 'useful' | 'useless' }
 * Auth: 需要登录（Cookie 或 Bearer Token）
 * 经济: 投 useful → 发布者 +1 SEED
 */
export const POST = withRoute({ auth: 'user', body: true }, async (request, ctx) => {
  const { id } = ctx.params!;
  const userId = ctx.user.id;

  const rl = checkRateLimit(request, `oppvote:${userId}`, 'read');
  const rlResp = rateLimitResponse(rl);
  if (rlResp) return rlResp;

  const { vote } = ctx.body;
  if (!['useful', 'useless'].includes(vote)) {
    return apiError('VALIDATION_INVALID_PARAM', '无效的投票类型', 400);
  }

  // 查商机
  const opp = db.prepare(
    'SELECT id, author_id, title FROM opportunities WHERE id = ? AND is_active = 1'
  ).get(id) as any;
  if (!opp) return apiError('NOT_FOUND', '商机不存在', 404);
  if (opp.author_id === userId) return apiError('SELF_VOTE', '不能给自己投票', 400);

  // 查已有投票（UPSERT）
  const existing = db.prepare(
    'SELECT vote FROM opportunity_votes WHERE opportunity_id = ? AND voter_id = ?'
  ).get(id, userId) as any;

  db.transaction(() => {
    if (existing) {
      // 切换投票：先撤回旧影响
      if (existing.vote === 'useful') {
        db.prepare('UPDATE opportunities SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').run(id);
        if (opp.author_id) transferSeed(opp.author_id, -1, 'opp_vote', { refId: id, description: '撤回有用投票' });
      } else {
        db.prepare('UPDATE opportunities SET downvotes = MAX(0, downvotes - 1) WHERE id = ?').run(id);
      }
      db.prepare('UPDATE opportunity_votes SET vote = ? WHERE opportunity_id = ? AND voter_id = ?')
        .run(vote, id, userId);
    } else {
      const voteId = require('crypto').randomUUID().replace(/-/g, '').slice(0, 16);
      const authHeader = request.headers.get('Authorization') || '';
      const voterType = authHeader.startsWith('Bearer ') ? 'ai' : 'user';
      db.prepare('INSERT INTO opportunity_votes (id, opportunity_id, voter_id, voter_type, vote) VALUES (?, ?, ?, ?, ?)')
        .run(voteId, id, userId, voterType, vote);
    }

    // 新投票影响
    if (vote === 'useful') {
      db.prepare('UPDATE opportunities SET upvotes = upvotes + 1 WHERE id = ?').run(id);
      if (opp.author_id) {
        transferSeed(opp.author_id, 1, 'opp_vote', {
          refId: id,
          description: `商机获有用投票: ${opp.title?.slice(0, 50)}`,
        });
      }
    } else {
      db.prepare('UPDATE opportunities SET downvotes = downvotes + 1 WHERE id = ?').run(id);
    }
  })();

  const counts = db.prepare('SELECT upvotes, downvotes FROM opportunities WHERE id = ?').get(id) as any;
  return apiSuccess({ upvotes: counts.upvotes, downvotes: counts.downvotes, user_vote: vote });
});

/**
 * GET /api/opportunities/[id]/vote
 * 获取投票统计
 */
export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  const { id } = ctx.params!;
  const counts = db.prepare('SELECT upvotes, downvotes FROM opportunities WHERE id = ?').get(id) as any;
  if (!counts) return apiError('NOT_FOUND', '商机不存在', 404);

  const userId = getUserIdFromRequest(request);
  let userVote: string | null = null;
  if (userId) {
    const v = db.prepare('SELECT vote FROM opportunity_votes WHERE opportunity_id = ? AND voter_id = ?')
      .get(id, userId) as any;
    if (v) userVote = v.vote;
  }

  return apiSuccess({ ...counts, user_vote: userVote });
});
