import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/daily-stats
 * 每日运营简报数据（需管理员权限）
 * 
 * 返回：
 * - 总小说数 / 总章节数 / 总字数
 * - 昨日新增小说 / 昨日新增章节 / 昨日新增字数
 * - 昨日注册用户数
 * - 昨日技能激活数
 * - 昨日活跃作者数
 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request, 'dashboard.view');
  if (admin instanceof Response) return admin;

  try {
    const now = new Date();
    // 昨天的起始时间（00:00:00）
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(now);
    yesterdayEnd.setHours(0, 0, 0, 0); // 今天的 00:00:00
    // 7天前的起始时间
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const yesterdayStartStr = yesterdayStart.toISOString();
    const yesterdayEndStr = yesterdayEnd.toISOString();
    const weekAgoStr = weekAgo.toISOString();

    // ===== 累计数据 =====
    const totalNovels = (db.prepare('SELECT COUNT(*) as c FROM novels WHERE deleted_at IS NULL').get() as { c: number }).c;
    const totalChapters = (db.prepare('SELECT COUNT(*) as c FROM chapters').get() as { c: number }).c;
    const totalWords = (db.prepare('SELECT COALESCE(SUM(word_count), 0) as t FROM chapters').get() as { t: number }).t;
    const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
    const totalAuthors = (db.prepare('SELECT COUNT(DISTINCT author_id) as c FROM novels WHERE author_id IS NOT NULL AND deleted_at IS NULL').get() as { c: number }).c;

    // ===== 昨日新增 =====
    const yesterdayNovels = (db.prepare(
      "SELECT COUNT(*) as c FROM novels WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?"
    ).get(yesterdayStartStr, yesterdayEndStr) as { c: number }).c;

    const yesterdayChapters = (db.prepare(
      "SELECT COUNT(*) as c FROM chapters WHERE created_at >= ? AND created_at < ?"
    ).get(yesterdayStartStr, yesterdayEndStr) as { c: number }).c;

    const yesterdayWords = (db.prepare(
      "SELECT COALESCE(SUM(word_count), 0) as t FROM chapters WHERE created_at >= ? AND created_at < ?"
    ).get(yesterdayStartStr, yesterdayEndStr) as { t: number }).t;

    const yesterdayUsers = (db.prepare(
      "SELECT COUNT(*) as c FROM users WHERE created_at >= ? AND created_at < ?"
    ).get(yesterdayStartStr, yesterdayEndStr) as { c: number }).c;

    // 昨日技能激活数
    const yesterdayActivations = (db.prepare(
      "SELECT COUNT(*) as c FROM skill_activations WHERE created_at >= ? AND created_at < ?"
    ).get(yesterdayStartStr, yesterdayEndStr) as { c: number }).c;

    // 昨日发表过章节的作者数（活跃作者）
    const yesterdayActiveAuthors = (db.prepare(`
      SELECT COUNT(DISTINCT c.author_id) as c FROM chapters c 
      WHERE c.created_at >= ? AND c.created_at < ? AND c.author_id IS NOT NULL
    `).get(yesterdayStartStr, yesterdayEndStr) as { c: number }).c;

    // ===== 7天趋势 =====
    const weekNovels = (db.prepare(
      "SELECT COUNT(*) as c FROM novels WHERE deleted_at IS NULL AND created_at >= ?"
    ).get(weekAgoStr) as { c: number }).c;

    const weekUsers = (db.prepare(
      "SELECT COUNT(*) as c FROM users WHERE created_at >= ?"
    ).get(weekAgoStr) as { c: number }).c;

    const weekWords = (db.prepare(
      "SELECT COALESCE(SUM(word_count), 0) as t FROM chapters WHERE created_at >= ?"
    ).get(weekAgoStr) as { t: number }).t;

    // ===== 聊天社区 =====
    const totalMessages = (db.prepare('SELECT COUNT(*) as c FROM chat_messages').get() as { c: number }).c;
    const yesterdayMessages = (db.prepare(
      "SELECT COUNT(*) as c FROM chat_messages WHERE created_at >= ? AND created_at < ?"
    ).get(yesterdayStartStr, yesterdayEndStr) as { c: number }).c;

    return NextResponse.json({
      success: true,
      date: yesterdayStart.toISOString().slice(0, 10),
      cumulative: {
        totalNovels,
        totalChapters,
        totalWords,
        totalUsers,
        totalAuthors,
        totalMessages,
      },
      yesterday: {
        newNovels: yesterdayNovels,
        newChapters: yesterdayChapters,
        newWords: yesterdayWords,
        newUsers: yesterdayUsers,
        newActivations: yesterdayActivations,
        activeAuthors: yesterdayActiveAuthors,
        newMessages: yesterdayMessages,
      },
      weekTrend: {
        newNovels: weekNovels,
        newUsers: weekUsers,
        newWords: weekWords,
      },
    });
  } catch (error) {
    console.error('Daily stats error:', error);
    return NextResponse.json({ success: false, error: '获取数据失败' }, { status: 500 });
  }
}
