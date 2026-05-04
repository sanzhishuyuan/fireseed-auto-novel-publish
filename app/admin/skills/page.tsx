import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import SkillManager from './SkillManager';

export const dynamic = 'force-dynamic';

interface Mission {
  id: string;
  type: string;
  title: string;
  description: string;
  link: string;
  icon_emoji: string;
  priority: number;
  user_filter: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface ActivationStats {
  total: number;
  today: number;
  this_week: number;
  by_version: { version: string; count: number }[];
  recent: any[];
}

export default async function SkillsAdminPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;
  if (!verifyAdminToken(adminToken || '')) {
    redirect('/admin');
  }

  const missions = db.prepare('SELECT * FROM skill_missions ORDER BY priority ASC').all() as Mission[];

  // Activation stats
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

  // Novel/token conversion stats
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const usersWithNovels = (db.prepare('SELECT COUNT(DISTINCT author_id) as c FROM novels WHERE author_id IS NOT NULL AND deleted_at IS NULL').get() as { c: number }).c;
  const totalNovels = (db.prepare('SELECT COUNT(*) as c FROM novels WHERE deleted_at IS NULL').get() as { c: number }).c;
  const eventsToday = (db.prepare("SELECT COUNT(*) as c FROM skill_events WHERE date(created_at) = date('now')").get() as { c: number }).c;

  const activationStats: ActivationStats & { totalUsers: number; authorsWithNovels: number; eventsToday: number } = {
    total, today, this_week: thisWeek, by_version: byVersion, recent,
    totalUsers, authorsWithNovels: usersWithNovels, eventsToday
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/admin/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </a>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>技能管理</h1>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <SkillManager missions={missions} activationStats={activationStats} />
      </div>
    </div>
  );
}
