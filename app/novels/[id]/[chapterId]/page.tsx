import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getChapter, getNovelChapters, getNovelMeta } from '@/lib/novels';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import ReadingControls from './ReadingControls';
import BranchChoice from './BranchChoice';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; chapterId: string }>;
}

export default async function ChapterPage({ params }: Props) {
  const { id, chapterId } = await params;
  const chapter = getChapter(id, chapterId);
  const novel = getNovelMeta(id);

  if (!chapter || !novel) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let userId: string | null = null;

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      userId = payload.userId;
      const existing = db.prepare('SELECT id FROM user_progress WHERE user_id = ? AND novel_id = ?')
        .get(userId, id);
      if (existing) {
        db.prepare('UPDATE user_progress SET chapter_id = ?, branch = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND novel_id = ?')
          .run(chapterId, chapter.meta.branch, userId, id);
      } else {
        db.prepare('INSERT INTO user_progress (id, user_id, novel_id, chapter_id, branch) VALUES (?, ?, ?, ?, ?)')
          .run(uuidv4(), userId, id, chapterId, chapter.meta.branch);
      }
    }
  }

  const allChapters = getNovelChapters(id);
  const mainChapters = allChapters.filter(c => c.meta.branch === 'main');
  const currentIndex = mainChapters.findIndex(c => c.filePath === chapterId);

  const prevChapter = currentIndex > 0 ? mainChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < mainChapters.length - 1 ? mainChapters[currentIndex + 1] : null;

  let userBranch: string | null | undefined = null;
  if (userId) {
    const progress = db.prepare('SELECT branch FROM user_progress WHERE user_id = ? AND novel_id = ?')
      .get(userId, id) as { branch: string } | undefined;
    userBranch = progress?.branch;
  }

  // 处理正文内容（简单的段落分割）
  const paragraphs = (chapter.content || '').split('\n\n').filter(p => p.trim());

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header
        className="glass sticky top-0 z-50"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/novels/${id}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-glow)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13 8H3M7 4L3 8l4 4"/>
              </svg>
            </Link>
            <div className="min-w-0 hide-mobile">
              <p className="text-sm font-medium truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
                {novel.title}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{chapter.meta.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ReadingControls />
            <Link
              href={`/novels/${id}`}
              className="btn-ghost"
              title="目录"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 3h14M2 9h14M2 15h14" strokeLinecap="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* 阅读进度条 */}
      <div className="h-0.5" style={{ background: 'var(--border-light)' }}>
        <div
          className="h-full rounded-r-full transition-all duration-300"
          style={{
            width: `${mainChapters.length > 1 ? (currentIndex / (mainChapters.length - 1)) * 100 : 100}%`,
            background: 'linear-gradient(90deg, var(--accent), var(--accent-light))'
          }}
        />
      </div>

      {/* 正文 */}
      <article className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        {/* 章节标题 */}
        <div className="text-center mb-10">
          <p className="text-xs font-medium tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            第 {currentIndex + 1} 章
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {chapter.meta.title}
          </h1>
        </div>

        {/* 分割线 */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="h-px flex-1" style={{ background: 'var(--border-light)' }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', opacity: 0.5 }} />
          <div className="h-px flex-1" style={{ background: 'var(--border-light)' }} />
        </div>

        {/* 正文 */}
        <div className="reading-content">
          {paragraphs.map((p, i) => (
            <p key={i} style={{ color: 'var(--text-secondary)' }}>{p}</p>
          ))}
        </div>

        {/* 分支选择 */}
        {chapter.meta.choices && chapter.meta.choices.length > 0 && (
          <BranchChoice
            choices={chapter.meta.choices}
            novelId={id}
            currentBranch={chapter.meta.branch}
            userId={userId}
            userBranch={userBranch}
          />
        )}

        {/* 章节导航 */}
        <div
          className="flex items-center justify-between mt-12 pt-8"
          style={{ borderTop: '1px solid var(--border-light)' }}
        >
          {prevChapter ? (
            <Link
              href={`/novels/${id}/${prevChapter.filePath}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm group"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="group-hover:-translate-x-0.5 transition-transform">
                <path d="M12 7H2M6 3L2 7l4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="max-w-[120px] truncate">{prevChapter.meta.title}</span>
            </Link>
          ) : (
            <div />
          )}

          {nextChapter ? (
            <Link
              href={`/novels/${id}/${nextChapter.filePath}`}
              className="btn-primary text-sm py-2.5 px-4"
            >
              <span className="max-w-[120px] truncate">{nextChapter.meta.title}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="group-hover:translate-x-0.5 transition-transform">
                <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ) : (
            <Link href={`/novels/${id}`} className="btn-primary text-sm py-2.5 px-4">
              返回目录
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          )}
        </div>
      </article>

      {/* 移动端底部导航 */}
      <div className="mobile-bottom-bar">
        <Link
          href={prevChapter ? `/novels/${id}/${prevChapter.filePath}` : '#'}
          className={!prevChapter ? 'opacity-30 pointer-events-none' : ''}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 18L9 12l6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <Link href={`/novels/${id}`}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5h16M3 11h16M3 17h10" strokeLinecap="round"/>
          </svg>
        </Link>
        <Link
          href={nextChapter ? `/novels/${id}/${nextChapter.filePath}` : '#'}
          className={!nextChapter ? 'opacity-30 pointer-events-none' : ''}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 18L13 12l-6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}
