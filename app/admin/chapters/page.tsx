import { cookies } from 'next/headers';
import { verifyAdminToken, JWT_SECRET } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import HideHeader from '@/components/HideHeader';
import ChapterEditor from './ChapterEditor';

export const dynamic = 'force-dynamic';

export default async function ChaptersPage({
  searchParams,
}: {
  searchParams?: { novel?: string };
}) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;
  const isAdmin = verifyAdminToken(adminToken || '');

  if (!isAdmin) {
    redirect('/admin');
  }

  const defaultNovel = searchParams?.novel || '';

  // 提取管理员角色
  let adminRole = 'admin';
  try {
    const decoded = jwt.verify(adminToken || '', JWT_SECRET) as { role?: string };
    if (decoded.role) adminRole = decoded.role;
  } catch {}

  // 数据库优先（兼容 API 上传的小说）
  const novels = db.prepare('SELECT id, title FROM novels WHERE deleted_at IS NULL ORDER BY updated_at DESC').all() as { id: string; title: string }[];

  return (
    <div className="min-h-screen" style={{ background: '#0b0b0f' }}>
      <HideHeader />
      <header className="sticky top-0 z-50" style={{ background: 'rgba(11,11,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/admin/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,165,92,0.12)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#c9a55c" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </a>
          <h1 className="text-base font-semibold" style={{ color: '#f0ece4', fontFamily: "'Fraunces', Georgia, serif" }}>章节管理</h1>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <ChapterEditor novels={novels} defaultNovel={defaultNovel} adminRole={adminRole} />
      </div>
    </div>
  );
}
