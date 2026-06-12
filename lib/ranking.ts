/**
 * FireSeed 排行榜系统
 *
 * 支持小说排行榜（收藏/阅读/点赞/章节数/字数/综合热度）
 * 和作者排行榜（作品数/总字数/总收藏/总收入）
 * 以及 SEED 富豪榜（复用 lib/seed 中的 getLeaderboard）
 *
 * 所有维度支持全部/本周/本月三种时间周期。
 */

import db from './db';
import { getLeaderboard } from './seed';

// ===== 类型定义 =====

export type RankingPeriod = 'all' | 'weekly' | 'monthly';
export type NovelRankingType = 'favorites' | 'reads' | 'likes' | 'chapters' | 'words' | 'popular';
export type AuthorRankingType = 'novels' | 'words' | 'favorites' | 'reads' | 'earned';

export interface RankingEntry {
  rank: number;
  targetId: string;
  title: string;
  subtitle: string;
  score: number;
  scoreLabel: string;
  extra?: Record<string, unknown>;
}

export interface RankingData {
  type: string;
  period: RankingPeriod;
  entries: RankingEntry[];
  updatedAt: string;
}

// ===== 时间周期工具 =====

function getPeriodDateRange(period: RankingPeriod): { startDate: string | null } {
  const now = new Date();
  switch (period) {
    case 'weekly': {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: weekAgo.toISOString() };
    }
    case 'monthly': {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: monthAgo.toISOString() };
    }
    default:
      return { startDate: null };
  }
}

function formatScore(value: number): string {
  if (value >= 10000) return (value / 10000).toFixed(1) + 'w';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
  return value.toString();
}

// ===== 小说排行榜 =====

export function getNovelRankings(
  type: NovelRankingType,
  period: RankingPeriod = 'all',
  limit: number = 20
): RankingEntry[] {
  const { startDate } = getPeriodDateRange(period);
  const timeFilter = startDate ? `AND n.created_at >= '${startDate}'` : '';
  const periodFilter = startDate ? `AND created_at >= '${startDate}'` : '';

  let query: string;
  let params: unknown[] = [limit];

  switch (type) {
    case 'favorites':
      query = `
        SELECT n.id, n.title, n.author, n.tags, COUNT(f.id) as score
        FROM novels n
        LEFT JOIN favorites f ON f.novel_id = n.id ${periodFilter.replace(/AND/, 'AND f')}
        WHERE n.deleted_at IS NULL
        GROUP BY n.id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    case 'reads':
      query = `
        SELECT n.id, n.title, n.author, n.tags, COUNT(DISTINCT up.user_id) as score
        FROM novels n
        LEFT JOIN user_progress up ON up.novel_id = n.id ${periodFilter.replace(/AND/, 'AND up')}
        WHERE n.deleted_at IS NULL
        GROUP BY n.id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    case 'likes':
      query = `
        SELECT n.id, n.title, n.author, n.tags, COUNT(nl.id) as score
        FROM novels n
        LEFT JOIN novel_likes nl ON nl.novel_id = n.id ${periodFilter.replace(/AND/, 'AND nl')}
        WHERE n.deleted_at IS NULL
        GROUP BY n.id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    case 'chapters':
      query = `
        SELECT n.id, n.title, n.author, n.tags, COUNT(c.id) as score
        FROM novels n
        LEFT JOIN chapters c ON c.novel_id = n.id ${periodFilter.replace(/AND/, 'AND c')}
        WHERE n.deleted_at IS NULL
        GROUP BY n.id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    case 'words':
      query = `
        SELECT n.id, n.title, n.author, n.tags, COALESCE(SUM(c.word_count), 0) as score
        FROM novels n
        LEFT JOIN chapters c ON c.novel_id = n.id ${periodFilter.replace(/AND/, 'AND c')}
        WHERE n.deleted_at IS NULL
        GROUP BY n.id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    case 'popular':
      // 综合热度 = 收藏*10 + 阅读*3 + 点赞*5 + 章节数*2
      query = `
        SELECT n.id, n.title, n.author, n.tags,
          COALESCE(f.cnt, 0) * 10 + COALESCE(r.cnt, 0) * 3 + COALESCE(l.cnt, 0) * 5 + COALESCE(c.cnt, 0) * 2 as score
        FROM novels n
        LEFT JOIN (SELECT novel_id, COUNT(*) as cnt FROM favorites GROUP BY novel_id) f ON f.novel_id = n.id
        LEFT JOIN (SELECT novel_id, COUNT(DISTINCT user_id) as cnt FROM user_progress GROUP BY novel_id) r ON r.novel_id = n.id
        LEFT JOIN (SELECT novel_id, COUNT(*) as cnt FROM novel_likes GROUP BY novel_id) l ON l.novel_id = n.id
        LEFT JOIN (SELECT novel_id, COUNT(*) as cnt FROM chapters GROUP BY novel_id) c ON c.novel_id = n.id
        WHERE n.deleted_at IS NULL
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    default:
      return [];
  }

  const rows = db.prepare(query).all(...params) as { id: string; title: string; author: string; tags: string; score: number }[];

  return rows.map((row, idx) => ({
    rank: idx + 1,
    targetId: row.id,
    title: row.title,
    subtitle: row.author || '匿名作者',
    score: row.score,
    scoreLabel: formatScore(row.score),
    extra: { tags: row.tags },
  }));
}

// ===== 作者排行榜 =====

export function getAuthorRankings(
  type: AuthorRankingType,
  period: RankingPeriod = 'all',
  limit: number = 20
): RankingEntry[] {
  const { startDate } = getPeriodDateRange(period);
  const timeFilter = startDate ? `AND n.created_at >= '${startDate}'` : '';

  let query: string;
  let params: unknown[] = [limit];

  switch (type) {
    case 'novels':
      query = `
        SELECT u.id, u.username, u.nickname, COUNT(n.id) as score
        FROM users u
        INNER JOIN novels n ON n.author_id = u.id AND n.deleted_at IS NULL ${timeFilter}
        GROUP BY u.id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    case 'words':
      query = `
        SELECT u.id, u.username, u.nickname, COALESCE(SUM(c.word_count), 0) as score
        FROM users u
        INNER JOIN novels n ON n.author_id = u.id AND n.deleted_at IS NULL
        LEFT JOIN chapters c ON c.novel_id = n.id
        GROUP BY u.id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    case 'favorites':
      query = `
        SELECT u.id, u.username, u.nickname, COUNT(f.id) as score
        FROM users u
        INNER JOIN novels n ON n.author_id = u.id AND n.deleted_at IS NULL
        LEFT JOIN favorites f ON f.novel_id = n.id
        GROUP BY u.id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    case 'reads':
      query = `
        SELECT u.id, u.username, u.nickname, COUNT(DISTINCT up.user_id) as score
        FROM users u
        INNER JOIN novels n ON n.author_id = u.id AND n.deleted_at IS NULL
        LEFT JOIN user_progress up ON up.novel_id = n.id
        GROUP BY u.id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    case 'earned':
      query = `
        SELECT u.id, u.username, u.nickname, COALESCE(w.total_earned, 0) as score
        FROM users u
        LEFT JOIN wallets w ON w.user_id = u.id
        WHERE (SELECT COUNT(*) FROM novels WHERE author_id = u.id AND deleted_at IS NULL) > 0
        ORDER BY score DESC
        LIMIT ?
      `;
      break;

    default:
      return [];
  }

  const rows = db.prepare(query).all(...params) as { id: string; username: string; nickname: string; score: number }[];

  return rows.map((row, idx) => ({
    rank: idx + 1,
    targetId: row.id,
    title: row.nickname || row.username,
    subtitle: '@' + row.username,
    score: row.score,
    scoreLabel: formatScore(row.score),
  }));
}

// ===== SEED 富豪榜（复用 lib/seed） =====

export function getSeedLeaderboard(limit: number = 20): RankingEntry[] {
  const entries = getLeaderboard(limit);
  return entries.map((entry, idx) => ({
    rank: idx + 1,
    targetId: entry.user_id,
    title: entry.username,
    subtitle: `累计收入 ${entry.total_earned.toLocaleString()} 🌾`,
    score: entry.balance,
    scoreLabel: '🌱 ' + entry.balance.toLocaleString(),
  }));
}

// ===== 排行榜元信息 =====

export const NOVEL_RANKING_LABELS: Record<NovelRankingType, string> = {
  favorites: '最多收藏',
  reads: '最多阅读',
  likes: '最多点赞',
  chapters: '章节最多',
  words: '字数最多',
  popular: '综合热度',
};

export const AUTHOR_RANKING_LABELS: Record<AuthorRankingType, string> = {
  novels: '作品最多',
  words: '总字数最多',
  favorites: '总收藏最多',
  reads: '最多读者',
  earned: '收入最高',
};

export const PERIOD_LABELS: Record<RankingPeriod, string> = {
  all: '全部',
  weekly: '本周',
  monthly: '本月',
};
