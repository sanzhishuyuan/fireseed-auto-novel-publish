'use client';

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  balance: number;
  total_earned: number;
}

export default function SeedLeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/seed/leaderboard')
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>🏆 SEED 富豪榜</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>创作者靠作品质量和互动积累 SEED，排名越前越有影响力</p>
        </div>

        {loading ? (
          <div className="card p-12 text-center">
            <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>🏆</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无数据</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((entry, idx) => (
              <div key={entry.user_id} className="card p-4 flex items-center gap-4">
                <div className="w-10 text-center shrink-0">
                  <span className="text-xl">{idx < 3 ? medals[idx] : `#${idx + 1}`}</span>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #f97316)' : idx === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' : idx === 2 ? 'linear-gradient(135deg, #d97706, #92400e)' : 'var(--bg-secondary)', color: '#fff' }}>
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{entry.username}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>累计收入: 🌾 {entry.total_earned.toLocaleString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold" style={{ color: '#10b981' }}>🌱 {entry.balance.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
