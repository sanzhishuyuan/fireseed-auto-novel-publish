import Link from 'next/link';
import { getAllNovelIds, getNovelMeta, getNovelChapters } from '@/lib/novels';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const novelIds = getAllNovelIds();

  const novels = novelIds.map(id => ({
    id,
    ...getNovelMeta(id),
    chapterCount: getNovelChapters(id).filter(c => c.meta.branch === 'main').length
  })).filter(n => n.title);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} id="main-content">
      {/* 顶部导航 */}
      <header
        className="glass sticky top-0 z-50"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
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
            <Link href="/auth/login" className="btn-primary text-sm py-2 px-5">
              登录
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero 区域 */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* 背景装饰 - 简化blur效果以提升移动端性能 */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-glow), transparent)'
          }}
        />
        {/* 仅在桌面端显示装饰元素 */}
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
      {novels.length > 0 && (
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
            {novels.map((novel, i) => (
              <Link
                key={novel.id}
                href={`/novels/${novel.id}`}
                className="card overflow-hidden group animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* 封面 */}
                <div
                  className="aspect-[3/4] relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #1e1e3a 0%, #2d1b69 50%, #4c1d95 100%)' }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center mb-3">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5">
                        <path d="M10 2L3 6v8l7 4 7-4V6L10 2z"/>
                        <path d="M10 2v12M3 6l7 4 7-4"/>
                      </svg>
                    </div>
                    <span className="text-white/60 text-xs font-medium tracking-widest uppercase">
                      {novel.tags?.split(',')[0]?.trim() || '故事'}
                    </span>
                  </div>
                  {/* 状态标签 */}
                  <div className="absolute top-3 right-3">
                    <span className={novel.status === 'completed' ? 'badge badge-success' : 'badge badge-warning'}>
                      {novel.status === 'completed' ? '完结' : '连载'}
                    </span>
                  </div>
                  {/* 悬停渐变 */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(to top, rgba(124,58,237,0.3), transparent)' }}
                  />
                </div>

                {/* 信息 */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {novel.title}
                  </h3>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    {novel.author || 'Spark AI'}
                  </p>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 3h10M1 6h10M1 9h6"/>
                      </svg>
                      {novel.chapterCount} 章
                    </span>
                    <span className="line-clamp-2 flex-1" style={{ color: 'var(--text-muted)' }}>
                      {novel.description || '暂无简介'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 空状态 */}
      {novels.length === 0 && (
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
        {/* 装饰 */}
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
