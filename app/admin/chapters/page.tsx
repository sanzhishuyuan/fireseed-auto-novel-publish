import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import ChapterEditor from './ChapterEditor';

export const dynamic = 'force-dynamic';

export default async function ChaptersPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;
  const isAdmin = verifyAdminToken(adminToken || '');

  if (!isAdmin) {
    redirect('/admin');
  }

  // 数据库优先（兼容 API 上传的小说）
  const novels = db.prepare('SELECT id, title FROM novels WHERE deleted_at IS NULL ORDER BY updated_at DESC').all() as { id: string; title: string }[];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/admin/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </a>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>章节管理</h1>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <ChapterEditor novels={novels} />
      </div>
    </div>
  );
}
