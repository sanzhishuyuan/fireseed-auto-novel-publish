'use client';

import { generateItemListSchema } from '@/lib/structured-data';
import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SafeCover from '@/components/SafeCover';
import type { User, Novel } from '@/types';

/* ═══════════════════════════════════════════════════════════════
   OBSIDIAN CODEX · 黑曜手稿 — Novel Discovery Page
   Editorial luxury meets tech precision.
   Fonts: Fraunces (variable serif) + DM Mono (metadata)
   Palette: deep charcoal + gold accent + warm off-white
   ═══════════════════════════════════════════════════════════════ */

const CODEX_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,400&family=DM+Mono:wght@300;400;500&display=swap');

:root {
  --codex-bg: #0b0b0f;
  --codex-bg-card: #131318;
  --codex-bg-elevated: #1a1a22;
  --codex-bg-hover: #22222c;
  --codex-text: #f0ece4;
  --codex-text-dim: #9a9a8e;
  --codex-text-muted: #5a5a52;
  --codex-gold: #c9a55c;
  --codex-gold-light: #e4cc8a;
  --codex-gold-glow: rgba(201,165,92,0.12);
  --codex-gold-glow-strong: rgba(201,165,92,0.25);
  --codex-border: rgba(255,255,255,0.06);
  --codex-border-gold: rgba(201,165,92,0.2);
  --font-display: 'Fraunces', Georgia, serif;
  --font-mono: 'DM Mono', 'Menlo', monospace;
  --font-cn: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --codex-radius: 12px;
  --codex-radius-sm: 8px;
}

/* ═══════ Texture Background ═══════ */
.codex-bg {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 70% 50% at 15% 5%, rgba(201,165,92,0.03) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 85% 90%, rgba(99,102,241,0.02) 0%, transparent 50%),
    var(--codex-bg);
}
.codex-bg::after {
  content: ''; position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
  background-repeat: repeat;
  opacity: 0.5;
}

/* ═══════ Page Shell ═══════ */
.codex-shell {
  position: relative; z-index: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ═══════ HERO ═══════ */
.codex-hero {
  padding: 48px 0 36px;
  border-bottom: 1px solid var(--codex-border);
  margin-bottom: 36px;
}
.codex-hero-grid {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 36px;
  align-items: start;
}
.codex-hero-cover {
  width: 180px;
  aspect-ratio: 3/4;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,165,92,0.15);
}
.codex-hero-cover .live-badge {
  position: absolute; bottom: 8px; left: 8px; right: 8px;
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--codex-gold);
  z-index: 2;
}
.codex-hero-cover .live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #22c55e;
  animation: codex-live-pulse 1.5s ease-in-out infinite;
}
@keyframes codex-live-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
  50% { box-shadow: 0 0 0 4px rgba(34,197,94,0); }
}
.codex-hero-meta { padding-top: 4px; }
.codex-hero-tag {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px; letter-spacing: 2px;
  color: var(--codex-gold);
  text-transform: uppercase;
  margin-bottom: 14px;
}
.codex-hero-tag .line {
  width: 24px; height: 1px; background: var(--codex-gold);
}
.codex-hero-title {
  font-family: var(--font-display);
  font-size: 44px; font-weight: 700;
  line-height: 1.15; color: var(--codex-text);
  margin-bottom: 14px; letter-spacing: -0.5px;
}
.codex-hero-desc {
  font-size: 15px; line-height: 1.7;
  color: var(--codex-text-dim);
  max-width: 560px; margin-bottom: 20px;
  display: -webkit-box; -webkit-line-clamp: 3;
  -webkit-box-orient: vertical; overflow: hidden;
}
.codex-hero-stats { display: flex; gap: 24px; margin-bottom: 24px; }
.codex-hero-stat { display: flex; flex-direction: column; gap: 2px; }
.codex-hero-stat-value {
  font-family: var(--font-display);
  font-size: 22px; font-weight: 700; color: var(--codex-gold);
}
.codex-hero-stat-label {
  font-family: var(--font-mono);
  font-size: 10px; color: var(--codex-text-muted); letter-spacing: 1px;
}
.codex-hero-actions { display: flex; gap: 12px; }
.codex-hero-btn {
  padding: 10px 24px; border-radius: var(--codex-radius-sm);
  font-family: var(--font-mono); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s ease;
  text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
  border: none;
}
.codex-hero-btn-primary {
  background: var(--codex-gold); color: #0b0b0f;
}
.codex-hero-btn-primary:hover {
  background: var(--codex-gold-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px var(--codex-gold-glow);
}
.codex-hero-btn-secondary {
  background: transparent; color: var(--codex-text-dim);
  border: 1px solid var(--codex-border);
}
.codex-hero-btn-secondary:hover {
  border-color: var(--codex-gold); color: var(--codex-gold);
}

/* ═══════ STATS BAR ═══════ */
.codex-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
  margin-bottom: 36px;
  border: 1px solid var(--codex-border);
  border-radius: var(--codex-radius);
  overflow: hidden; background: var(--codex-bg-card);
}
.codex-stat-item {
  padding: 20px 24px; text-align: center;
  border-right: 1px solid var(--codex-border);
  transition: background 0.2s ease;
}
.codex-stat-item:last-child { border-right: none; }
.codex-stat-item:hover { background: var(--codex-bg-elevated); }
.codex-stat-number {
  font-family: var(--font-display);
  font-size: 32px; font-weight: 900;
  color: var(--codex-gold); line-height: 1;
  margin-bottom: 4px; letter-spacing: -0.5px;
}
.codex-stat-label {
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 2px;
  color: var(--codex-text-muted); text-transform: uppercase;
}

/* ═══════ DISCOVERY ═══════ */
.codex-discovery { margin-bottom: 32px; }
.codex-search-row { position: relative; margin-bottom: 16px; }
.codex-search-icon {
  position: absolute; left: 16px; top: 50%;
  transform: translateY(-50%); color: var(--codex-text-muted);
}
.codex-search-input {
  width: 100%; padding: 14px 44px 14px 46px;
  background: var(--codex-bg-card);
  border: 1px solid var(--codex-border);
  border-radius: var(--codex-radius);
  font-size: 14px; font-family: var(--font-cn);
  color: var(--codex-text); outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.codex-search-input::placeholder { color: var(--codex-text-muted); }
.codex-search-input:focus {
  border-color: var(--codex-gold);
  box-shadow: 0 0 0 3px var(--codex-gold-glow);
}
.codex-search-clear {
  position: absolute; right: 14px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: var(--codex-text-muted); font-size: 14px;
  padding: 4px;
}
.codex-search-clear:hover { color: var(--codex-gold); }

/* Tag Pills */
.codex-tag-row {
  display: flex; gap: 8px;
  overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px;
  scrollbar-width: none;
}
.codex-tag-row::-webkit-scrollbar { display: none; }
.codex-tag-pill {
  flex-shrink: 0; padding: 7px 16px;
  border-radius: 20px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s ease;
  border: 1px solid var(--codex-border);
  background: transparent; color: var(--codex-text-dim);
  white-space: nowrap; font-family: var(--font-cn);
}
.codex-tag-pill:hover {
  border-color: var(--codex-gold); color: var(--codex-gold);
}
.codex-tag-pill.active {
  background: var(--codex-gold); color: #0b0b0f;
  border-color: var(--codex-gold); font-weight: 600;
}

/* Sort & Count Row */
.codex-sort-row {
  display: flex; align-items: center;
  justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
}
.codex-sort-count {
  font-family: var(--font-mono);
  font-size: 12px; color: var(--codex-text-muted);
}
.codex-sort-count strong {
  color: var(--codex-gold); font-weight: 500;
}
.codex-sort-options { display: flex; gap: 4px; }
.codex-sort-btn {
  padding: 6px 14px; border-radius: var(--codex-radius-sm);
  font-size: 12px; font-family: var(--font-mono);
  cursor: pointer; transition: all 0.15s ease;
  border: 1px solid transparent;
  background: transparent; color: var(--codex-text-muted);
}
.codex-sort-btn:hover {
  color: var(--codex-text); background: var(--codex-bg-elevated);
}
.codex-sort-btn.active {
  color: var(--codex-gold);
  border-color: var(--codex-border-gold);
  background: var(--codex-gold-glow);
}

/* ═══════ NOVEL GRID ═══════ */
.codex-novel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px; margin-bottom: 48px;
}
.codex-novel-card {
  display: flex; flex-direction: column;
  border-radius: var(--codex-radius);
  overflow: hidden; background: var(--codex-bg-card);
  border: 1px solid var(--codex-border);
  transition: all 0.3s ease;
  text-decoration: none; color: inherit;
  position: relative;
}
.codex-novel-card:hover {
  transform: translateY(-4px);
  border-color: var(--codex-border-gold);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--codex-border-gold);
}
.codex-card-cover {
  aspect-ratio: 3/4; position: relative; overflow: hidden;
}
.codex-novel-card:hover .codex-card-cover img {
  transform: scale(1.05);
}
.codex-card-tag-overlay {
  position: absolute; top: 10px; left: 10px;
  padding: 3px 10px; border-radius: 6px;
  font-size: 11px; font-weight: 500;
  backdrop-filter: blur(8px);
  background: rgba(0,0,0,0.5); color: white;
  z-index: 2;
}
.codex-card-status {
  position: absolute; top: 10px; right: 10px;
  padding: 2px 8px; border-radius: 4px;
  font-size: 10px; font-family: var(--font-mono);
  font-weight: 500; letter-spacing: 0.5px; z-index: 2;
}
.codex-card-status.ongoing {
  background: rgba(201,165,92,0.15);
  color: var(--codex-gold);
  border: 1px solid rgba(201,165,92,0.25);
}
.codex-card-status.completed {
  background: rgba(34,197,94,0.12);
  color: #22c55e;
  border: 1px solid rgba(34,197,94,0.2);
}
.codex-card-progress {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 3px; background: rgba(255,255,255,0.08); z-index: 2;
}
.codex-card-progress-bar {
  height: 100%; border-radius: 0 3px 3px 0;
  background: linear-gradient(90deg, var(--codex-gold), var(--codex-gold-light));
  transition: width 0.8s ease;
}
.codex-card-info { padding: 14px 14px 16px; }
.codex-card-title {
  font-family: var(--font-display);
  font-size: 16px; font-weight: 700;
  color: var(--codex-text); line-height: 1.3;
  margin-bottom: 6px;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.codex-card-author-row {
  display: flex; align-items: center;
  gap: 8px; margin-bottom: 8px;
}
.codex-card-author {
  font-family: var(--font-mono);
  font-size: 11px; color: var(--codex-text-dim);
}
.codex-card-chapters {
  font-family: var(--font-mono);
  font-size: 10px; color: var(--codex-text-muted);
  padding: 1px 6px; background: var(--codex-bg-elevated);
  border-radius: 4px;
}
.codex-card-desc {
  font-size: 12px; line-height: 1.55;
  color: var(--codex-text-muted);
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
  margin-bottom: 10px;
}
.codex-card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.codex-card-tag-mini {
  font-family: var(--font-mono);
  font-size: 10px; padding: 2px 8px;
  border-radius: 4px;
  background: var(--codex-gold-glow);
  color: var(--codex-gold);
}

/* ═══════ Loading Skeleton ═══════ */
.codex-skeleton-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
}
.codex-skeleton-card {
  border-radius: var(--codex-radius); overflow: hidden;
  background: var(--codex-bg-card);
  border: 1px solid var(--codex-border);
}
.codex-skeleton-cover {
  aspect-ratio: 3/4; background: var(--codex-bg-elevated);
  animation: codex-shimmer 1.5s ease-in-out infinite;
}
@keyframes codex-shimmer {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.3; }
}
.codex-skeleton-info { padding: 14px; }
.codex-skeleton-line {
  height: 12px; border-radius: 6px;
  background: var(--codex-bg-elevated);
  margin-bottom: 8px;
  animation: codex-shimmer 1.5s ease-in-out infinite;
}
.codex-skeleton-line:nth-child(1) { width: 75%; }
.codex-skeleton-line:nth-child(2) { width: 45%; }

/* ═══════ Empty State ═══════ */
.codex-empty {
  text-align: center; padding: 60px 20px;
}
.codex-empty-icon {
  width: 64px; height: 64px; margin: 0 auto 16px;
  border-radius: 16px; background: var(--codex-gold-glow);
  display: flex; align-items: center; justify-content: center;
}
.codex-empty-title {
  font-family: var(--font-display);
  font-size: 22px; font-weight: 700;
  color: var(--codex-text); margin-bottom: 8px;
}
.codex-empty-desc {
  font-size: 14px; color: var(--codex-text-dim); margin-bottom: 20px;
}
.codex-empty-btn {
  padding: 10px 24px; border-radius: var(--codex-radius-sm);
  background: var(--codex-gold); color: #0b0b0f; border: none;
  font-family: var(--font-mono); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s ease;
}
.codex-empty-btn:hover {
  background: var(--codex-gold-light); transform: translateY(-1px);
}

/* ═══════ Animations ═══════ */
@keyframes codex-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.codex-animate {
  animation: codex-fade-up 0.5s ease forwards;
  opacity: 0;
}

/* ═══════ Responsive ═══════ */
@media (max-width: 1024px) {
  .codex-novel-grid { grid-template-columns: repeat(3, 1fr); }
  .codex-skeleton-grid { grid-template-columns: repeat(3, 1fr); }
  .codex-hero-grid { grid-template-columns: 150px 1fr; gap: 28px; }
  .codex-hero-cover { width: 150px; }
  .codex-hero-title { font-size: 36px; }
}
@media (max-width: 768px) {
  .codex-novel-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .codex-skeleton-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .codex-hero-grid { grid-template-columns: 1fr; }
  .codex-hero-cover { width: 120px; margin: 0 auto; }
  .codex-hero { text-align: center; }
  .codex-hero-desc { max-width: 100%; }
  .codex-hero-stats { justify-content: center; }
  .codex-hero-actions { justify-content: center; }
  .codex-hero-title { font-size: 30px; }
  .codex-stats { grid-template-columns: repeat(2, 1fr); }
  .codex-stat-item:nth-child(2) { border-right: none; }
  .codex-stat-item:nth-child(1), .codex-stat-item:nth-child(2) {
    border-bottom: 1px solid var(--codex-border);
  }
  .codex-stat-number { font-size: 26px; }
}
@media (max-width: 480px) {
  .codex-shell { padding: 0 14px; }
  .codex-hero-title { font-size: 26px; }
  .codex-hero-cover { width: 100px; }
  .codex-hero-stats { gap: 16px; }
  .codex-hero-stat-value { font-size: 18px; }
  .codex-novel-grid { gap: 10px; }
  .codex-card-info { padding: 10px 10px 12px; }
  .codex-card-title { font-size: 14px; }
  .codex-stats { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// ═══════ Page Entry ═══════
export default function NovelsPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0b0b0f', color: '#9a9a8e',
        fontFamily: "'DM Mono', monospace", fontSize: '13px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px', animation: 'pulse 2s infinite' }}>📚</div>
          <p>加载手稿中...</p>
        </div>
      </div>
    }>
      <NovelsContent />
    </Suspense>
  );
}

function NovelsContent() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('全部');
  const [activeSort, setActiveSort] = useState<string>('最新更新');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showEmpty, setShowEmpty] = useState<boolean>(false);
  const [stats, setStats] = useState({ totalChapters: 0, totalNovels: 0, totalWords: 0, totalAuthors: 0 });
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 URL 参数预筛选品类
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    if (tagParam) setActiveFilter(tagParam);
  }, [searchParams]);

  const tagEmojis: Record<string, string> = {
    '全部': '📚', '玄幻': '⚡', '都市': '🏙', '仙侠': '🏯', '言情': '💕',
    '科幻': '🚀', '悬疑': '🔮', '历史': '📜', '恐怖': '👻',
    '军事': '⚔️', '奇幻': '🔮', '武侠': '⚡'
  };

  const sortOptions = [
    { key: '最新更新', label: '🆕 最新更新' },
    { key: '最多章节', label: '📖 最多章节' },
    { key: '新书上架', label: '✨ 新书上架' }
  ];

  // 获取所有可用分类
  const categories = useMemo(() => {
    const tags = new Set<string>(['全部']);
    novels.forEach(novel => {
      if (novel.tags) {
        novel.tags.split(',').forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) tags.add(trimmed);
        });
      }
    });
    return Array.from(tags);
  }, [novels]);

  // 过滤和排序
  const filteredNovels = useMemo(() => {
    let filtered = [...novels];

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(novel =>
        novel.title?.toLowerCase().includes(query) ||
        novel.author?.toLowerCase().includes(query) ||
        novel.tags?.toLowerCase().includes(query) ||
        novel.description?.toLowerCase().includes(query)
      );
    }

    if (!showEmpty) {
      filtered = filtered.filter(novel => (novel.chapterCount || 0) > 0);
    }

    if (activeFilter !== '全部') {
      filtered = filtered.filter(novel =>
        novel.tags?.split(',').map((t: string) => t.trim()).includes(activeFilter)
      );
    }

    switch (activeSort) {
      case '最新更新':
        filtered.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
        break;
      case '最多章节':
        filtered.sort((a, b) => (b.chapterCount || 0) - (a.chapterCount || 0));
        break;
      case '新书上架':
        filtered.sort((a, b) => new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime());
        break;
    }

    return filtered;
  }, [novels, activeFilter, activeSort, searchQuery, showEmpty]);

  // Hero: 取最近更新的小说
  const heroNovel = useMemo(() => {
    if (novels.length === 0) return null;
    const withChapters = novels.filter(n => (n.chapterCount || 0) > 0);
    if (withChapters.length === 0) return null;
    return withChapters.sort((a, b) =>
      new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    )[0];
  }, [novels]);

  // 获取小说列表 + 统计数据
  useEffect(() => {
    Promise.all([
      fetch('/api/novels').then(res => res.json()).catch(() => ({ novels: [] })),
      fetch('/api/stats').then(res => res.json()).catch(() => ({ success: false }))
    ])
      .then(([data, statsData]) => {
        const list = Array.isArray(data) ? data : (data?.novels || []);
        const novelsWithTime = list.map((novel: Novel, i: number) => ({
          ...novel,
          updated_at: novel.updated_at || new Date(Date.now() - i * 86400000).toISOString()
        }));
        setNovels(novelsWithTime);

        // JSON-LD
        if (novelsWithTime.length > 0) {
          const schemaScript = document.createElement('script');
          schemaScript.type = 'application/ld+json';
          schemaScript.textContent = generateItemListSchema(novelsWithTime.slice(0, 20), '全部作品');
          document.head.appendChild(schemaScript);
        }

        if (statsData?.success && statsData?.data) {
          setStats(statsData.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 获取用户状态
  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn && data.user) setUser(data.user);
      })
      .catch(console.error);
  }, []);

  // 格式化字数
  const formatWords = (count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1) + 'w';
    return count.toString();
  };

  return (
    <>
      <style>{CODEX_CSS}</style>
      <div className="codex-bg" />
      <div className="codex-shell" style={{ minHeight: '100vh', paddingBottom: '48px' }}>

        {/* ═══════ HERO — Featured Novel Spotlight ═══════ */}
        {!loading && heroNovel && (
          <section className="codex-hero codex-animate">
            <div className="codex-hero-grid">
              <div className="codex-hero-cover">
                <SafeCover
                  src={heroNovel.cover_url}
                  alt={heroNovel.title}
                  tag={heroNovel.tags}
                  aspectRatio="aspect-[3/4]"
                />
                {heroNovel.status !== 'completed' && (
                  <div className="live-badge">
                    <span className="live-dot" />
                    LIVE WRITING
                  </div>
                )}
              </div>
              <div className="codex-hero-meta">
                <div className="codex-hero-tag">
                  <span className="line" />
                  LATEST CODEX · 最新手稿
                </div>
                <h1 className="codex-hero-title">{heroNovel.title}</h1>
                <p className="codex-hero-desc">
                  {heroNovel.description || '暂无简介'}
                </p>
                <div className="codex-hero-stats">
                  <div className="codex-hero-stat">
                    <span className="codex-hero-stat-value">{heroNovel.chapterCount || 0}</span>
                    <span className="codex-hero-stat-label">CHAPTERS</span>
                  </div>
                  <div className="codex-hero-stat">
                    <span className="codex-hero-stat-value">
                      {heroNovel.tags?.split(',')[0]?.trim() || '—'}
                    </span>
                    <span className="codex-hero-stat-label">GENRE</span>
                  </div>
                  <div className="codex-hero-stat">
                    <span className="codex-hero-stat-value">
                      {heroNovel.status === 'completed' ? '完结' : '连载'}
                    </span>
                    <span className="codex-hero-stat-label">STATUS</span>
                  </div>
                </div>
                <div className="codex-hero-actions">
                  <Link href={`/novels/${heroNovel.id}`} className="codex-hero-btn codex-hero-btn-primary">
                    开始阅读 →
                  </Link>
                  <Link href={`/novels/${heroNovel.id}`} className="codex-hero-btn codex-hero-btn-secondary">
                    查看目录
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══════ STATS BAR ═══════ */}
        <div className="codex-stats codex-animate" style={{ animationDelay: '0.1s' }}>
          <div className="codex-stat-item">
            <div className="codex-stat-number">{stats.totalNovels}</div>
            <div className="codex-stat-label">Total Codices</div>
          </div>
          <div className="codex-stat-item">
            <div className="codex-stat-number">{stats.totalChapters}</div>
            <div className="codex-stat-label">Chapters</div>
          </div>
          <div className="codex-stat-item">
            <div className="codex-stat-number">{formatWords(stats.totalWords)}</div>
            <div className="codex-stat-label">Words Written</div>
          </div>
          <div className="codex-stat-item">
            <div className="codex-stat-number">{stats.totalAuthors}</div>
            <div className="codex-stat-label">Authors</div>
          </div>
        </div>

        {/* ═══════ DISCOVERY ENGINE ═══════ */}
        {!loading && novels.length > 0 && (
          <div className="codex-discovery codex-animate" style={{ animationDelay: '0.2s' }}>
            {/* Search */}
            <div className="codex-search-row">
              <svg className="codex-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="5" />
                <path d="M11 11l3 3" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                className="codex-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索书名、作者、标签..."
                aria-label="搜索书名、作者、标签"
              />
              {searchQuery && (
                <button
                  className="codex-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="清除搜索"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tag Pills */}
            <div className="codex-tag-row">
              {categories.slice(0, 10).map((category) => (
                <button
                  key={category}
                  className={`codex-tag-pill ${activeFilter === category ? 'active' : ''}`}
                  onClick={() => setActiveFilter(category)}
                >
                  {tagEmojis[category] || '📖'} {category}
                </button>
              ))}
            </div>

            {/* Sort & Count */}
            <div className="codex-sort-row">
              <div className="codex-sort-count">
                共 <strong>{filteredNovels.length}</strong> 部手稿
                &nbsp;
                <label style={{ cursor: 'pointer', fontSize: '11px', color: 'var(--codex-text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={showEmpty}
                    onChange={(e) => setShowEmpty(e.target.checked)}
                    style={{ accentColor: 'var(--codex-gold)' }}
                  />
                  {' '}显示筹备中
                </label>
              </div>
              <div className="codex-sort-options">
                {sortOptions.map((option) => (
                  <button
                    key={option.key}
                    className={`codex-sort-btn ${activeSort === option.key ? 'active' : ''}`}
                    onClick={() => setActiveSort(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ LOADING SKELETON ═══════ */}
        {loading && (
          <div className="codex-skeleton-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="codex-skeleton-card">
                <div className="codex-skeleton-cover" />
                <div className="codex-skeleton-info">
                  <div className="codex-skeleton-line" />
                  <div className="codex-skeleton-line" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════ NOVEL GRID ═══════ */}
        {!loading && filteredNovels.length > 0 && (
          <div className="codex-novel-grid">
            {filteredNovels.map((novel, i) => {
              const primaryTag = novel.tags?.split(',')[0]?.trim() || '故事';
              const emoji = tagEmojis[primaryTag] || '✨';
              const totalChapters = 30;
              const progress = Math.min(((novel.chapterCount || 0) / totalChapters) * 100, 100);

              return (
                <Link
                  key={novel.id}
                  href={`/novels/${novel.id}`}
                  className="codex-novel-card codex-animate"
                  style={{ animationDelay: `${Math.min(0.25 + i * 0.05, 0.8)}s` }}
                >
                  <div className="codex-card-cover">
                    <SafeCover
                      src={novel.cover_url}
                      alt={novel.title}
                      tag={novel.tags}
                    />

                    {/* 左上角类型标签 */}
                    <span className="codex-card-tag-overlay">
                      {emoji} {primaryTag}
                    </span>

                    {/* 右上角状态 */}
                    <span className={`codex-card-status ${novel.status === 'completed' ? 'completed' : 'ongoing'}`}>
                      {novel.status === 'completed' ? '完结' : '连载'}
                    </span>

                    {/* 底部进度条 */}
                    {novel.status !== 'completed' && (
                      <div className="codex-card-progress">
                        <div className="codex-card-progress-bar" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="codex-card-info">
                    <h3 className="codex-card-title">{novel.title}</h3>
                    <div className="codex-card-author-row">
                      <span className="codex-card-author">{novel.author || 'FireSeed AI'}</span>
                      <span className="codex-card-chapters">{novel.chapterCount || 0} 章</span>
                    </div>
                    <p className="codex-card-desc">{novel.description || '暂无简介'}</p>
                    {novel.tags && (
                      <div className="codex-card-tags">
                        {novel.tags.split(',').filter(Boolean).slice(0, 3).map((tag: string) => (
                          <span key={tag} className="codex-card-tag-mini">{tag.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ═══════ EMPTY FILTER RESULTS ═══════ */}
        {!loading && novels.length > 0 && filteredNovels.length === 0 && (
          <div className="codex-empty">
            <div className="codex-empty-icon">
              <span style={{ fontSize: '28px' }}>🔍</span>
            </div>
            <h3 className="codex-empty-title">暂无匹配结果</h3>
            <p className="codex-empty-desc">
              {searchQuery
                ? `没有找到与 "${searchQuery}" 相关的手稿`
                : `没有找到 "${activeFilter}" 分类下的手稿`
              }
            </p>
            <button
              onClick={() => { setActiveFilter('全部'); setSearchQuery(''); }}
              className="codex-empty-btn"
            >
              查看全部手稿
            </button>
          </div>
        )}

        {/* ═══════ EMPTY STATE (no novels at all) ═══════ */}
        {!loading && novels.length === 0 && (
          <div className="codex-empty">
            <div className="codex-empty-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--codex-gold)" strokeWidth="1.5">
                <path d="M14 4L4 9v11l10 5 10-5V9L14 4z" />
                <path d="M14 4v18M4 9l10 5 10-5" />
              </svg>
            </div>
            <h3 className="codex-empty-title">尚无手稿</h3>
            <p className="codex-empty-desc">
              创作者正在书写中，第一部手稿即将上线
            </p>
            <Link href="/admin" className="codex-empty-btn" style={{ textDecoration: 'none' }}>
              进入后台
            </Link>
          </div>
        )}

      </div>
    </>
  );
}
