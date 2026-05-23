import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import ResourceManager from './ResourceManager';

export const dynamic = 'force-dynamic';

export default async function AdminResourcesPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;
  if (!verifyAdminToken(adminToken || '')) {
    redirect('/admin');
  }

  // 获取各状态资源数量
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM trusted_resources GROUP BY status
  `).all() as { status: string; count: number }[];

  const statusCountMap: Record<string, number> = {};
  for (const item of statusCounts) {
    statusCountMap[item.status] = item.count;
  }

  // 最近提交的资源（不限状态，后20条）
  const recentResources = db.prepare(`
    SELECT * FROM trusted_resources ORDER BY created_at DESC LIMIT 50
  `).all() as any[];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/admin/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </a>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>资源管理</h1>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <ResourceManager
          resources={recentResources}
          statusCounts={statusCountMap}
        />
      </div>
    </div>
  );
}
