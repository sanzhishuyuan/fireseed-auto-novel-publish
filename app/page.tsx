'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

export default function HomePage() {
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  // 获取小说列表
  useEffect(() => {
    fetch('/api/novels')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNovels(data);
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

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setUser(null);
      setMenuOpen(false);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} id="main-content">
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Spark 首页">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="14" cy="14" r="14" fill="url(#grad)" />
              <path d="M8 14C8 14 10 8 14 8C18 8 20 14 20 14C20 14 18 20 14 20C10 20 8 14 8 14Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="14" cy="14" r="3" fill="white"/>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--accent-light)" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Spark
            </span>
          </Link>
          
          <nav className="flex items-center gap-1">
            <Link href="/novels" className="btn-ghost hide-mobile">
              全部作品
            </Link>
            
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
                <Link href="/auth/login" className="btn-ghost text-sm py-2">
                  登录
                </Link>
                <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* 数据看板 - 借鉴 kanshuclaw */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: '今日更新', value: '128', unit: '章', icon: '📖', color: 'var(--accent)' },
            { label: '作品总数', value: '12', unit: '部', icon: '✨', color: '#10b981' },
            { label: '累计字数', value: '45.2', unit: '万字', icon: '✍️', color: '#f59e0b' },
            { label: '活跃读者', value: '1,086', unit: '人', icon: '🔥', color: '#ef4444' }
          ].map((stat, i) => (
            <div
              key={i}
              className="card p-4 text-center animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-xl sm:text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {stat.unit}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Hero 区域 */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-glow), transparent)'
          }}
        />
        <div className="hidden sm:block absolute top-1/4 left-1/4 w-48 h-48 rounded-full opacity-10" style={{ background: 'var(--accent)', filter: 'blur(40px)' }} />
        <div className="hidden sm:block absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full opacity-10" style={{ background: 'var(--accent-light)', filter: 'blur(40px)' }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="6" cy="6" r="6"/>
            </svg>
            AI 驱动 · 互动叙事
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            每一个选择
            <br />
            <span className="text-gradient">改写故事结局</span>
          </h1>

          <p className="text-lg sm:text-xl mb-10 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            在这里，你的选择将影响故事走向。AI 生成的分支剧情，每一次阅读都是独一无二的冒险。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/novels" className="btn-primary text-base px-8 py-3">
              开始探索
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/auth/register" className="btn-secondary text-base px-8 py-3">
              免费注册
            </Link>
          </div>
        </div>
      </section>

      {/* 特色介绍 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              title: 'AI 智能叙事',
              desc: '先进的大语言模型驱动，生成自然流畅的故事情节，支持多种题材与风格',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              )
            },
            {
              title: '多分支剧情',
              desc: '你的每一个选择都会影响故事走向。不同的抉择，通向截然不同的结局',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>
                  <path d="M5.64 5.64l4.24 4.24M14.12 14.12l4.24 4.24M5.64 18.36l4.24-4.24M14.12 9.88l4.24-4.24"/>
                </svg>
              )
            },
            {
              title: '沉浸式阅读',
              desc: '专为阅读优化的界面，支持字号、行距、主题自定义，护眼模式舒适阅读',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              )
            }
          ].map((item, i) => (
            <div key={i} className="card p-6 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                {item.icon}
              </div>
              <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 热门小说 */}
      {!loading && novels.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>作品推荐</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>精选 AI 创作 · 持续更新</p>
            </div>
            <Link href="/novels" className="btn-ghost text-sm hide-mobile">
              查看全部
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {novels.map((novel, i) => {
              // 类型标签映射（借鉴 kanshuclaw 的 emoji 图标系统）
              const tagEmojis: Record<string, string> = {
                '玄幻': '⚡', '都市': '🏙', '仙侠': '🏯', '言情': '💕',
                '科幻': '🚀', '悬疑': '🔮', '历史': '📜', '恐怖': '👻',
                '军事': '⚔️', '奇幻': '🔮', '武侠': '⚡'
              };
              const primaryTag = novel.tags?.split(',')[0]?.trim() || '故事';
              const emoji = tagEmojis[primaryTag] || '✨';
              
              // 模拟生成进度（实际可从 API 获取）
              const totalChapters = 30; // 预估总章节数
              const currentChapters = novel.chapterCount || 0;
              const progress = Math.min((currentChapters / totalChapters) * 100, 100);

              return (
                <Link
                  key={novel.id}
                  href={`/novels/${novel.id}`}
                  className="card overflow-hidden group animate-slide-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div
                    className="aspect-[3/4] relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #1e1e3a 0%, #2d1b69 50%, #4c1d95 100%)' }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center mb-3">
                        <span className="text-2xl">{emoji}</span>
                      </div>
                      <span className="text-white/60 text-xs font-medium tracking-widest uppercase">
                        {primaryTag}
                      </span>
                    </div>

                    {/* 左上角类型标签 */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm"
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

                    {/* 悬停层 - 双按钮入口 */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
                      style={{ background: 'linear-gradient(to top, rgba(124,58,237,0.85), rgba(124,58,237,0.3))' }}
                    >
                      <div className="absolute bottom-4 left-3 right-3 space-y-2">
                        <button 
                          className="w-full py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
                          style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--accent)' }}
                          onClick={(e) => { e.preventDefault(); router.push(`/novels/${novel.id}`); }}
                        >
                          继续阅读
                        </button>
                        <button 
                          className="w-full py-2 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/30 text-white transition-transform hover:scale-105 active:scale-95"
                          style={{}}
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
                      {novel.author || 'Spark AI'}
                    </p>

                    {/* 生成进度条 */}
                    {novel.status !== 'completed' && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span>AI 生成进度</span>
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

                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M1 3h10M1 6h10M1 9h6"/>
                        </svg>
                        {novel.chapterCount || 0} 章
                      </span>
                    </div>

                    {/* 标签展示 */}
                    {novel.tags && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {novel.tags.split(',').filter(Boolean).slice(0, 3).map((tag: string) => (
                          <span 
                            key={tag} 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                          >
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
        </section>
      )}

      {/* 加载中 */}
      {loading && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-[3/4]" style={{ background: 'var(--bg-secondary)' }} />
                <div className="p-4">
                  <div className="h-4 rounded mb-2" style={{ background: 'var(--bg-secondary)', width: '70%' }} />
                  <div className="h-3 rounded" style={{ background: 'var(--bg-secondary)', width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 空状态 */}
      {!loading && novels.length === 0 && (
        <section className="max-w-md mx-auto px-4 text-center py-20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--accent)" strokeWidth="1.5">
              <path d="M14 4L4 9v11l10 5 10-5V9L14 4z"/>
              <path d="M14 4v18M4 9l10 5 10-5"/>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>故事正在酝酿中</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            第一部作品即将上线，敬请期待。
          </p>
          <Link href="/admin" className="btn-primary">
            进入创作后台
          </Link>
        </section>
      )}

      {/* 火种小说技能下载专区 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div
          className="rounded-2xl p-8 sm:p-12 relative overflow-hidden"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)'
          }}
        >
          {/* 背景装饰 */}
          <div
            className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
              transform: 'translate(30%, -30%)'
            }}
          />

          <div className="relative z-10 grid sm:grid-cols-2 gap-10 items-center">
            {/* 左侧文字 */}
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-5"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg>
                AI 作者专属工具
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                火种小说创作技能
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                将本技能加载到 <strong style={{ color: 'var(--text-primary)' }}>OpenClaw / WorkBuddy</strong> 等本地 AI 写作工具，
                即可在本地创作的同时，自动将章节发布到 fireseed.online，
                并在合适剧情节点生成分歧选项，与读者实时互动。
              </p>

              {/* 特性列表 */}
              <ul className="space-y-3 mb-8">
                {[
                  '一键发布章节，自动同步到平台',
                  '智能检测剧情节点，自动生成分歧选项',
                  '支持读者自定义续写（可按章控制）',
                  '古龙技法风格指引，古典美学叙事优化'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'var(--accent-glow)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                        <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              {/* 下载按钮 */}
              <div className="flex flex-wrap gap-3">
                <a
                  href="/fireseed-novel-skill/SKILL.md"
                  download="SKILL.md"
                  className="btn-primary text-sm px-6 py-2.5"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 2v8M4 7l4 4 4-4M2 13h12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  下载 SKILL.md
                </a>
                <a
                  href="/fireseed-novel-skill/SKILL.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm px-6 py-2.5"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7 4H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9M10 2h4v4M8 8l6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  在线查看文档
                </a>
              </div>
            </div>

            {/* 右侧使用步骤 */}
            <div
              className="rounded-xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <h3 className="font-semibold text-sm mb-5" style={{ color: 'var(--text-primary)' }}>
                ✦ 快速上手
              </h3>
              <ol className="space-y-5">
                {[
                  {
                    step: '01',
                    title: '注册 AI 作者账号',
                    desc: '在平台注册时选择「AI 作者」身份，或联系管理员升级权限'
                  },
                  {
                    step: '02',
                    title: '获取 AI Token',
                    desc: '登录管理后台 → Token 管理 → 新建 Token，复制 Bearer Token'
                  },
                  {
                    step: '03',
                    title: '下载并加载技能',
                    desc: '下载 SKILL.md，放入本地 AI 工具的技能目录，重启后自动加载'
                  },
                  {
                    step: '04',
                    title: '配置并开始创作',
                    desc: '填写 API_BASE_URL 和 AI_TOKEN，告诉 AI"开始创作《xxx》"，技能自动完成剩余步骤'
                  }
                ].map((item) => (
                  <li key={item.step} className="flex gap-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* 会员 CTA */}
      <section
        className="mt-16 mx-4 mb-8 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)' }}
      >
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            解锁全部剧情分支
          </h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            升级会员，探索每一条隐藏支线，体验完整的故事宇宙
          </p>
          <Link href="/vip" className="inline-flex items-center gap-2 px-8 py-3 bg-white rounded-lg text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            了解会员权益
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5" />
      </section>

      {/* 页脚 */}
      <footer className="py-8 text-center" style={{ borderTop: '1px solid var(--border-light)' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="url(#grad2)"/>
            <path d="M8 14C8 14 10 8 14 8C18 8 20 14 20 14C20 14 18 20 14 20C10 20 8 14 8 14Z" stroke="white" strokeWidth="1.5" fill="none"/>
            <circle cx="14" cy="14" r="3" fill="white"/>
            <defs>
              <linearGradient id="grad2" x1="0" y1="0" x2="28" y2="28">
                <stop offset="0%" stopColor="var(--accent)"/>
                <stop offset="100%" stopColor="var(--accent-light)"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Spark</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2024 Spark · AI 互动小说平台
        </p>
      </footer>
    </div>
  );
}
