import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllNovelIds } from '@/lib/novels';
import db from '@/lib/db';
import HideHeader from '@/components/HideHeader';
import NovelEditor from './NovelEditor';

export const dynamic = 'force-dynamic';

interface NovelItem {
  id: string;
  title: string;
  author?: string;
  description?: string;
  cover_url?: string;
  status?: string;
  tags?: string;
  orphan?: boolean; // 标记：只有文件系统记录，无数据库记录
}

export default async function NovelsAdminPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;
  const isAdmin = verifyAdminToken(adminToken || '');

  if (!isAdmin) {
    redirect('/admin');
  }

  // 1. 数据库小说
  const dbNovels = db.prepare('SELECT id, title, author, description, cover_url, status, tags FROM novels WHERE deleted_at IS NULL ORDER BY updated_at DESC').all() as { id: string; title: string; author?: string; description?: string; cover_url?: string; status?: string; tags?: string }[];
  const dbNovelIds = new Set(dbNovels.map(n => n.id));

  // 2. 文件系统小说（排除已在数据库中的）
  const fileNovels = getAllNovelIds();
  const orphanNovels: NovelItem[] = fileNovels
    .filter(n => !dbNovelIds.has(n.id))
    .map(n => ({
      id: n.id,
      title: n.title || n.id,
      author: n.author || 'AI创作',
      description: n.description || '',
      status: n.status || 'ongoing',
      tags: n.tags || '',
      orphan: true
    }));

  // 3. 合并：数据库小说在前，孤立小说在后
  const novels: NovelItem[] = [...dbNovels, ...orphanNovels];

  return (
    <div className="min-h-screen" style={{ background: '#0b0b0f' }}>
      <HideHeader />
      <header className="sticky top-0 z-50" style={{ background: 'rgba(11,11,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/admin/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,165,92,0.12)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#c9a55c" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </a>
          <h1 className="text-base font-semibold" style={{ color: '#f0ece4', fontFamily: "'Fraunces', Georgia, serif" }}>小说管理</h1>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <NovelEditor novels={novels} />
      </div>
    </div>
  );
}
