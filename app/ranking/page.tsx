'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ===== 类型定义 =====

interface RankingEntry {
  rank: number;
  targetId: string;
  title: string;
  subtitle: string;
  score: number;
  scoreLabel: string;
  extra?: { tags?: string };
}

interface RankingResponse {
  category: string;
  type: string;
  period: string;
  label: string;
  periodLabel: string;
  entries: RankingEntry[];
  updatedAt: string;
}

// ===== 配置 =====

const CATEGORIES = [
  { key: 'novels', label: '小说排行' },
  { key: 'authors', label: '作者排行' },
  { key: 'seed', label: '富豪榜' },
];

const NOVEL_TYPES = [
  { key: 'popular', label: '综合热度' },
  { key: 'favorites', label: '最多收藏' },
  { key: 'reads', label: '最多阅读' },
  { key: 'likes', label: '最多点赞' },
  { key: 'chapters', label: '章节最多' },
  { key: 'words', label: '字数最多' },
];

const AUTHOR_TYPES = [
  { key: 'novels', label: '作品最多' },
  { key: 'words', label: '总字数最多' },
  { key: 'favorites', label: '总收藏最多' },
  { key: 'reads', label: '最多读者' },
  { key: 'earned', label: '收入最高' },
];

const PERIODS = [
  { key: 'all', label: '全部' },
  { key: 'weekly', label: '本周' },
  { key: 'monthly', label: '本月' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

// ===== 页面组件 =====

export default function RankingPage() {
  const [category, setCategory] = useState('novels');
  const [type, setType] = useState('popular');
  const [period, setPeriod] = useState('all');
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category, type, period, limit: '50' });
      const res = await fetch(`/api/ranking?${params}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setData(d.data);
      }
    } catch {}
    setLoading(false);
  }, [category, type, period]);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  const currentTypes = category === 'novels' ? NOVEL_TYPES
    : category === 'authors' ? AUTHOR_TYPES
    : [];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* 页面头部 */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center relative z-10">
          <h1 className="text-3xl font-bold mb-3" style={{ color: '#fbbf24' }}>🏆 排行榜</h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            发现最受欢迎的小说和最勤奋的作者
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* 分类切换 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setCategory(cat.key); setType(cat.key === 'novels' ? 'popular' : cat.key === 'authors' ? 'novels' : 'popular'); }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: category === cat.key ? 'var(--accent)' : 'var(--bg-card)',
                color: category === cat.key ? '#fff' : 'var(--text-primary)',
                border: category === cat.key ? 'none' : '1px solid var(--border-light)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 子类型 + 周期切换 */}
        {currentTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {currentTypes.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: type === t.key ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                  color: type === t.key ? 'var(--accent)' : 'var(--text-secondary)',
                  border: type === t.key ? '1px solid var(--accent)' : '1px solid transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* 周期切换（SEED 富豪榜不显示周期） */}
        {category !== 'seed' && (
          <div className="flex gap-2 mb-6">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className="px-3 py-1 rounded-lg text-xs transition-all"
                style={{
                  background: period === p.key ? 'var(--bg-card)' : 'transparent',
                  color: period === p.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: period === p.key ? '1px solid var(--border-light)' : '1px solid transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* 排行榜内容 */}
        {loading ? (
          <div className="card p-16 text-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</p>
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="card p-16 text-center">
            <p className="text-3xl mb-3">🏆</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无排行数据</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.entries.map((entry) => (
              <div
                key={`${data.category}-${entry.targetId}`}
                className="card p-4 flex items-center gap-4 hover:opacity-90 transition-opacity"
              >
                {/* 排名 */}
                <div className="w-10 text-center shrink-0">
                  {entry.rank <= 3 ? (
                    <span className="text-2xl">{MEDALS[entry.rank - 1]}</span>
                  ) : (
                    <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>#{entry.rank}</span>
                  )}
                </div>

                {/* 头像 */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: entry.rank === 1
                      ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                      : entry.rank === 2
                      ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                      : entry.rank === 3
                      ? 'linear-gradient(135deg, #d97706, #92400e)'
                      : 'var(--bg-secondary)',
                    color: '#fff',
                  }}
                >
                  {entry.title.charAt(0).toUpperCase()}
                </div>

                {/* 标题信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {category === 'novels' ? (
                      <Link
                        href={`/novels/${entry.targetId}`}
                        className="text-sm font-medium truncate hover:underline"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {entry.title}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {entry.title}
                      </span>
                    )}
                    {entry.extra?.tags && (
                      <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                        {entry.extra.tags.split(',')[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{entry.subtitle}</p>
                </div>

                {/* 分数 */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: category === 'seed' ? '#10b981' : 'var(--accent)' }}>
                    {entry.scoreLabel}
                  </p>
                  {category === 'novels' && entry.score > 0 && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>得分</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部导航 */}
        <div className="mt-8 text-center">
          <Link
            href="/seed/leaderboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
          >
            🌱 查看 SEED 详细富豪榜
          </Link>
        </div>
      </div>
    </div>
  );
}
