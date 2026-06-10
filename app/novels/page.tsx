'use client';

import { getNovelsListMetadata } from '@/lib/seo';
import { generateItemListSchema } from '@/lib/structured-data';
import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SafeCover from '@/components/SafeCover';
import type { User, Novel, StatsData } from '@/types';

// 页面包装组件 — 提供 Suspense 边界（useSearchParams 需要）
export default function NovelsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-3">📚</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</p>
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

  // 从 URL 参数预筛选品类（从首页品类入口跳转时）
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    if (tagParam) {
      setActiveFilter(tagParam);
    }
  }, [searchParams]);

  // 类型标签配置
  const tagEmojis: Record<string, string> = {
    '全部': '📚', '玄幻': '⚡', '都市': '🏙', '仙侠': '🏯', '言情': '💕',
    '科幻': '🚀', '悬疑': '🔮', '历史': '📜', '恐怖': '👻',
    '军事': '⚔️', '奇幻': '🔮', '武侠': '⚡'
  };

  // 排序选项
  const sortOptions = [
    { key: '最新更新', label: '🆕 最新更新' },
    { key: '最多章节', label: '🔥 最多章节' },
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

  // 过滤和排序小说
  const filteredNovels = useMemo(() => {
    let filtered = [...novels];
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(novel =>
        novel.title?.toLowerCase().includes(query) ||
        novel.author?.toLowerCase().includes(query) ||
        novel.tags?.toLowerCase().includes(query) ||
        novel.description?.toLowerCase().includes(query)
      );
    }

    // 隐藏空作品（默认开启）
    if (!showEmpty) {
      filtered = filtered.filter(novel => (novel.chapterCount || 0) > 0);
    }

    // 分类筛选（精确匹配标签）
    if (activeFilter !== '全部') {
      filtered = filtered.filter(novel =>
        novel.tags?.split(',').map((t: string) => t.trim()).includes(activeFilter)
      );
    }
    
    // 排序
    switch (activeSort) {
      case '最新更新':
        filtered.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        break;
      case '最多章节':
        filtered.sort((a, b) => b.chapterCount - a.chapterCount);
        break;
      case '新书上架':
        filtered.sort((a, b) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime());
        break;
    }
    
    return filtered;
  }, [novels, activeFilter, activeSort, searchQuery, showEmpty]);

  // 获取小说列表
  useEffect(() => {
    Promise.all([
      fetch('/api/novels').then(res => res.json()).catch(() => ({ novels: [] })),
      fetch('/api/stats').then(res => res.json()).catch(() => ({ success: false }))
    ])
      .then(([data, statsData]) => {
        // 处理小说列表
        const list = Array.isArray(data) ? data : (data?.novels || []);
        const novelsWithTime = list.map((novel: Novel, i: number) => ({
          ...novel,
          updatedAt: novel.updatedAt || new Date(Date.now() - i * 86400000).toISOString()
        }));
        setNovels(novelsWithTime);

        // 注入结构化数据（JSON-LD）
        if (novelsWithTime.length > 0) {
          const schemaScript = document.createElement('script');
          schemaScript.type = 'application/ld+json';
          schemaScript.textContent = generateItemListSchema(novelsWithTime.slice(0, 20), '全部作品');
          document.head.appendChild(schemaScript);
        }

        // 处理统计数据
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
        if (data.loggedIn && data.user) {
          setUser(data.user);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* 数据看板 — 从首页迁移 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: '作品总数', value: stats.totalNovels.toString(), unit: '部', icon: '📚', color: '#10b981' },
            { label: '累计章节', value: stats.totalChapters.toString(), unit: '章', icon: '📖', color: 'var(--accent)' },
            { label: '累计字数', value: stats.totalWords >= 10000 ? (stats.totalWords / 10000).toFixed(1) : stats.totalWords.toString(), unit: stats.totalWords >= 10000 ? '万字' : '字', icon: '✍️', color: '#f59e0b' },
            { label: '注册作者', value: stats.totalAuthors.toString(), unit: '人', icon: '✍️', color: '#8b5cf6' }
          ].map((stat, i) => (
            <div key={i} className="card p-3 text-center animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{stat.icon}</span>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.unit}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 筛选与排序栏 - 借鉴 kanshuclaw */}
        {!loading && novels.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* 搜索框 */}
            <div className="relative">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2">
                <circle cx="7" cy="7" r="5"/>
                <path d="M11 11l3 3" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索书名、作者、标签..."
                aria-label="搜索书名、作者、标签"
                className="input pl-10 py-2.5 text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="清除搜索"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* 分类标签筛选 */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.slice(0, 8).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveFilter(category)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                  style={{
                    background: activeFilter === category ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: activeFilter === category ? 'white' : 'var(--text-secondary)',
                    border: activeFilter === category ? 'none' : '1px solid var(--border)'
                  }}
                >
                  {tagEmojis[category] || '📖'} {category}
                </button>
              ))}
            </div>

            {/* 排序选项 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  共 <span className="font-medium" style={{ color: 'var(--accent)' }}>{filteredNovels.length}</span> 部作品
                </p>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={showEmpty}
                    onChange={(e) => setShowEmpty(e.target.checked)}
                    className="rounded"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  显示筹备中作品
                </label>
              </div>
              <div className="flex items-center gap-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setActiveSort(option.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: activeSort === option.key ? 'var(--accent)' : 'transparent',
                      color: activeSort === option.key ? 'white' : 'var(--text-muted)',
                      border: activeSort === option.key ? 'none' : '1px solid var(--border)'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 加载中 */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-[3/4]" style={{ background: 'var(--bg-secondary)' }} />
                <div className="p-4">
                  <div className="h-4 rounded mb-2" style={{ background: 'var(--bg-secondary)', width: '70%' }} />
                  <div className="h-3 rounded" style={{ background: 'var(--bg-secondary)', width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 小说列表 */}
        {!loading && filteredNovels.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filteredNovels.map((novel, i) => {
              const primaryTag = novel.tags?.split(',')[0]?.trim() || '故事';
              const emoji = tagEmojis[primaryTag] || '✨';
              const totalChapters = 30;
              const progress = Math.min(((novel.chapterCount || 0) / totalChapters) * 100, 100);

              return (
                <Link
                  key={novel.id}
                  href={`/novels/${novel.id}`}
                  className="card overflow-hidden group animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <SafeCover
                      src={novel.cover_url}
                      alt={novel.title}
                      tag={novel.tags}
                    />

                    {/* 左上角类型标签 */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 rounded-lg text-sm backdrop-blur-sm"
                        style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}>
                        {emoji} {primaryTag}
                      </span>
                    </div>

                    {/* 右上角状态 */}
                    <div className="absolute top-3 right-3">
                      <span className={novel.status === 'completed' ? 'badge badge-success' : 'badge badge-warning'}>
                        {novel.status === 'completed' ? '完结' : '连载'}
                      </span>
                    </div>

                    {/* 悬停双按钮 */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ background: 'linear-gradient(to top, rgba(245,158,11,0.85), rgba(245,158,11,0.3))' }}>
                      <div className="absolute bottom-4 left-3 right-3 space-y-2">
                        <span 
                          role="button"
                          tabIndex={-1}
                          className="block w-full py-2 rounded-lg text-sm font-medium text-center backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer"
                          style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--accent)' }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/novels/${novel.id}`); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/novels/${novel.id}`); } }}>
                          继续阅读
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {novel.title}
                    </h3>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      {novel.author || 'FireSeed AI'} · {novel.chapterCount || 0} 章
                    </p>

                    {/* AI 生成进度条 */}
                    {novel.status !== 'completed' && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span>生成进度</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-light))' }}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {novel.description || '暂无简介'}
                    </p>

                    {novel.tags && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {novel.tags.split(',').filter(Boolean).slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 空筛选结果 */}
        {!loading && novels.length > 0 && filteredNovels.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>暂无匹配结果</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {searchQuery
                ? `没有找到与 "${searchQuery}" 相关的作品`
                : `没有找到 "${activeFilter}" 分类下的作品`
              }
            </p>
            <button 
              onClick={() => setActiveFilter('全部')}
              className="btn-primary text-sm"
            >
              查看全部作品
            </button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && novels.length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                <path d="M14 4L4 9v11l10 5 10-5V9L14 4z"/>
                <path d="M14 4v18M4 9l10 5 10-5"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>暂无作品</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              创作者正在努力中，第一部作品即将上线
            </p>
            <Link href="/admin" className="btn-primary">进入后台</Link>
          </div>
        )}
      </div>
    </div>
  );
}
