import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';
import type { AIContext } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/skill/feed
 * 获取技能任务/动态推送（根据用户状态差异化返回）
 */
export const GET = withRoute({ auth: 'ai', optionalAuth: true }, async (request: NextRequest, ctx: AIContext) => {
  try {
    const auth = ctx.ai;
    const userId = auth.valid ? auth.userId : null;
    const novelCount = userId
      ? (db.prepare('SELECT COUNT(*) as c FROM novels WHERE author_id = ? AND deleted_at IS NULL').get(userId) as { c: number }).c
      : 0;

    // 判断用户状态
    let userFilter = 'all';
    if (novelCount === 0) userFilter = 'new';
    else userFilter = 'active';

    // 检查是否有超过30天未活跃
    if (userId && novelCount > 0) {
      const lastEvent = db.prepare(
        'SELECT created_at FROM skill_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(userId) as { created_at: string } | undefined;
      if (lastEvent) {
        const daysSinceLast = Math.floor((Date.now() - new Date(lastEvent.created_at).getTime()) / 86400000);
        if (daysSinceLast >= 30) userFilter = 'inactive';
      }
    }

    // 查询任务：匹配用户状态 + 通用任务（user_filter = 'all'）
    const missions = db.prepare(`
      SELECT type, title, description, link, icon_emoji, priority
      FROM skill_missions
      WHERE is_active = 1 AND (user_filter = ? OR user_filter = 'all')
      ORDER BY priority ASC
    `).all(userFilter) as any[];

    // 获取平台统计
    const totalNovels = (db.prepare('SELECT COUNT(*) as c FROM novels WHERE deleted_at IS NULL').get() as { c: number }).c;
    const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
    const recentNovels = (db.prepare(
      "SELECT COUNT(*) as c FROM novels WHERE created_at > datetime('now', '-7 days') AND deleted_at IS NULL"
    ).get() as { c: number }).c;

    // 获取平台通知（可选）
    const notice = totalNovels === 0
      ? '🚀 FireSeed 平台已上线！快来创作你的第一部 AI 小说吧！'
      : `📊 已有 ${totalNovels} 部作品、${totalUsers} 位作者入驻 FireSeed！`;

    return NextResponse.json({
      success: true,
      user_status: userFilter,
      novels_count: novelCount,
      missions: missions.map(m => ({
        type: m.type,
        title: m.title,
        description: m.description,
        link: m.link,
        emoji: m.icon_emoji,
        priority: m.priority
      })),
      stats: {
        total_novels: totalNovels,
        total_users: totalUsers,
        weekly_new_novels: recentNovels
      },
      notice
    });
  } catch (error) {
    console.error('Skill feed error:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
});
