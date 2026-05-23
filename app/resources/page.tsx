'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Resource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  tags: string;
  provider_id: string | null;
  provider_name: string;
  status: string;
  useful_count: number;
  useless_count: number;
  verified_count: number;
  created_at: string;
  user_vote: string | null;
}

interface ApiMeta {
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}

interface ApiResponse {
  success: boolean;
  data: Resource[];
  meta: ApiMeta;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'ai-tool': '🤖',
  'ai-coding': '💻',
  'ai-image': '🎨',
  'ai-video': '🎬',
  'ai-api': '🔌',
  'ai-data': '📊',
  'dev-tools': '🛠️',
  'other': '📦',
};

const CATEGORY_LABELS: Record<string, string> = {
  'ai-tool': 'AI 对话',
  'ai-coding': 'AI 编程',
  'ai-image': 'AI 图像',
  'ai-video': 'AI 视频',
  'ai-api': 'API 平台',
  'ai-data': '数据训练',
  'dev-tools': '开发工具',
  'other': '其他资源',
};

const CATEGORY_COLORS: Record<string, string> = {
  'ai-tool': '#6366f1',
  'ai-coding': '#10b981',
  'ai-image': '#f59e0b',
  'ai-video': '#ef4444',
  'ai-api': '#8b5cf6',
  'ai-data': '#06b6d4',
  'dev-tools': '#3b82f6',
  'other': '#6b7280',
};

const CATEGORY_ORDER = ['ai-tool', 'ai-coding', 'ai-image', 'ai-video', 'ai-api', 'ai-data', 'dev-tools', 'other'];

const SORT_OPTIONS = [
  { key: 'useful', label: '最有帮助' },
  { key: 'newest', label: '最新添加' },
  { key: 'votes', label: '最多投票' },
];

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeSort, setActiveSort] = useState<string>('useful');
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [page, setPage] = useState(1);
  const router = useRouter();

  const fetchResources = useCallback(async (cat: string, sort: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat) params.set('category', cat);
      params.set('sort', sort);
      params.set('page', String(p));
      params.set('limit', '20');

      const res = await fetch(`/api/resources?${params.toString()}`);
      const json: ApiResponse = await res.json();
      if (json.success) {
        setResources(json.data);
        setMeta(json.meta);
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources(activeCategory, activeSort, page);
  }, [activeCategory, activeSort, page, fetchResources]);

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

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setUser(null);
      setMenuOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setPage(1);
  };

  const handleSortChange = (sort: string) => {
    setActiveSort(sort);
    setPage(1);
  };

  const totalPages = meta ? Math.ceil(meta.total / meta.page_size) : 0;

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13 8H3M7 4L3 8l4 4"/>
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>可信资源库</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {loading ? '加载中...' : meta ? `${meta.total} 个资源` : ''}
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <Link href="/" className="btn-ghost text-sm hide-mobile">首页</Link>
            <Link href="/novels" className="btn-ghost text-sm hide-mobile">作品</Link>

            {user ? (
              <div className="relative ml-2">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                  style={{
                    background: menuOpen ? 'var(--bg-secondary)' : 'transparent',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'white' }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium hide-mobile">
                    {user.username}
                  </span>
                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                    className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div
                      className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-20"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-lg)'
                      }}
                    >
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {user.username}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {user.role === 'admin' ? '管理员' : '普通用户'}
                        </p>
                      </div>
                      <div className="py-1">
                        {user.role === 'admin' && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                            style={{ color: 'var(--accent)' }}
                            onClick={() => setMenuOpen(false)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="2" y="3" width="12" height="10" rx="2"/>
                              <path d="M5 7h6M5 10h4"/>
                            </svg>
                            管理后台
                          </Link>
                        )}
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-light)' }}>
                        <button
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors"
                          style={{ color: '#ef4444' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6"/>
                          </svg>
                          {loggingOut ? '退出中...' : '退出登录'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="btn-ghost text-sm py-2">登录</Link>
                <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">注册</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* 分类筛选 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => handleCategoryChange('')}
              className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
              style={{
                background: activeCategory === '' ? 'var(--accent)' : 'var(--bg-secondary)',
                color: activeCategory === '' ? 'white' : 'var(--text-secondary)',
                border: activeCategory === '' ? 'none' : '1px solid var(--border)'
              }}
            >
              全部
            </button>
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5"
                style={{
                  background: activeCategory === cat ? CATEGORY_COLORS[cat] : 'var(--bg-secondary)',
                  color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                  border: activeCategory === cat ? 'none' : '1px solid var(--border)'
                }}
              >
                <span>{CATEGORY_EMOJIS[cat]}</span>
                <span>{CATEGORY_LABELS[cat]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 排序和统计 */}
        {!loading && resources.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              共 <span className="font-medium" style={{ color: 'var(--accent)' }}>{meta?.total || 0}</span> 个资源
            </p>
            <div className="flex items-center gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleSortChange(option.key)}
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
        )}

        {/* 加载骨架屏 */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--bg-secondary)' }} />
                    <div className="flex-1">
                      <div className="h-4 rounded mb-1" style={{ background: 'var(--bg-secondary)', width: '70%' }} />
                      <div className="h-3 rounded" style={{ background: 'var(--bg-secondary)', width: '40%' }} />
                    </div>
                  </div>
                  <div className="h-3 rounded mb-2" style={{ background: 'var(--bg-secondary)' }} />
                  <div className="h-3 rounded mb-3" style={{ background: 'var(--bg-secondary)', width: '80%' }} />
                  <div className="flex gap-2">
                    <div className="h-5 w-12 rounded" style={{ background: 'var(--bg-secondary)' }} />
                    <div className="h-5 w-12 rounded" style={{ background: 'var(--bg-secondary)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 资源卡片网格 */}
        {!loading && resources.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {resources.map((resource, i) => {
              const emoji = CATEGORY_EMOJIS[resource.category] || '📦';
              const color = CATEGORY_COLORS[resource.category] || '#6b7280';
              const totalVotes = resource.useful_count + resource.useless_count;
              const usefulness = totalVotes > 0 ? Math.round((resource.useful_count / totalVotes) * 100) : 0;
              const firstTag = resource.tags ? resource.tags.split(',')[0]?.trim() : '';

              return (
                <Link
                  key={resource.id}
                  href={`/resources/${resource.id}`}
                  className="card overflow-hidden group animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="p-4">
                    {/* 标题行 */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: `${color}20` }}
                      >
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight mb-0.5 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                          {resource.title}
                        </h3>
                        <p className="text-xs truncate" style={{ color: color }}>
                          {CATEGORY_LABELS[resource.category] || resource.category}
                        </p>
                      </div>
                    </div>

                    {/* 描述 */}
                    <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
                      {resource.description || '暂无描述'}
                    </p>

                    {/* 标签 */}
                    {firstTag && (
                      <div className="mb-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                          {firstTag}
                        </span>
                      </div>
                    )}

                    {/* 统计信息 */}
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#10b981" strokeWidth="1.5">
                          <path d="M1 7l4-5 3 3L11 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V7z"/>
                        </svg>
                        {resource.useful_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#ef4444" strokeWidth="1.5">
                          <path d="M11 5L7 10 4 7 1 11V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1z"/>
                        </svg>
                        {resource.useless_count}
                      </span>
                      <span className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M6 1v5l3 2M11 6A5 5 0 1 1 1 6a5 5 0 0 1 10 0z"/>
                        </svg>
                        {resource.verified_count} 验证
                      </span>
                      {totalVotes > 0 && (
                        <span className="ml-auto font-medium" style={{ color: usefulness >= 80 ? '#10b981' : 'var(--text-muted)' }}>
                          {usefulness}%
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 分页 */}
        {!loading && meta && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-40"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              上一页
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: page === pageNum ? 'var(--accent)' : 'transparent',
                    color: page === pageNum ? 'white' : 'var(--text-secondary)',
                    border: page === pageNum ? 'none' : '1px solid var(--border)'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-40"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              下一页
            </button>
          </div>
        )}

        {/* 空筛选结果 */}
        {!loading && meta && meta.total > 0 && resources.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>暂无匹配结果</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {activeCategory ? `没有找到 "${CATEGORY_LABELS[activeCategory] || activeCategory}" 分类下的资源` : '没有找到相关资源'}
            </p>
            <button
              onClick={() => { setActiveCategory(''); setPage(1); }}
              className="btn-primary text-sm"
            >
              查看全部资源
            </button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && meta && meta.total === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                <rect x="3" y="4" width="22" height="20" rx="3"/>
                <path d="M9 10h10M9 14h7M9 18h4"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>暂无资源</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              还没有任何可信资源，快来提交第一个吧
            </p>
            <Link href="/resources/submit" className="btn-primary">提交资源</Link>
          </div>
        )}

        {/* 底部提交按钮 */}
        {!loading && resources.length > 0 && (
          <div className="flex justify-center mt-8">
            <Link href="/resources/submit" className="btn-primary px-6 py-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
              </svg>
              提交资源
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
