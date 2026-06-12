import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import HideHeader from '@/components/HideHeader';
import ReadingControls from './ReadingControls';
import BranchChoice from './BranchChoice';
import BranchInviteCard from './BranchInviteCard';
import VoteButtons from './VoteButtons';
import ReactMarkdown from 'react-markdown';
import remarkFlow from 'remark-flow';
import type { Components } from 'react-markdown';
import { processMarkdownFlow, hasMarkdownFlowSyntax } from '@/lib/markdown-flow';

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

// ─── Obsidian Codex Palette ───
const C = {
  bg: '#0b0b0f',
  card: '#131318',
  elevated: '#1a1a22',
  hover: '#22222c',
  text: '#f0ece4',
  dim: '#9a9a8e',
  muted: '#5a5a52',
  gold: '#c9a55c',
  goldLight: '#e4cc8a',
  goldGlow: 'rgba(201,165,92,0.12)',
  border: 'rgba(255,255,255,0.06)',
  borderGold: 'rgba(201,165,92,0.2)',
  fontDisplay: "'Fraunces', Georgia, serif",
  fontMono: "'DM Mono', 'Menlo', monospace",
} as const;

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

  // 构建 MarkdownFlow 上下文（注入变量）
  const readerName = userId
    ? (db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as { username: string } | undefined)?.username || '读者'
    : '读者';
  const mfContext = {
    reader_name: readerName,
    novel_title: novel.title,
    chapter_title: chapter.title,
    chapter_num: currentIndex + 1,
    total_chapters: mainChapters.length,
  };

  // 处理 MarkdownFlow 语法（变量注入 + 交互提取）
  const hasMF = hasMarkdownFlowSyntax(chapter.content);
  const mfResult = hasMF ? processMarkdownFlow(chapter.content, mfContext) : null;
  const renderedContent = mfResult?.content || chapter.content;

  // 合并 choices：数据库中的 + MarkdownFlow 语法中提取的
  const allChoices = [
    ...(chapter.choices || []),
    ...(mfResult?.choices || []),
  ];

  // ─── Obsidian Codex: Markdown 渲染组件 ───
  const markdownComponents: Components = {
    p: ({ children }) => (
      <p style={{
        marginBottom: 20,
        lineHeight: 1.85,
        color: C.text,
        fontFamily: C.fontDisplay,
        fontSize: 17,
        letterSpacing: '0.01em',
      }}>
        {children}
      </p>
    ),
    h1: ({ children }) => (
      <h1 style={{
        fontSize: 28,
        fontWeight: 700,
        marginTop: 40,
        marginBottom: 16,
        color: C.text,
        fontFamily: C.fontDisplay,
        letterSpacing: '-0.02em',
      }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 style={{
        fontSize: 22,
        fontWeight: 700,
        marginTop: 32,
        marginBottom: 12,
        color: C.text,
        fontFamily: C.fontDisplay,
        letterSpacing: '-0.01em',
      }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 style={{
        fontSize: 18,
        fontWeight: 600,
        marginTop: 24,
        marginBottom: 8,
        color: C.text,
        fontFamily: C.fontDisplay,
      }}>
        {children}
      </h3>
    ),
    ul: ({ children }) => (
      <ul style={{
        listStyle: 'disc',
        listStylePosition: 'inside',
        marginBottom: 16,
        color: C.dim,
        lineHeight: 1.85,
      }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{
        listStyle: 'decimal',
        listStylePosition: 'inside',
        marginBottom: 16,
        color: C.dim,
        lineHeight: 1.85,
      }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{ lineHeight: 1.85, marginBottom: 4 }}>{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote style={{
        borderLeft: `3px solid ${C.gold}`,
        paddingLeft: 20,
        marginTop: 20,
        marginBottom: 20,
        fontStyle: 'italic',
        color: C.dim,
        background: `linear-gradient(90deg, rgba(201,165,92,0.04) 0%, transparent 100%)`,
        padding: '14px 20px',
        borderRadius: '0 8px 8px 0',
      }}>
        {children}
      </blockquote>
    ),
    strong: ({ children }) => (
      <strong style={{
        fontWeight: 600,
        color: C.text,
      }}>
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em style={{ fontStyle: 'italic', color: C.dim }}>{children}</em>
    ),
    hr: () => (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        margin: '32px 0',
      }}>
        <div style={{ height: 1, flex: 1, background: C.border }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, opacity: 0.4 }} />
        <div style={{ height: 1, flex: 1, background: C.border }} />
      </div>
    ),
    code: ({ children }) => (
      <code style={{
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 14,
        fontFamily: C.fontMono,
        background: 'rgba(201,165,92,0.1)',
        color: C.gold,
        border: `1px solid ${C.borderGold}`,
      }}>
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre style={{
        padding: 20,
        borderRadius: 12,
        overflowX: 'auto',
        marginTop: 16,
        marginBottom: 16,
        background: C.card,
        border: `1px solid ${C.border}`,
        fontFamily: C.fontMono,
        fontSize: 13,
        lineHeight: 1.7,
      }}>
        {children}
      </pre>
    ),
  };

  const progressPercent = mainChapters.length > 1
    ? (currentIndex / (mainChapters.length - 1)) * 100
    : 100;

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Obsidian Codex background texture */}
      <div className="codex-bg" />

      {/* Content layer above background */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <HideHeader />

        {/* ─── Header: charcoal glass + gold accent ─── */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(19,19,24,0.82)',
          backdropFilter: 'blur(16px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            maxWidth: 768,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Left: back arrow + novel/chapter info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <Link
                href={`/novels/${id}`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: C.goldGlow,
                  border: `1px solid ${C.borderGold}`,
                  transition: 'all 0.2s ease',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round">
                  <path d="M13 8H3M7 4L3 8l4 4" />
                </svg>
              </Link>
              <div style={{ minWidth: 0, overflow: 'hidden' }} className="codex-hide-mobile">
                <p style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 220,
                  fontFamily: C.fontDisplay,
                }}>
                  {novel.title}
                </p>
                <p style={{
                  fontSize: 12,
                  color: C.muted,
                  fontFamily: C.fontMono,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 220,
                }}>
                  {chapter.title}
                </p>
              </div>
            </div>

            {/* Right: controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ReadingControls />
              <Link
                href={`/novels/${id}`}
                title="目录"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  color: C.dim,
                  transition: 'all 0.2s ease',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 3h14M2 9h14M2 15h14" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
          </div>
        </header>

        {/* ─── Reading progress bar: gold gradient ─── */}
        <div style={{ height: 3, background: C.border }}>
          <div style={{
            height: '100%',
            borderRadius: '0 4px 4px 0',
            transition: 'width 0.8s ease',
            width: `${progressPercent}%`,
            background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`,
            boxShadow: `0 0 12px rgba(201,165,92,0.25)`,
          }} />
        </div>

        {/* ─── Article body ─── */}
        <article style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '48px 20px 56px',
        }}>

          {/* ─── Chapter heading ─── */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            {/* Chapter number label */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 14,
            }}>
              <span style={{
                fontFamily: C.fontMono,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: C.gold,
              }}>
                Chapter {currentIndex + 1}
              </span>

              {/* Branch indicator */}
              {allChoices.length > 0 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: C.fontMono,
                  background: 'rgba(34,197,94,0.1)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}>
                  {allChoices.length} branches
                </span>
              )}

              {/* Custom branch enabled indicator */}
              {chapter.custom_branch_enabled && allChoices.length === 0 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: C.fontMono,
                  background: 'rgba(201,165,92,0.12)',
                  color: C.gold,
                  border: `1px solid ${C.borderGold}`,
                }}>
                  Open branch
                </span>
              )}
            </div>

            {/* Chapter title */}
            <h1 style={{
              fontFamily: C.fontDisplay,
              fontSize: 'clamp(26px, 4vw, 36px)',
              fontWeight: 700,
              lineHeight: 1.25,
              color: C.text,
              letterSpacing: '-0.02em',
              margin: 0,
            }}>
              {chapter.title}
            </h1>
          </div>

          {/* ─── Codex ornamental divider ─── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 44,
          }}>
            <div style={{ height: 1, flex: 1, background: C.border }} />
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L10 6H15L11 9.5L12.5 15L8 11.5L3.5 15L5 9.5L1 6H6L8 1Z" fill={C.gold} opacity="0.3" />
            </svg>
            <div style={{ height: 1, flex: 1, background: C.border }} />
          </div>

          {/* ─── Markdown content ─── */}
          <div className="reading-content" style={{ fontFamily: C.fontDisplay }}>
            <ReactMarkdown
              components={markdownComponents}
              remarkPlugins={hasMF ? [remarkFlow] : undefined}
            >
              {renderedContent}
            </ReactMarkdown>
          </div>

          {/* ─── Branch choices ─── */}
          {allChoices.length > 0 && (
            <BranchChoice
              choices={allChoices}
              novelId={id}
              chapterId={chapterId}
              currentBranch={chapter.branch}
              userId={userId}
              userBranch={userBranch}
              customBranchEnabled={chapter.custom_branch_enabled === true}
            />
          )}

          {/* ─── Branch invite card ─── */}
          <BranchInviteCard
            novelId={id}
            chapterId={chapterId}
            novelTitle={novel.title}
            chapterTitle={chapter.title}
          />

          {/* ─── Vote buttons ─── */}
          <VoteButtons novelId={id} chapterId={chapterId} />

          {/* ─── Chapter navigation ─── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 56,
            paddingTop: 32,
            borderTop: `1px solid ${C.border}`,
          }}>
            {prevChapter ? (
              <Link
                href={`/novels/${id}/${prevChapter.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 18px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: C.fontMono,
                  background: C.card,
                  color: C.dim,
                  border: `1px solid ${C.border}`,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 7H2M6 3L2 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{
                  maxWidth: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {prevChapter.title}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {nextChapter ? (
              <Link
                href={`/novels/${id}/${nextChapter.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 22px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: C.fontMono,
                  fontWeight: 500,
                  background: C.gold,
                  color: C.bg,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  border: 'none',
                }}
              >
                <span style={{
                  maxWidth: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {nextChapter.title}
                </span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ) : (
              <Link
                href={`/novels/${id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 22px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: C.fontMono,
                  fontWeight: 500,
                  background: C.gold,
                  color: C.bg,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  border: 'none',
                }}
              >
                Back to Index
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
          </div>

          {/* Mobile bottom spacer - CSS class handles height on mobile only */}
          <div className="mobile-bottom-spacer" />
        </article>

        {/* ─── Mobile bottom bar: charcoal + gold active ───
             CSS class .mobile-bottom-bar controls responsive show/hide:
             display:none on desktop, display:flex on mobile (<=640px).
             Inline styles only set Codex visual identity (no display/position). */}
        <div
          className="mobile-bottom-bar"
          style={{
            background: 'rgba(19,19,24,0.92)',
            backdropFilter: 'blur(16px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
            borderTop: `1px solid ${C.border}`,
          }}
        >
          {/* Prev */}
          <Link
            href={prevChapter ? `/novels/${id}/${prevChapter.id}` : '#'}
            style={{
              color: prevChapter ? C.gold : C.muted,
              opacity: prevChapter ? 1 : 0.3,
              pointerEvents: prevChapter ? 'auto' : 'none',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 18L9 12l6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          {/* Index */}
          <Link
            href={`/novels/${id}`}
            style={{
              color: C.dim,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 5h16M3 11h16M3 17h10" strokeLinecap="round" />
            </svg>
          </Link>

          {/* Next */}
          <Link
            href={nextChapter ? `/novels/${id}/${nextChapter.id}` : '#'}
            style={{
              color: nextChapter ? C.gold : C.muted,
              opacity: nextChapter ? 1 : 0.3,
              pointerEvents: nextChapter ? 'auto' : 'none',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 18L13 12l-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
