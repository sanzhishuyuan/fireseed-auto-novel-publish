'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

interface HeaderProps {
  user?: User | null;
}

export default function Header({ user: initialUser }: HeaderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/user/me', { credentials: 'include' });
      const data = await res.json();
      if (data.loggedIn && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  }, []);

  // 如果没有初始用户数据，则获取
  if (!initialUser && !user) {
    fetchUser();
  }

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

  // Logo 组件
  const Logo = () => (
    <Link href="/" className="flex items-center gap-2" aria-label="Spark 首页">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="14" cy="14" r="14" fill="url(#headerGrad)" />
        <path d="M8 14C8 14 10 8 14 8C18 8 20 14 20 14C20 14 18 20 14 20C10 20 8 14 8 14Z" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="14" cy="14" r="3" fill="white"/>
        <defs>
          <linearGradient id="headerGrad" x1="0" y1="0" x2="28" y2="28">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-light)" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Spark
      </span>
    </Link>
  );

  // 已登录状态
  if (user) {
    return (
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo />
          
          <div className="flex items-center gap-1">
            <Link href="/chat" className="btn-ghost hide-mobile">
              社区
            </Link>
            <Link href="/novels" className="btn-ghost hide-mobile">
              全部作品
            </Link>
            
            {/* 用户菜单 */}
            <div className="relative ml-2">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                style={{ 
                  background: menuOpen ? 'var(--bg-secondary)' : 'transparent',
                  color: 'var(--text-primary)'
                }}
              >
                {/* 用户头像 */}
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

              {/* 下拉菜单 */}
              {menuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setMenuOpen(false)}
                  />
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
                      <Link 
                        href="/my"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M8 8a3 3 0 100-6 3 3 0 000 6z"/>
                          <path d="M13 14c0-2.8-2.2-5-5-5s-5 2.2-5 5"/>
                        </svg>
                        个人中心
                      </Link>
                      <Link 
                        href="/my/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="8" cy="8" r="2"/>
                          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41"/>
                        </svg>
                        个人设置
                      </Link>
                      <Link 
                        href="/favorites"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M8 13.5S1 9 1 4.5a2.5 2.5 0 0 1 4-1.8 2.5 2.5 0 0 1 4 1.8c0 4.5-7 9-7 9z"/>
                        </svg>
                        我的收藏
                      </Link>
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
          </div>
        </div>
      </header>
    );
  }

  // 未登录状态
  return (
    <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link href="/chat" className="btn-ghost hide-mobile">
            社区
          </Link>
          <Link href="/novels" className="btn-ghost hide-mobile">
            全部作品
          </Link>
          <Link href="/auth/login" className="btn-ghost text-sm py-2">
            登录
          </Link>
          <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
            注册
          </Link>
        </nav>
      </div>
    </header>
  );
}
