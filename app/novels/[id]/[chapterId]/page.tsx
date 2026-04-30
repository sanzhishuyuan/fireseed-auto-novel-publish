import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import ReadingControls from './ReadingControls';
import BranchChoice from './BranchChoice';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; chapterId: string }>;
}

// 数据库章节标准化为兼容格式（兼容文件系统格式的 meta 嵌套）
interface NormalizedChapter {
  id: string;
  filePath: string;
  title: string;
  branch: string;
  content: string;
  word_count: number;
  order_num: number;
  choices: any[];
  custom_branch_enabled: boolean;
  meta: {
    title: string;
    branch: string;
    choices: any[];
    custom_branch_enabled: boolean;
  };
}

export default async function ChapterPage({ params }: Props) {
  const { id, chapterId } = await params;

  // --- 优先从数据库读取小说信息 ---
  const dbNovel = db.prepare('SELECT * FROM novels WHERE id = ?').get(id) as any;
  if (!dbNovel) {
    notFound();
  }

  // --- 优先从数据库读取章节信息 ---
  const dbChapter = db.prepare('SELECT * FROM chapters WHERE id = ? AND novel_id = ?')
    .get(chapterId, id) as any;
  if (!dbChapter) {
    notFound();
  }

  // 标准化为兼容格式
  const chapter: NormalizedChapter = {
    id: dbChapter.id,
    filePath: dbChapter.id,
    title: dbChapter.title,
    branch: dbChapter.branch || 'main',
    content: dbChapter.content || '',
    word_count: dbChapter.word_count || 0,
    order_num: dbChapter.order_num || 1,
    choices: dbChapter.choices ? JSON.parse(dbChapter.choices) : [],
    custom_branch_enabled: dbChapter.custom_branch_enabled === 1,
    meta: {
      title: dbChapter.title,
      branch: dbChapter.branch || 'main',
      choices: dbChapter.choices ? JSON.parse(dbChapter.choices) : [],
      custom_branch_enabled: dbChapter.custom_branch_enabled === 1,
    },
  };

  // 标准化小说信息
  const novel = {
    id: dbNovel.id,
    title: dbNovel.title,
    author: dbNovel.author,
    description: dbNovel.description || '',
    tags: dbNovel.tags || '',
    status: dbNovel.status || 'ongoing',
  };

  // --- 从数据库读取所有章节 ---
  const dbChapters = db.prepare(
    'SELECT * FROM chapters WHERE novel_id = ? ORDER BY order_num ASC, created_at ASC'
  ).all(id) as any[];

  const allChapters: NormalizedChapter[] = dbChapters.map((c) => ({
    id: c.id,
    filePath: c.id,
    title: c.title,
    branch: c.branch || 'main',
    content: c.content || '',
    word_count: c.word_count || 0,
    order_num: c.order_num || 1,
    choices: c.choices ? JSON.parse(c.choices) : [],
    custom_branch_enabled: c.custom_branch_enabled === 1,
    meta: {
      title: c.title,
      branch: c.branch || 'main',
      choices: c.choices ? JSON.parse(c.choices) : [],
      custom_branch_enabled: c.custom_branch_enabled === 1,
    },
  }));

  const mainChapters = allChapters.filter((c) => c.branch === 'main');
  const currentIndex = mainChapters.findIndex((c) => c.id === chapterId);

  const prevChapter = currentIndex > 0 ? mainChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < mainChapters.length - 1 ? mainChapters[currentIndex + 1] : null;

  // --- 记录阅读进度 ---
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let userId: string | null = null;
  let userBranch: string | null | undefined = null;

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      userId = payload.userId;
      const existing = db.prepare('SELECT id FROM user_progress WHERE user_id = ? AND novel_id = ?')
        .get(userId, id);
      if (existing) {
        db.prepare('UPDATE user_progress SET chapter_id = ?, branch = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND novel_id = ?')
          .run(chapterId, chapter.branch, userId, id);
      } else {
        db.prepare('INSERT INTO user_progress (id, user_id, novel_id, chapter_id, branch) VALUES (?, ?, ?, ?, ?)')
          .run(uuidv4(), userId, id, chapterId, chapter.branch);
      }
      const progress = db.prepare('SELECT branch FROM user_progress WHERE user_id = ? AND novel_id = ?')
        .get(userId, id) as { branch: string } | undefined;
      userBranch = progress?.branch;
    }
  }

  // 自定义 Markdown 渲染组件
  const markdownComponents: Components = {
    p: ({ children }) => (
      <p className="mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </p>
    ),
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mt-8 mb-4" style={{ color: 'var(--text-primary)' }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold mt-6 mb-3" style={{ color: 'var(--text-primary)' }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold mt-5 mb-2" style={{ color: 'var(--text-primary)' }}>
        {children}
      </h3>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside mb-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside mb-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className="border-l-4 pl-4 my-4 italic"
        style={{ borderColor: 'var(--accent)', color: 'var(--text-muted)' }}
      >
        {children}
      </blockquote>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
    hr: () => (
      <hr className="my-6" style={{ borderColor: 'var(--border-light)' }} />
    ),
    code: ({ children }) => (
      <code
        className="px-1.5 py-0.5 rounded text-sm font-mono"
        style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}
      >
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre
        className="p-4 rounded-lg overflow-x-auto my-4"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {children}
      </pre>
    ),
  };

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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{chapter.title}</p>
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
            {chapter.title}
          </h1>
        </div>

        {/* 分割线 */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="h-px flex-1" style={{ background: 'var(--border-light)' }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', opacity: 0.5 }} />
          <div className="h-px flex-1" style={{ background: 'var(--border-light)' }} />
        </div>

        {/* 正文 - Markdown渲染 */}
        <div className="reading-content">
          <ReactMarkdown components={markdownComponents}>
            {chapter.content || ''}
          </ReactMarkdown>
        </div>

        {/* 分支选择 */}
        {(chapter.choices && chapter.choices.length > 0 || chapter.custom_branch_enabled) && (
          <BranchChoice
            choices={chapter.choices || []}
            novelId={id}
            chapterId={chapterId}
            currentBranch={chapter.branch}
            userId={userId}
            userBranch={userBranch}
            customBranchEnabled={chapter.custom_branch_enabled === true}
          />
        )}

        {/* 章节导航 */}
        <div
          className="flex items-center justify-between mt-12 pt-8"
          style={{ borderTop: '1px solid var(--border-light)' }}
        >
          {prevChapter ? (
            <Link
              href={`/novels/${id}/${prevChapter.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm group"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="group-hover:-translate-x-0.5 transition-transform">
                <path d="M12 7H2M6 3L2 7l4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="max-w-[120px] truncate">{prevChapter.title}</span>
            </Link>
          ) : (
            <div />
          )}

          {nextChapter ? (
            <Link
              href={`/novels/${id}/${nextChapter.id}`}
              className="btn-primary text-sm py-2.5 px-4"
            >
              <span className="max-w-[120px] truncate">{nextChapter.title}</span>
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
          href={prevChapter ? `/novels/${id}/${prevChapter.id}` : '#'}
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
          href={nextChapter ? `/novels/${id}/${nextChapter.id}` : '#'}
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
