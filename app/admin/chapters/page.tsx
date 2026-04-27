import { cookies } from 'next/headers';
import { ADMIN_PASSWORD } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllNovelIds, getNovelMeta } from '@/lib/novels';
import ChapterEditor from './ChapterEditor';

export const dynamic = 'force-dynamic';

export default async function ChaptersPage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_auth')?.value === ADMIN_PASSWORD;

  if (!isAdmin) {
    redirect('/admin');
  }

  const novelIds = getAllNovelIds();
  const novels = novelIds.map(id => ({ id, ...getNovelMeta(id) }));

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
