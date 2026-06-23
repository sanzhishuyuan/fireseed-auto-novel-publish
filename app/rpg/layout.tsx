'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { C } from '@/components/rpg/theme';

const NAV_ITEMS = [
  { href: '/rpg', label: '酒馆大厅', icon: '🏰', exact: true },
  { href: '/rpg/characters', label: '角色工坊', icon: '⚔️' },
  { href: '/rpg/lorebooks', label: '世界书', icon: '📜' },
  { href: '/rpg/campaigns', label: '我的副本', icon: '🗺️' },
  { href: '/rpg/market', label: '异界市场', icon: '🏪' },
  { href: '/rpg/creator', label: '创作者中心', icon: '✨' },
];

export default function RpgLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 战役详情页面使用全屏布局，不显示顶部导航
  const isCampaignDetail = /^\/rpg\/campaigns\/[^/]+$/.test(pathname);
  if (isCampaignDetail) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* 顶部导航栏 */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--codex-bg-card)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', height: 52, gap: 4,
          overflowX: 'auto',
        }}>
          <Link href="/rpg" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginRight: 16, textDecoration: 'none', flexShrink: 0,
          }}>
            <span style={{ fontSize: 20 }}>🍺</span>
            <span style={{
              fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700,
              color: C.gold, letterSpacing: 1,
            }}>雾隐酒馆</span>
          </Link>

          <div style={{
            width: 1, height: 24, background: C.border, margin: '0 8px', flexShrink: 0,
          }} />

          {NAV_ITEMS.slice(1).map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 6, textDecoration: 'none',
                fontSize: 13, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap',
                color: isActive ? C.gold : C.textSec,
                background: isActive ? 'var(--codex-gold-glow)' : 'transparent',
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 页面内容 */}
      <main>{children}</main>
    </div>
  );
}
