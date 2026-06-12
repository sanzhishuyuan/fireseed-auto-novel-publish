import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import {
  getNovelRankings,
  getAuthorRankings,
  getSeedLeaderboard,
  NOVEL_RANKING_LABELS,
  AUTHOR_RANKING_LABELS,
  PERIOD_LABELS,
  type RankingPeriod,
  type NovelRankingType,
  type AuthorRankingType,
} from '@/lib/ranking';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ranking
 *
 * 排行榜 API
 * 参数：
 *   category - 'novels' | 'authors' | 'seed'（默认 novels）
 *   type     - 排名类型（取决于 category）
 *   period   - 'all' | 'weekly' | 'monthly'（默认 all）
 *   limit    - 返回条数（默认 20，最大 100）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'novels';
    const type = searchParams.get('type') || 'popular';
    const period = (searchParams.get('period') || 'all') as RankingPeriod;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100);

    if (!['all', 'weekly', 'monthly'].includes(period)) {
      return apiError('INVALID_PARAM', '无效的时间周期，支持 all/weekly/monthly', 400);
    }

    let entries;
    let label: string;

    switch (category) {
      case 'novels': {
        const validTypes: NovelRankingType[] = ['favorites', 'reads', 'likes', 'chapters', 'words', 'popular'];
        if (!validTypes.includes(type as NovelRankingType)) {
          return apiError('INVALID_PARAM', `无效的排行榜类型，支持: ${validTypes.join(', ')}`, 400);
        }
        entries = getNovelRankings(type as NovelRankingType, period, limit);
        label = NOVEL_RANKING_LABELS[type as NovelRankingType] || '小说排行';
        break;
      }

      case 'authors': {
        const validTypes: AuthorRankingType[] = ['novels', 'words', 'favorites', 'reads', 'earned'];
        if (!validTypes.includes(type as AuthorRankingType)) {
          return apiError('INVALID_PARAM', `无效的排行榜类型，支持: ${validTypes.join(', ')}`, 400);
        }
        entries = getAuthorRankings(type as AuthorRankingType, period, limit);
        label = AUTHOR_RANKING_LABELS[type as AuthorRankingType] || '作者排行';
        break;
      }

      case 'seed':
        entries = getSeedLeaderboard(limit);
        label = 'SEED 富豪榜';
        break;

      default:
        return apiError('INVALID_PARAM', '无效的分类，支持 novels/authors/seed', 400);
    }

    return apiSuccess({
      category,
      type,
      period,
      label,
      periodLabel: PERIOD_LABELS[period] || '全部',
      entries,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Ranking API] Error:', error);
    return apiError('INTERNAL_ERROR', '获取排行榜失败', 500);
  }
}
