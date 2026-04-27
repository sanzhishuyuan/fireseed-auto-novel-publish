import Link from 'next/link';
import { getAllNovelIds, getNovelChapters } from '@/lib/novels';

export const dynamic = 'force-dynamic';

export default async function NovelsPage() {
  const novelList = getAllNovelIds();

  const novels = novelList.map(novel => ({
    ...novel,
    chapterCount: getNovelChapters(novel.id).filter(c => c.meta.branch === 'main').length
  })).filter(n => n.title);

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
                {novels.length} 部作品
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/" className="btn-ghost text-sm hide-mobile">首页</Link>
            <Link href="/auth/login" className="btn-primary text-sm py-2 px-4">登录</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {novels.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {novels.map((novel, i) => (
              <Link
                key={novel.id}
                href={`/novels/${novel.id}`}
                className="card overflow-hidden group animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* 封面 */}
                <div
                  className="aspect-[3/4] relative overflow-hidden"
                  style={{ background: 'linear-gradient(160deg, #1a1a3e 0%, #2d1b69 60%, #4c1d95 100%)' }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-full border-2 border-white/20 flex items-center justify-center mb-3 opacity-60">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                        <path d="M12 3L3 7.5v10L12 21l9-3.5V7.5L12 3z"/>
                        <path d="M12 3v14M3 7.5l9 4 9-4"/>
                      </svg>
                    </div>
                    <span className="text-white/40 text-xs font-medium tracking-widest uppercase">
                      {novel.tags?.split(',')[0]?.trim() || 'STORY'}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={novel.status === 'completed' ? 'badge badge-success' : 'badge badge-warning'}>
                      {novel.status === 'completed' ? '完结' : '连载'}
                    </span>
                  </div>

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ background: 'linear-gradient(to top, rgba(124,58,237,0.4), transparent 60%)' }}>
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="w-full py-2 rounded-lg text-center text-sm font-medium" style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--accent)' }}>
                        开始阅读
                      </div>
                    </div>
                  </div>
                </div>

                {/* 信息 */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {novel.title}
                  </h3>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                    {novel.author || 'Spark AI'} · {novel.chapterCount} 章
                  </p>
                  <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {novel.description || '暂无简介'}
                  </p>

                  {novel.tags && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {novel.tags.split(',').filter(Boolean).slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
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
