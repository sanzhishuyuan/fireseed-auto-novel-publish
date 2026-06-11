'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HeaderContext, type HeaderConfig } from './HeaderContext';
import type { User } from '@/types';

// ============ Constants ============
const NAV_LINKS = [
  { href: '/rpg', label: 'AI跑团' },
  { href: '/novels', label: '全部作品' },
  { href: '/tasks', label: '任务市场' },
  { href: '/crowdfunding', label: '众筹广场' },
  { href: '/chat', label: '社区' },
  { href: '/resources', label: '可信资源' },
  { href: '/opportunities', label: '商机动态' },
  { href: '/download', label: '火种基地' },
];

const DRAWER_NAV_LINKS = [
  { href: '/', label: '首页', icon: 'M2 8l6-6 6 6M4 7v6a1 1 0 001 1h6a1 1 0 001-1V7' },
  { href: '/rpg', label: 'AI跑团', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { href: '/novels', label: '全部作品', icon: 'M2 3h6a4 4 0 0 1 4 4v6a3 3 0 0 0-3-3H2zM14 3h-6a4 4 0 0 0-4 4v6a3 3 0 0 1 3-3h7z' },
  { href: '/tasks', label: '任务市场', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href: '/crowdfunding', label: '众筹广场', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/chat', label: '社区', icon: 'M2 4h12v8H4l-2 2zM6 8h.01M9 8h.01M12 8h.01' },
  { href: '/resources', label: '可信资源', icon: 'M2 2h12v12H2zM6 6h4M6 9h2' },
  { href: '/opportunities', label: '商机动态', icon: 'M2 12l5-5 3 3 5-7' },
  { href: '/download', label: '火种基地', icon: 'M12 3v10m0 0l-4-4m4 4l4-4M4 15v1a2 2 0 002 2h8a2 2 0 002-2v-1' },
];

/** Route-based default title map */
const ROUTE_TITLES: Record<string, string> = {
  '/chat': '火种社区',
  '/vip': '会员中心',
  '/plan': '共创计划',
  '/resources': '可信资源',
  '/opportunities': '商机动态',
  '/download': '火种基地',
  '/feedback': '意见反馈',
  '/referral': '推广中心',
  '/crowdfunding': '众筹',
  '/skills': '技能中心',
  '/rpg': 'AI跑团',
  '/seed/stats': 'SEED 统计',
  '/seed/leaderboard': '排行榜',
};

/** Route prefixes where the global Header should be hidden */
const HIDE_PREFIXES = ['/admin', '/my', '/auth'];

function getRouteTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.match(/^\/novels\/[^/]+\/branches\//)) return '分支详情';
  if (pathname.match(/^\/novels\/[^/]+\/[^/]+$/)) return '阅读';
  if (pathname.match(/^\/novels\/[^/]+$/)) return '作品详情';
  if (pathname.match(/^\/resources\/[^/]+$/)) return '资源详情';
  if (pathname.match(/^\/opportunities\/submit$/)) return '提交商机';
  if (pathname.match(/^\/resources\/submit$/)) return '提交资源';
  return '';
}

function getRouteBackHref(pathname: string): string {
  if (pathname.match(/^\/novels\/[^/]+\/branches\//)) {
    const parts = pathname.split('/');
    return `/novels/${parts[2]}`;
  }
  if (pathname.match(/^\/novels\/[^/]+\/[^/]+$/)) {
    const parts = pathname.split('/');
    return `/novels/${parts[2]}`;
  }
  if (pathname.match(/^\/novels\/[^/]+$/)) return '/novels';
  if (pathname.match(/^\/resources\/[^/]+$/)) return '/resources';
  if (pathname.match(/^\/resources\/submit$/)) return '/resources';
  if (pathname.match(/^\/opportunities\/submit$/)) return '/opportunities';
  if (pathname.match(/^\/seed\//)) return '/my';
  return '/';
}

function shouldHideHeader(pathname: string): boolean {
  return HIDE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function isFullNavRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/novels' || pathname === '/rpg';
}

// ============ Logo ============
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="FireSeed 首页">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="headerLogoGrad" x1="0" y1="0" x2="28" y2="28">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-light)" />
          </linearGradient>
        </defs>
        <circle cx="14" cy="14" r="14" fill="url(#headerLogoGrad)" />
        <path d="M8 14C8 14 10 8 14 8C18 8 20 14 20 14C20 14 18 20 14 20C10 20 8 14 8 14Z" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="14" cy="14" r="3" fill="white"/>
      </svg>
      <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        FireSeed
      </span>
    </Link>
  );
}

// ============ Back Arrow Button ============
function BackArrow({ href }: { href: string }) {
  return (
    <Link href={href} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M13 8H3M7 4L3 8l4 4"/>
      </svg>
    </Link>
  );
}

// ============ User Menu (Desktop) ============
function UserMenu({ user, onLogout, loggingOut }: {
  user: User;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative ml-2">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="true"
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
          {(user.nickname || user.username).charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium hide-mobile">
          {user.nickname || user.username}
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
                {user.nickname || user.username}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                @{user.username} · {user.role === 'admin' ? '管理员' : '普通用户'}
              </p>
            </div>
            <div className="py-1">
              <Link href="/my" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-primary)' }} onClick={() => setMenuOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 8a3 3 0 100-6 3 3 0 000 6z"/><path d="M13 14c0-2.8-2.2-5-5-5s-5 2.2-5 5"/>
                </svg>
                个人中心
              </Link>
              <Link href="/my" className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41"/>
                </svg>
                个人设置
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--accent)' }} onClick={() => setMenuOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="12" height="10" rx="2"/><path d="M5 7h6M5 10h4"/>
                  </svg>
                  管理后台
                </Link>
              )}
            </div>
            <div style={{ borderTop: '1px solid var(--border-light)' }}>
              <button onClick={onLogout} disabled={loggingOut}
                className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors"
                style={{ color: '#ef4444' }}>
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

// ============ Main Header Component ============
export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { config } = useContext(HeaderContext);

  // Fetch user on mount
  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn && data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [mobileMenuOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, router]);

  const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

  // ---- Determine visibility ----
  const hidden = config.hideHeader || shouldHideHeader(pathname);
  if (hidden) return null;

  const forceFull = config.forceFullNav || false;
  const fullNav = forceFull || isFullNavRoute(pathname);

  // Resolve title and backHref (context overrides route defaults)
  const title = config.title || getRouteTitle(pathname) || '';
  const backHref = config.backHref || getRouteBackHref(pathname);

  // ==================== FULL NAV HEADER ====================
  if (fullNav) {
    return (
      <>
        <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Logo />

            <nav className="flex items-center gap-1">
              {/* Mobile hamburger */}
              <button
                className="hamburger-btn"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="打开导航菜单"
                aria-expanded={mobileMenuOpen}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 6h16M3 11h16M3 16h16" />
                </svg>
              </button>

              {NAV_LINKS.map(link => (
                <Link key={link.href} href={link.href} className="btn-ghost hide-mobile">
                  {link.label}
                </Link>
              ))}

              {/* Right content slot (for page-specific elements) */}
              {config.rightContent && (
                <div className="flex items-center gap-2">{config.rightContent}</div>
              )}

              {/* User menu / Login buttons */}
              {user ? (
                <UserMenu user={user} onLogout={handleLogout} loggingOut={loggingOut} />
              ) : (
                <>
                  <Link href="/auth/login" className="btn-ghost text-sm py-2">登录</Link>
                  <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">注册</Link>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* Mobile Drawer */}
        <div
          className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
          onClick={closeMobile}
          aria-hidden="true"
        />
        <div
          className={`mobile-menu-drawer ${mobileMenuOpen ? 'open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="导航菜单"
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id="drawerLogoGrad" x1="0" y1="0" x2="28" y2="28">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="var(--accent-light)" />
                  </linearGradient>
                </defs>
                <circle cx="14" cy="14" r="14" fill="url(#drawerLogoGrad)" />
                <path d="M8 14C8 14 10 8 14 8C18 8 20 14 20 14C20 14 18 20 14 20C10 20 8 14 8 14Z" stroke="white" strokeWidth="1.5" fill="none"/>
                <circle cx="14" cy="14" r="3" fill="white"/>
              </svg>
              <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>FireSeed</span>
            </div>
            <button
              onClick={closeMobile}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="关闭导航菜单"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 5l10 10M15 5l-10 10" />
              </svg>
            </button>
          </div>

          {/* User info */}
          {user ? (
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'white' }}
                >
                  {(user.nickname || user.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {user.nickname || user.username}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    @{user.username}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 flex gap-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <Link href="/auth/login" onClick={closeMobile}
                className="flex-1 py-2 text-center text-sm font-medium rounded-lg transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                登录
              </Link>
              <Link href="/auth/register" onClick={closeMobile}
                className="flex-1 py-2 text-center text-sm font-medium rounded-lg text-white transition-colors"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))' }}>
                注册
              </Link>
            </div>
          )}

          {/* Main nav */}
          <div className="py-2 flex-1">
            <div className="drawer-section-title">导航</div>
            {DRAWER_NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href} onClick={closeMobile} className="drawer-link">
                <svg className="link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d={link.icon} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Logged-in user extra menu */}
          {user && (
            <div className="py-2" style={{ borderTop: '1px solid var(--border-light)' }}>
              <div className="drawer-section-title">我的</div>
              <Link href="/my" onClick={closeMobile} className="drawer-link">
                <svg className="link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 8a3 3 0 100-6 3 3 0 000 6z" strokeLinecap="round"/>
                  <path d="M13 14c0-2.8-2.2-5-5-5s-5 2.2-5 5" strokeLinecap="round"/>
                </svg>
                个人中心
              </Link>
              <Link href="/my" onClick={closeMobile} className="drawer-link">
                <svg className="link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="2" strokeLinecap="round"/>
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2" strokeLinecap="round"/>
                </svg>
                个人设置
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" onClick={closeMobile} className="drawer-link" style={{ color: 'var(--accent)' }}>
                  <svg className="link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="12" height="10" rx="2" strokeLinecap="round"/>
                    <path d="M5 7h6M5 10h4" strokeLinecap="round"/>
                  </svg>
                  管理后台
                </Link>
              )}
            </div>
          )}

          {/* Logout */}
          {user && (
            <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-3 w-full py-2.5 text-sm font-medium transition-colors"
                style={{ color: '#ef4444' }}
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6"/>
                </svg>
                {loggingOut ? '退出中...' : '退出登录'}
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // ==================== BACK-ARROW HEADER ====================
  return (
    <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BackArrow href={backHref} />
          {title && (
            <h1 className="text-base font-semibold truncate max-w-[240px]" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {config.rightContent}
        </div>
      </div>
    </header>
  );
}
