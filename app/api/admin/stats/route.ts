import { NextRequest } from 'next/server';
import { withRoute, type AdminContext } from '@/lib/with-route';
import { apiSuccess } from '@/lib/api-response';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * 获取网站核心统计数据（Viewer 及以上可查看）
 */
export const GET = withRoute({ auth: 'admin', permission: 'dashboard.view' }, async (request, ctx: AdminContext) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 用户统计
  const userStats = {
    total: (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count,
    newToday: (db.prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= ?').get(todayStart) as { count: number }).count,
    newThisWeek: (db.prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= ?').get(thisWeekStart) as { count: number }).count,
    newThisMonth: (db.prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= ?').get(thisMonthStart) as { count: number }).count,
  };

  // 小说统计（直接查数据库，不遍历文件系统）
  const novelCount = (db.prepare('SELECT COUNT(*) as count FROM novels WHERE deleted_at IS NULL').get() as { count: number }).count;
  const chapterStats = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(c.word_count), 0) as words FROM chapters c INNER JOIN novels n ON c.novel_id = n.id WHERE n.deleted_at IS NULL').get() as { count: number; words: number };
  const totalChapters = chapterStats.count;
  const totalWords = chapterStats.words;

  // 今日更新统计
  const todayChapters = db.prepare(`
    SELECT COUNT(*) as count FROM chapters c INNER JOIN novels n ON c.novel_id = n.id
    WHERE n.deleted_at IS NULL AND c.created_at >= ?
  `).get(todayStart) as { count: number };
  const todayWords = db.prepare(`
    SELECT SUM(c.word_count) as total FROM chapters c INNER JOIN novels n ON c.novel_id = n.id
    WHERE n.deleted_at IS NULL AND c.created_at >= ?
  `).get(todayStart) as { total: number | null };

  // 待清理统计（软删除）
  const pendingCleanup = db.prepare(`
    SELECT COUNT(*) as count FROM novels 
    WHERE deleted_at IS NOT NULL
    AND datetime(deleted_at, '+' || retention_days || ' days') > datetime('now')
  `).get() as { count: number };

  const readyToCleanup = db.prepare(`
    SELECT COUNT(*) as count FROM novels 
    WHERE deleted_at IS NOT NULL
    AND datetime(deleted_at, '+' || retention_days || ' days') <= datetime('now')
  `).get() as { count: number };

  // API 请求统计（今日）
  const todayApiCalls = (db.prepare(`
    SELECT COUNT(*) as count FROM ai_jobs 
    WHERE created_at >= ?
  `).get(todayStart) as { count: number }).count;

  // Token 使用统计（安全处理可能缺失的列）
  let tokenStats = {
    total: 0,
    active: 0,
    usedToday: 0,
  };
  try {
    const tokenCount = db.prepare('SELECT COUNT(*) as count FROM ai_tokens').get() as { count: number } | undefined;
    const activeCount = db.prepare('SELECT COUNT(*) as count FROM ai_tokens WHERE is_active = 1').get() as { count: number } | undefined;
    tokenStats = {
      total: tokenCount?.count || 0,
      active: activeCount?.count || 0,
      usedToday: 0, // quota_used 列可能不存在
    };
  } catch {
    // ignore - 列可能不存在
  }

  // 读者互动统计
  const interactionStats = {
    favorites: (db.prepare('SELECT COUNT(*) as count FROM favorites').get() as { count: number }).count,
    comments: (db.prepare('SELECT COUNT(*) as count FROM comments').get() as { count: number }).count,
    customBranches: (db.prepare("SELECT COUNT(*) as count FROM custom_branches WHERE status = 'pending'").get() as { count: number }).count,
  };

  // 系统运行时间（近似）
  const serverUptime = {
    serverStarted: (db.prepare('SELECT MIN(created_at) as earliest FROM ai_jobs').get() as { earliest: string | null }).earliest || now.toISOString(),
    dbCreated: (db.prepare('SELECT MIN(created_at) as earliest FROM users').get() as { earliest: string | null }).earliest || now.toISOString(),
  };

  return apiSuccess({
    overview: {
      totalUsers: userStats.total,
      totalNovels: novelCount,
      totalChapters,
      totalWords,
    },
    growth: {
      newUsersToday: userStats.newToday,
      newUsersThisWeek: userStats.newThisWeek,
      newUsersThisMonth: userStats.newThisMonth,
      newChaptersToday: todayChapters.count,
      newWordsToday: todayWords.total || 0,
    },
    pendingTasks: {
      deletedNovelsPending: pendingCleanup.count,
      deletedNovelsReady: readyToCleanup.count,
      pendingCustomBranches: interactionStats.customBranches,
    },
    apiUsage: {
      callsToday: todayApiCalls,
      activeTokens: tokenStats.active,
      usedTokensToday: tokenStats.usedToday,
    },
    interaction: {
      favorites: interactionStats.favorites,
      comments: interactionStats.comments,
    },
    system: serverUptime,
  });
});
