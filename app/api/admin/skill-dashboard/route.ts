import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  // 任务列表
  const missions = db.prepare('SELECT * FROM skill_missions ORDER BY priority ASC').all();

  // 激活统计
  const total = (db.prepare('SELECT COUNT(*) as c FROM skill_activations').get() as { c: number }).c;
  const today = (db.prepare("SELECT COUNT(*) as c FROM skill_activations WHERE date(created_at) = date('now')").get() as { c: number }).c;
  const thisWeek = (db.prepare("SELECT COUNT(*) as c FROM skill_activations WHERE created_at >= datetime('now', '-7 days')").get() as { c: number }).c;
  const byVersion = db.prepare(`
    SELECT skill_version as version, COUNT(*) as count FROM skill_activations GROUP BY skill_version ORDER BY count DESC
  `).all() as { version: string; count: number }[];
  const recent = db.prepare(`
    SELECT sa.*, u.username FROM skill_activations sa
    LEFT JOIN users u ON sa.user_id = u.id
    ORDER BY sa.created_at DESC LIMIT 50
  `).all() as any[];

  // 转化数据
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const usersWithNovels = (db.prepare('SELECT COUNT(DISTINCT author_id) as c FROM novels WHERE author_id IS NOT NULL AND deleted_at IS NULL').get() as { c: number }).c;
  const eventsToday = (db.prepare("SELECT COUNT(*) as c FROM skill_events WHERE date(created_at) = date('now')").get() as { c: number }).c;
  const totalNovels = (db.prepare('SELECT COUNT(*) as c FROM novels WHERE deleted_at IS NULL').get() as { c: number }).c;

  // 最近活跃用户（每个用户最近一次激活时间，取100个）
  const activeUsers = db.prepare(`
    SELECT u.id, u.username, u.nickname, u.created_at as registered_at,
      MAX(sa.created_at) as last_active_at,
      COUNT(sa.id) as activation_count,
      (SELECT COUNT(*) FROM novels WHERE author_id = u.id AND deleted_at IS NULL) as novels_count
    FROM skill_activations sa
    JOIN users u ON sa.user_id = u.id
    GROUP BY u.id
    ORDER BY last_active_at DESC
    LIMIT 100
  `).all() as any[];

  return NextResponse.json({
    missions,
    activationStats: { total, today, this_week: thisWeek, by_version: byVersion, recent, totalUsers, authorsWithNovels: usersWithNovels, eventsToday },
    activeUsers,
    conversion: {
      totalUsers,
      usersWithNovels,
      totalNovels,
      conversionRate: totalUsers > 0 ? ((usersWithNovels / totalUsers) * 100).toFixed(1) : '0.0',
    }
  });
}
