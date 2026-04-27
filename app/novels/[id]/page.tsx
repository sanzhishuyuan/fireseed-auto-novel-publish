'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Chapter {
  filePath: string;
  meta: {
    title: string;
    branch?: string;
    choices?: any[];
  };
  content?: string;
}

interface Novel {
  id: string;
  title: string;
  author: string;
  description: string;
  tags: string;
  status: string;
}

export default function NovelDetailPage({ params }: { params: { id: string } }) {
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  // 获取小说详情和章节
  useEffect(() => {
    Promise.all([
      fetch(`/api/novels/${params.id}`).then(r => r.json()),
      fetch(`/api/novels/${params.id}/chapters`).then(r => r.json())
    ])
      .then(([novelData, chaptersData]) => {
        if (novelData.id) {
          setNovel(novelData);
          document.title = `${novelData.title} - Spark`;
        }
        if (Array.isArray(chaptersData)) {
          setChapters(chaptersData);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  // 获取用户状态和收藏状态
  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(res => res.json())
      .then(async data => {
        if (data.loggedIn && data.user) {
          setUser(data.user);
          // 获取收藏状态
          const favRes = await fetch(`/api/user/favorites/${params.id}`, { credentials: 'include' });
          const favData = await favRes.json();
          setIsFavorite(favData.isFavorite || false);
        }
      })
      .catch(console.error);
  }, [params.id]);

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

  const handleFavorite = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (favoriteLoading) return;
    setFavoriteLoading(true);

    try {
      const res = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ novelId: params.id })
      });
      const data = await res.json();
      if (res.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      console.error('Favorite error:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  // 过滤主线章节
  const mainChapters = chapters.filter(c => c.meta?.branch === 'main');

  if (loading) {
    return (
      <div className="min-h-screen pb-20" style={{ background: 'var(--bg-primary)' }}>
        <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
              <div>
                <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse">
            <div className="h-6 w-48 rounded mb-4" style={{ background: 'var(--bg-secondary)' }} />
            <div className="h-4 w-full rounded" style={{ background: 'var(--bg-secondary)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>小说不存在</h2>
          <Link href="/novels" className="btn-primary">返回作品列表</Link>
        </div>
      </div>
    );
  }

  const tags = (novel.tags || '').split(',').filter(Boolean);

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/novels" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13 8H3M7 4L3 8l4 4"/>
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
                {novel.title}
              </h1>
              <p className="text-xs hide-mobile" style={{ color: 'var(--text-muted)' }}>
                {mainChapters.length} 章
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/novels" className="btn-ghost text-sm hide-mobile">
              返回
            </Link>
            <button
              onClick={handleFavorite}
              disabled={favoriteLoading}
              className={isFavorite ? 'btn-secondary text-sm py-2 px-4' : 'btn-primary text-sm py-2 px-4'}
              style={isFavorite ? { color: '#ef4444' } : {}}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path d="M7 12.5S1 8.5 1 4.5a2.5 2.5 0 0 1 4-1.8 2.5 2.5 0 0 1 4 1.8c0 4-6 8-6 8z"/>
              </svg>
              {isFavorite ? '已收藏' : '收藏'}
            </button>
            
            {/* 用户菜单（桌面端） */}
            {user && (
              <div className="relative ml-2 hide-mobile">
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
                      </div>
                      <div className="py-1">
                        {user.role === 'admin' && (
                          <Link 
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm"
                            style={{ color: 'var(--accent)' }}
                            onClick={() => setMenuOpen(false)}
                          >
                            管理后台
                          </Link>
                        )}
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-light)' }}>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left"
                          style={{ color: '#ef4444' }}
                        >
                          退出登录
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* 左侧信息卡 */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              {/* 封面 */}
              <div
                className="aspect-[3/4] rounded-xl mb-5 flex flex-col items-center justify-center overflow-hidden relative"
                style={{ background: 'linear-gradient(160deg, #1a1a3e 0%, #2d1b69 60%, #4c1d95 100%)' }}
              >
                <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center opacity-60">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                    <path d="M12 3L3 7.5v10L12 21l9-3.5V7.5L12 3z"/>
                    <path d="M12 3v14M3 7.5l9 4 9-4"/>
                  </svg>
                </div>
                <span className="text-white/40 text-xs font-medium tracking-widest uppercase mt-2">
                  {tags[0] || 'STORY'}
                </span>
              </div>

              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {novel.title}
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--accent)' }}>
                {novel.author || 'Spark AI'}
              </p>

              {/* 统计 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{mainChapters.length}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>章节</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{novel.status === 'completed' ? '完结' : '连载'}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>状态</div>
                </div>
              </div>

              {/* 标签 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tags.map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* 简介 */}
              {novel.description && (
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                  {novel.description}
                </p>
              )}

              {/* 状态 */}
              <div className="mb-5">
                <span className={novel.status === 'completed' ? 'badge badge-success' : 'badge badge-warning'}>
                  {novel.status === 'completed' ? '已完结' : '连载中'}
                </span>
              </div>

              {/* 开始阅读 */}
              {mainChapters.length > 0 && (
                <Link
                  href={`/novels/${params.id}/${mainChapters[0].filePath}`}
                  className="btn-primary w-full justify-center text-sm py-3"
                >
                  开始阅读
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              )}
            </div>
          </div>

          {/* 右侧目录 */}
          <div className="lg:col-span-3">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  目录
                </h3>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  共 {mainChapters.length} 章
                </span>
              </div>

              {mainChapters.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                  {mainChapters.map((chapter, index) => (
                    <Link
                      key={chapter.filePath}
                      href={`/novels/${params.id}/${chapter.filePath}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0"
                        style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {chapter.meta.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {chapter.content?.length || 0} 字
                        </p>
                      </div>
                      {chapter.meta.choices && chapter.meta.choices.length > 0 && (
                        <span className="badge badge-purple text-xs shrink-0">
                          分支
                        </span>
                      )}
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="shrink-0">
                        <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无章节</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
