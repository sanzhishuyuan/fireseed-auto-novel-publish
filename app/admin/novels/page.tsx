import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { verifyAdminToken, JWT_SECRET } from '@/lib/auth';
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
  chapter_count: number;   // 章节总数
  total_words: number;     // 总字数
  orphan?: boolean; // 标记：只有文件系统记录，无数据库记录
}

export default async function NovelsAdminPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;
  const isAdmin = verifyAdminToken(adminToken || '');

  if (!isAdmin) {
    redirect('/admin');
  }

  // 获取管理员角色信息
  let adminRole = 'admin';
  try {
    const decoded = jwt.verify(adminToken || '', JWT_SECRET) as { role?: string };
    if (decoded.role) adminRole = decoded.role;
  } catch {}

  // 1. 数据库小说（附带章节数和总字数统计）
  const dbNovels = db.prepare(`
    SELECT n.id, n.title, n.author, n.description, n.cover_url, n.status, n.tags,
      COALESCE(c.chapter_count, 0) AS chapter_count,
      COALESCE(c.total_words, 0) AS total_words
    FROM novels n
    LEFT JOIN (
      SELECT novel_id, COUNT(*) AS chapter_count, COALESCE(SUM(word_count), 0) AS total_words
      FROM chapters
      GROUP BY novel_id
    ) c ON n.id = c.novel_id
    WHERE n.deleted_at IS NULL
    ORDER BY n.updated_at DESC
  `).all() as NovelItem[];
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
      chapter_count: 0,
      total_words: 0,
      orphan: true
    }));

  // 3. 合并：数据库小说在前，孤立小说在后
  const novels: NovelItem[] = [...dbNovels, ...orphanNovels];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <HideHeader />
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/admin/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </a>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>小说管理</h1>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <NovelEditor novels={novels} adminRole={adminRole} />
      </div>
    </div>
  );
}
