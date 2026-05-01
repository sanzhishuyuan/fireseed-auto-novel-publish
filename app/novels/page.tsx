'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Novel {
  id: string;
  title: string;
  author: string;
  description: string;
  tags: string;
  status: string;
  chapterCount: number;
  updatedAt?: string;
}

export default function NovelsPage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('全部');
  const [activeSort, setActiveSort] = useState<string>('最新更新');
  const router = useRouter();

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
    
    // 分类筛选
    if (activeFilter !== '全部') {
      filtered = filtered.filter(novel => 
        novel.tags?.includes(activeFilter)
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
  }, [novels, activeFilter, activeSort]);

  // 获取小说列表
  useEffect(() => {
    fetch('/api/novels')
      .then(res => res.json())
      .then(data => {
        // 兼容旧格式（直接返回数组）和新格式（{success, novels}）
        const list = Array.isArray(data) ? data : (data?.novels || []);
        const novelsWithTime = list.map((novel: Novel, i: number) => ({
          ...novel,
          updatedAt: novel.updatedAt || new Date(Date.now() - i * 86400000).toISOString()
        }));
        setNovels(novelsWithTime);
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
              <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>全部作品</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {loading ? '加载中...' : `${novels.length} 部作品`}
              </p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1">
            <Link href="/" className="btn-ghost text-sm hide-mobile">首页</Link>
            
            {/* 用户菜单 */}
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
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5"
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
        {/* 筛选与排序栏 - 借鉴 kanshuclaw */}
        {!loading && novels.length > 0 && (
          <div className="mb-8 space-y-4">
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
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                共 <span className="font-medium" style={{ color: 'var(--accent)' }}>{filteredNovels.length}</span> 部作品
              </p>
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredNovels.map((novel, i) => {
              const primaryTag = novel.tags?.split(',')[0]?.trim() || '故事';
              const emoji = tagEmojis[primaryTag] || '✨';
              const totalChapters = 30;
              const progress = Math.min((novel.chapterCount / totalChapters) * 100, 100);

              return (
                <Link
                  key={novel.id}
                  href={`/novels/${novel.id}`}
                  className="card overflow-hidden group animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div
                    className="aspect-[3/4] relative overflow-hidden"
                    style={{ background: 'linear-gradient(160deg, #2d1f10 0%, #5c3d1e 60%, #8b5e3c 100%)' }}
                  >
                    {/* 左上角类型 emoji */}
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

                    {/* 中心图标 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-14 h-14 rounded-full border-2 border-white/20 flex items-center justify-center mb-3 opacity-60">
                        <span className="text-2xl">{emoji}</span>
                      </div>
                      <span className="text-white/40 text-xs font-medium tracking-widest uppercase">
                        {primaryTag}
                      </span>
                    </div>

                    {/* 悬停双按钮 */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ background: 'linear-gradient(to top, rgba(124,58,237,0.85), rgba(124,58,237,0.3))' }}>
                      <div className="absolute bottom-4 left-3 right-3 space-y-2">
                        <button 
                          className="w-full py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition-transform hover:scale-105"
                          style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--accent)' }}
                          onClick={(e) => { e.preventDefault(); router.push(`/novels/${novel.id}`); }}
                        >
                          继续阅读
                        </button>
                        <button 
                          className="w-full py-2 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/30 text-white transition-transform hover:scale-105"
                          onClick={(e) => { e.preventDefault(); router.push(`/novels/${novel.id}/1`); }}
                        >
                          从头开始
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {novel.title}
                    </h3>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      {novel.author || 'Spark AI'} · {novel.chapterCount} 章
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
              没有找到 "{activeFilter}" 分类下的作品
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
