import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { transferSeed, getNovelAuthorId } from '@/lib/seed';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

const VALID_VOTES = ['useful', 'useless'] as const;
type VoteType = typeof VALID_VOTES[number];

/**
 * POST /api/chapters/[chapterId]/vote
 * 对章节投"有用/无用"票
 *
 * Body: { novel_id: string, vote: 'useful'|'useless', reason?: string }
 * Auth: Cookie (auth_token) 或 Bearer Token
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { chapterId } = await params;

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
    const { novel_id, vote, reason } = body;

    if (!novel_id) {
      return apiError('VALIDATION_REQUIRED', '缺少 novel_id', 400);
    }
    if (!vote || !VALID_VOTES.includes(vote as VoteType)) {
      return apiError('VALIDATION_INVALID_PARAM', `无效的投票类型，必须为 useful 或 useless`, 400);
    }
    if (vote === 'useless' && reason && reason.length > 500) {
      return apiError('VALIDATION_INVALID_PARAM', '原因过长，最多500字', 400);
    }

    // 4. 验证章节存在
    const chapter = db.prepare(
      'SELECT id, novel_id, author_id, title FROM chapters WHERE id = ? AND novel_id = ?'
    ).get(chapterId, novel_id) as any;

    if (!chapter) {
      return apiError('NOT_FOUND_CHAPTER', '章节不存在', 404);
    }

    // 5. 防自投
    if (chapter.author_id && chapter.author_id === userId) {
      return apiError('VALIDATION_SELF_VOTE', '不能给自己的章节评分', 400);
    }

    // 6. 检查是否已投票（允许切换投票）
    const existingVote = db.prepare(
      'SELECT id, vote_type FROM chapter_votes WHERE user_id = ? AND chapter_id = ?'
    ).get(userId, chapterId) as any;

    // 7. 如果是相同投票，直接返回（幂等）
    if (existingVote && existingVote.vote_type === vote) {
      const counts = getVoteCounts(chapterId);
      return apiSuccess({
        ...counts,
        user_vote: vote,
        message: vote === 'useful' ? '已标记为有用 👍' : '已标记为无用 👎',
      });
    }

    // 8. 执行投票事务
    const result = db.transaction(() => {
      if (existingVote) {
        // 更新已有投票
        const oldVote = existingVote.vote_type;

        // 如果之前投的是"有用"，作者失去奖励（扣回）
        if (oldVote === 'useful' && chapter.author_id) {
          transferSeed(chapter.author_id, -1, 'vote_reward', {
            refId: chapterId,
            description: `撤回有用评分: 《${chapter.title}》`,
          });
        }

        db.prepare(`
          UPDATE chapter_votes SET vote_type = ?, reason = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(vote, reason || null, existingVote.id);
      } else {
        // 新建投票
        const voteId = uuidv4();
        db.prepare(`
          INSERT INTO chapter_votes (id, user_id, chapter_id, novel_id, vote_type, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(voteId, userId, chapterId, novel_id, vote, reason || null);
      }

      // 9. 如果投"有用"且章节有作者，给作者 SEED 奖励
      if (vote === 'useful' && chapter.author_id) {
        transferSeed(chapter.author_id, 1, 'vote_reward', {
          refId: chapterId,
          description: `章节获有用评分: 《${chapter.title}》`,
        });
      }

      return true;
    })();

    // 10. 返回更新后的统计
    const counts = getVoteCounts(chapterId);

    return apiSuccess({
      ...counts,
      user_vote: vote,
      message: vote === 'useful' ? '👍 标记为有用！' : '👎 已标记',
    });
  } catch (error: any) {
    console.error('[Vote] Error:', error);

    // SEED 余额不足的特殊处理
    if (error.message?.includes('余额不足')) {
      return apiError('SEED_INSUFFICIENT', error.message, 402);
    }

    return apiError('INTERNAL_ERROR', '评分失败，请稍后重试', 500);
  }
}

/**
 * GET /api/chapters/[chapterId]/vote
 * 获取章节的投票统计
 *
 * Query: ?novel_id=xxx
 * Auth: 可选（已登录时返回 user_vote）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    const { searchParams } = new URL(request.url);
    const novel_id = searchParams.get('novel_id');

    if (!novel_id) {
      return apiError('VALIDATION_REQUIRED', '缺少 novel_id 参数', 400);
    }

    // 验证章节存在
    const chapter = db.prepare('SELECT id FROM chapters WHERE id = ? AND novel_id = ?')
      .get(chapterId, novel_id);
    if (!chapter) {
      return apiError('NOT_FOUND_CHAPTER', '章节不存在', 404);
    }

    const counts = getVoteCounts(chapterId);

    // 如果用户已登录，返回他们的投票
    const userId = getUserIdFromRequest(request);
    let userVote: string | null = null;

    if (userId) {
      const existing = db.prepare(
        'SELECT vote_type FROM chapter_votes WHERE user_id = ? AND chapter_id = ?'
      ).get(userId, chapterId) as any;
      if (existing) {
        userVote = existing.vote_type;
      }
    }

    return apiSuccess({ ...counts, user_vote: userVote });
  } catch (error) {
    console.error('[Vote] GET error:', error);
    return apiError('INTERNAL_ERROR', '获取评分失败', 500);
  }
}

/**
 * 获取章节投票统计
 */
function getVoteCounts(chapterId: string): { useful_count: number; useless_count: number } {
  const useful = db.prepare(
    "SELECT COUNT(*) as c FROM chapter_votes WHERE chapter_id = ? AND vote_type = 'useful'"
  ).get(chapterId) as { c: number };

  const useless = db.prepare(
    "SELECT COUNT(*) as c FROM chapter_votes WHERE chapter_id = ? AND vote_type = 'useless'"
  ).get(chapterId) as { c: number };

  return {
    useful_count: useful.c,
    useless_count: useless.c,
  };
}
