'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

export default function UserNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

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

  // 加载中状态 - 显示最小化内容避免闪烁
  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--bg-secondary)' }} />
      </div>
    );
  }

  // 已登录状态
  if (user) {
    return (
      <div className="relative">
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
          {/* 用户名（桌面端） */}
          <span className="text-sm font-medium hide-mobile">
            {user.username}
          </span>
          {/* 下拉箭头 */}
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
            {/* 遮罩层 */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setMenuOpen(false)}
            />
            {/* 菜单 */}
            <div 
              className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-20"
              style={{ 
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              {/* 用户信息 */}
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {user.username}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {user.role === 'admin' ? '管理员' : '普通用户'}
                </p>
              </div>
              
              {/* 菜单项 */}
              <div className="py-1">
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
                <Link 
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setMenuOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="8" r="2"/>
                    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41"/>
                  </svg>
                  阅读设置
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

              {/* 退出登录 */}
              <div 
                className="py-1"
                style={{ borderTop: '1px solid var(--border-light)' }}
              >
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
    );
  }

  // 未登录状态
  return (
    <div className="flex items-center gap-2">
      <Link href="/auth/login" className="btn-ghost text-sm py-2">
        登录
      </Link>
      <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
        注册
      </Link>
    </div>
  );
}
