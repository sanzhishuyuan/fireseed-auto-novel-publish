'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SafeCover from '@/components/SafeCover';
import type { User, Novel, StatsData } from '@/types';

// 品类浏览配置
const GENRE_CATEGORIES = [
  { name: '科幻', emoji: '🚀', color: '#3b82f6', desc: '赛博朋克·星际冒险' },
  { name: '悬疑', emoji: '🔮', color: '#8b5cf6', desc: '规则怪谈·推理探案' },
  { name: '玄幻', emoji: '⚡', color: '#f59e0b', desc: '修仙热血·异世界' },
  { name: '仙侠', emoji: '🏯', color: '#10b981', desc: '古典神话·封神传说' },
  { name: '都市', emoji: '🏙', color: '#ec4899', desc: '重生逆袭·职场异能' },
  { name: '青春', emoji: '🌸', color: '#f472b6', desc: '校园成长·追梦故事' },
];

export default function HomePage() {
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ totalChapters: 0, totalNovels: 0, totalWords: 0, totalAuthors: 0 });
  const router = useRouter();

  // 获取小说列表和真实统计数据
  useEffect(() => {
    Promise.all([
      fetch('/api/novels').then(r => r.json()).catch(() => ({ novels: [] })),
      fetch('/api/stats').then(r => r.json()).catch(() => ({ success: false }))
    ])
      .then(([novelsData, statsData]) => {
        const list = Array.isArray(novelsData) ? novelsData : (novelsData?.novels || []);
        setNovels(list);

        if (statsData?.success && statsData?.data) {
          setStats(statsData.data);
        } else {
          const validNovels = list.filter((n: any) => (n.chapterCount || 0) > 0);
          const totalChapters = validNovels.reduce((sum: number, n: any) => sum + (n.chapterCount || 0), 0);
          const uniqueAuthors = new Set(validNovels.map((n: any) => n.author).filter(Boolean));
          setStats({
            totalChapters,
            totalNovels: validNovels.length,
            totalWords: totalChapters * 2000,
            totalAuthors: uniqueAuthors.size
          });
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

  // 精选作品（有章节、按章节数排序、最多 8 部）
  const featuredNovels = novels
    .filter(n => (n.chapterCount || 0) > 0)
    .sort((a, b) => (b.chapterCount || 0) - (a.chapterCount || 0))
    .slice(0, 8);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} id="main-content">
      {/* 🔔 平台动态公告栏 */}
      <div
        className="overflow-hidden whitespace-nowrap py-2 text-xs sm:text-sm"
        role="marquee"
        aria-label="平台公告"
        style={{
          background: 'linear-gradient(90deg, #1a1a2e, #0f3460)',
          color: '#e2e8f0',
        }}
      >
        <div className="inline-block animate-marquee">
          <span className="mx-4">🔥</span>
          <span className="mx-4 font-medium">火种·百人AI作家共创计划正在招募中，用AI写小说，探索互动叙事的可能性</span>
          <span className="mx-4">→</span>
          <Link href="/plan" className="mx-4 underline underline-offset-2 hover:text-white transition-colors" style={{ color: '#60a5fa' }}>
            了解方案
          </Link>
          <span className="mx-4 text-white/50">|</span>
          <span className="mx-4">📚</span>
          <span className="mx-4 font-medium">平台已收录 {stats.totalNovels || '—'} 部 AI 互动小说，累计 {stats.totalChapters || '—'} 章</span>
          <span className="mx-4 text-white/50">|</span>
          <span className="mx-4">🌱</span>
          <span className="mx-4 font-medium">SEED 积分系统已上线，点赞、创作、互动均可获得积分奖励</span>
          <span className="mx-4 text-white/50">||</span>
          {/* 重复一次实现无缝滚动，aria-hidden 避免屏幕阅读器重复朗读 */}
          <span aria-hidden="true">
          <span className="mx-4">🔥</span>
          <span className="mx-4 font-medium">火种·百人AI作家共创计划正在招募中，用AI写小说，探索互动叙事的可能性</span>
          <span className="mx-4">→</span>
          <Link href="/plan" className="mx-4 underline underline-offset-2 hover:text-white transition-colors" style={{ color: '#60a5fa' }}>
            了解方案
          </Link>
          <span className="mx-4 text-white/50">|</span>
          <span className="mx-4">📚</span>
          <span className="mx-4 font-medium">平台已收录 {stats.totalNovels || '—'} 部 AI 互动小说，累计 {stats.totalChapters || '—'} 章</span>
          <span className="mx-4 text-white/50">|</span>
          <span className="mx-4">🌱</span>
          <span className="mx-4 font-medium">SEED 积分系统已上线，点赞、创作、互动均可获得积分奖励</span>
          </span>
        </div>
      </div>

      {/* ========== Hero 区域（含数据亮点） ========== */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-glow), transparent)' }} />
        <div className="hidden sm:block absolute top-1/4 left-1/4 w-40 h-40 rounded-full opacity-10" style={{ background: 'var(--accent)', filter: 'blur(60px)' }} />
        <div className="hidden sm:block absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full opacity-10" style={{ background: 'var(--accent-light)', filter: 'blur(50px)' }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          {/* 标签 */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="6" r="6"/></svg>
            AI 驱动 · 互动叙事
          </div>

          {/* 主标题 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5 leading-tight">
            每一个选择
            <br />
            <span className="text-gradient">改写故事结局</span>
          </h1>

          <p className="text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            在这里，你的选择将影响故事走向。AI 生成的分支剧情，每一次阅读都是独一无二的冒险。
          </p>

          {/* CTA 按钮 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link href="/novels" className="btn-primary text-sm px-8 py-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 3h6a4 4 0 0 1 4 4v6a3 3 0 0 0-3-3H2z"/><path d="M14 3h-6a4 4 0 0 0-4 4v6a3 3 0 0 1 3-3h7z"/>
              </svg>
              开始阅读
            </Link>
            <Link href="/auth/register" className="btn-secondary text-sm px-8 py-3">
              免费注册
            </Link>
          </div>

          {/* 数据亮点（内嵌 Hero 底部） */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 text-center">
            {[
              { value: stats.totalNovels || '—', label: '部作品' },
              { value: stats.totalChapters || '—', label: '章内容' },
              { value: stats.totalWords >= 10000 ? `${(stats.totalWords / 10000).toFixed(1)}万` : (stats.totalWords || '—'), label: '字累计' },
              { value: stats.totalAuthors || '—', label: '位作者' },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                  {item.value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 品类浏览入口 ========== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>探索品类</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>选择你感兴趣的类型，开始互动阅读之旅</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
          {GENRE_CATEGORIES.map((genre, i) => (
            <Link
              key={genre.name}
              href={`/novels?tag=${encodeURIComponent(genre.name)}`}
              className="card p-4 text-center group animate-fade-in hover:scale-105 transition-transform"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="text-3xl sm:text-4xl mb-2">{genre.emoji}</div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{genre.name}</h3>
              <p className="text-xs mt-1 hidden sm:block" style={{ color: 'var(--text-muted)' }}>{genre.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ========== 精选推荐 ========== */}
      {!loading && featuredNovels.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>作品推荐</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>精选 AI 创作 · 持续更新</p>
            </div>
            <Link href="/novels" className="btn-ghost text-sm hide-mobile">
              查看全部
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {featuredNovels.map((novel, i) => {
              const tagEmojis: Record<string, string> = {
                '玄幻': '⚡', '都市': '🏙', '仙侠': '🏯', '言情': '💕',
                '科幻': '🚀', '悬疑': '🔮', '历史': '📜', '恐怖': '👻',
                '军事': '⚔️', '奇幻': '🔮', '武侠': '⚡'
              };
              const primaryTag = novel.tags?.split(',')[0]?.trim() || '故事';
              const emoji = tagEmojis[primaryTag] || '✨';
              const totalChapters = 30;
              const progress = Math.min(((novel.chapterCount || 0) / totalChapters) * 100, 100);

              return (
                <Link
                  key={novel.id}
                  href={`/novels/${novel.id}`}
                  className="card overflow-hidden group animate-slide-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <SafeCover src={novel.cover_url} alt={novel.title} tag={novel.tags} />

                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm"
                        style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}>
                        {emoji} {primaryTag}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className={novel.status === 'completed' ? 'badge badge-success' : 'badge badge-warning'}>
                        {novel.status === 'completed' ? '完结' : '连载'}
                      </span>
                    </div>

                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
                      style={{ background: 'linear-gradient(to top, rgba(245,158,11,0.85), rgba(245,158,11,0.3))' }}>
                      <div className="absolute bottom-4 left-3 right-3">
                        <span 
                          role="button"
                          tabIndex={-1}
                          className="block w-full py-2 rounded-lg text-sm font-medium text-center backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                          style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--accent)' }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/novels/${novel.id}`); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/novels/${novel.id}`); } }}>
                          继续阅读
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {novel.title}
                    </h3>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      {novel.author || 'FireSeed AI'} · {novel.chapterCount || 0} 章
                    </p>

                    {novel.status !== 'completed' && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span>AI 生成进度</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-light))' }} />
                        </div>
                      </div>
                    )}

                    {novel.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {novel.tags.split(',').filter(Boolean).slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
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

      {/* 加载中骨架 */}
      {loading && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
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

      {/* ========== 百人AI作家共创计划 ========== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-6">
              🔥 正在招募
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              火种·百人AI作家共创计划
            </h2>
            <p className="text-white/70 mb-6 max-w-2xl mx-auto leading-relaxed">
              100位AI作家，一起用AI写小说，探索互动叙事的可能性
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/plan"
                className="inline-flex items-center gap-2 px-8 py-3 bg-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105"
                style={{ color: '#0f3460' }}>
                了解完整方案
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                立即加入
              </Link>
            </div>
          </div>
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-white/5" />
        </div>
      </section>

      {/* ========== 精简页脚 ========== */}
      <footer className="pt-10 pb-8 text-center" style={{ borderTop: '1px solid var(--border-light)' }}>
        {/* 品牌与宣言 */}
        <div className="max-w-xl mx-auto px-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="grad2" x1="0" y1="0" x2="28" y2="28">
                  <stop offset="0%" stopColor="var(--accent)"/>
                  <stop offset="100%" stopColor="var(--accent-light)"/>
                </linearGradient>
              </defs>
              <circle cx="14" cy="14" r="14" fill="url(#grad2)"/>
              <path d="M8 14C8 14 10 8 14 8C18 8 20 14 20 14C20 14 18 20 14 20C10 20 8 14 8 14Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="14" cy="14" r="3" fill="white"/>
            </svg>
            <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>FireSeed</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            一粒火种微弱，众火方成燎原。为 AI 网文创作发布而生，共建专属创作者的免费平台。
          </p>
        </div>

        {/* 页脚链接 */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-4 px-4">
          <Link href="/novels" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>全部作品</Link>
          <Link href="/chat" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>社区</Link>
          <Link href="/vip" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>会员中心</Link>
          <Link href="/plan" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>共创计划</Link>
          <Link href="/resources" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>可信资源</Link>
          <Link href="/feedback" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>反馈</Link>
          <Link href="/download" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>下载</Link>
          <a href="/api/rss" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }} target="_blank">RSS</a>
        </div>

        {/* 社群入口 */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <a href="https://pd.qq.com/s/68wwv3lv8?b=9" target="_blank" rel="noopener noreferrer"
            className="text-xs px-4 py-1.5 rounded-full transition-colors"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            QQ频道：火种宇宙 →
          </a>
          <a href="mailto:suttangle@yeah.net"
            className="text-xs px-4 py-1.5 rounded-full transition-colors"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            联系我们
          </a>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2026 FireSeed.online · AI 驱动互动叙事平台
        </p>
      </footer>
    </div>
  );
}
