import Link from 'next/link';
import { cookies } from 'next/headers';
import { ADMIN_PASSWORD } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { getAllNovelIds, getNovelChapters } from '@/lib/novels';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_auth')?.value === ADMIN_PASSWORD;

  if (!isAdmin) {
    redirect('/admin');
  }

  const novelList = getAllNovelIds();
  const novels = novelList.map(novel => ({
    ...novel,
    chapterCount: getNovelChapters(novel.id).length
  }));

  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  const novelCount = novelList.length;
  const chapterCount = novels.reduce((acc, n) => acc + n.chapterCount, 0);
  const activeTokenCount = (db.prepare('SELECT COUNT(*) as count FROM ai_tokens WHERE is_active = 1').get() as { count: number }).count;

  const stats = [
    { label: '注册用户', value: userCount, icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="6" r="3"/><circle cx="14" cy="8" r="2.5"/>
        <path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
        <path d="M14 14c1.7 1 3 2.5 3 4"/>
      </svg>
    )},
    { label: '小说总数', value: novelCount, icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 5h14M3 10h14M3 15h8"/>
      </svg>
    )},
    { label: '章节总数', value: chapterCount, icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 3h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2z"/>
        <path d="M7 7h6M7 10h6M7 13h4"/>
      </svg>
    )},
    { label: '活跃Token', value: activeTokenCount, icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="8" width="14" height="10" rx="2"/>
        <path d="M7 8V6a3 3 0 016 0v2"/>
      </svg>
    )},
  ];

  const menuItems = [
    {
      title: '小说管理',
      desc: '新建 / 编辑小说信息',
      href: '/admin/novels',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3L3 7v12l9 4 9-4V7L12 3z"/>
          <path d="M12 3v18M3 7l9 4 9-4"/>
        </svg>
      ),
      color: 'var(--accent)'
    },
    {
      title: '章节管理',
      desc: '发布 / 编辑章节内容',
      href: '/admin/chapters',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
      ),
      color: '#10b981'
    },
    {
      title: 'AI授权管理',
      desc: '管理 AI 操作 Token',
      href: '/admin/tokens',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      ),
      color: '#f59e0b'
    },
    {
      title: '系统设置',
      desc: '全局配置与用户管理',
      href: '/admin/users',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      ),
      color: '#8b5cf6'
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
                <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
                <circle cx="18" cy="18" r="4" fill="var(--accent)"/>
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>创作后台</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Spark AI 小说管理</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="btn-ghost text-sm hide-mobile">查看前台</Link>
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="btn-ghost text-sm">退出</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                  {stat.icon}
                </div>
              </div>
              <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{stat.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 功能菜单 */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {menuItems.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="card p-5 group"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: `${item.color}18`, color: item.color }}>
                {item.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
            </Link>
          ))}
        </div>

        {/* 小说列表 */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>小说列表</h2>
            <Link href="/admin/novels" className="btn-primary text-xs py-1.5 px-3">
              + 新建小说
            </Link>
          </div>

          {novels.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {novels.map((novel) => (
                <div key={novel.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{novel.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {novel.author || 'AI创作'} · {novel.chapterCount} 章
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={novel.status === 'completed' ? 'badge badge-success' : 'badge badge-warning'}>
                      {novel.status === 'completed' ? '完结' : '连载'}
                    </span>
                    <Link href={`/admin/chapters?novel=${novel.id}`} className="text-xs" style={{ color: 'var(--accent)' }}>
                      章节 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无小说</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
