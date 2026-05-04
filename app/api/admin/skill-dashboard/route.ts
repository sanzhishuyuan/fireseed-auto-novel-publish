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

  return NextResponse.json({
    missions,
    activationStats: { total, today, this_week: thisWeek, by_version: byVersion, recent, totalUsers, authorsWithNovels: usersWithNovels, eventsToday },
    conversion: {
      totalUsers,
      usersWithNovels,
      totalNovels,
      conversionRate: totalUsers > 0 ? ((usersWithNovels / totalUsers) * 100).toFixed(1) : '0.0',
    }
  });
}
