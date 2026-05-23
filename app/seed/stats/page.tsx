'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EconomyData {
  today_issued: number;
  today_burned: number;
  today_remaining_budget: number;
  circulating_supply: number;
  today_active_users: number;
  today_transactions: number;
  platform_income: number;
  daily_limit: number;
  user?: {
    balance: number;
    total_earned: number;
    total_spent: number;
    transaction_count: number;
    total_burned: number;
  } | null;
}

export default function EconomyStatsPage() {
  const [data, setData] = useState<EconomyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/seed/stats', { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setData(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>加载经济数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </Link>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>SEED 经济概况</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {data && (
          <>
            {/* 今日产出进度 */}
            <div className="card p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>今日产出</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {data.today_issued.toLocaleString()} / {data.daily_limit.toLocaleString()} 🌱
                </p>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (data.today_issued / data.daily_limit) * 100)}%`,
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                  }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                剩余预算: {data.today_remaining_budget.toLocaleString()} 🌱
              </p>
            </div>

            {/* 统计网格 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <StatCard label="今日销毁" value={`🔥 ${data.today_burned.toLocaleString()}`} color="#ef4444" />
              <StatCard label="流通总量" value={`🌐 ${data.circulating_supply.toLocaleString()}`} color="#8b5cf6" />
              <StatCard label="平台收入" value={`🏦 ${data.platform_income.toLocaleString()}`} color="#f59e0b" />
              <StatCard label="今日活跃" value={`👤 ${data.today_active_users}`} color="#3b82f6" />
              <StatCard label="今日交易" value={`📊 ${data.today_transactions}`} color="#06b6d4" />
              <StatCard label="销毁比例" value="🔒 50%" color="#6b7280" />
            </div>

            {/* 用户个性化统计 */}
            {data.user && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>我的 SEED 统计</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>余额</p>
                    <p className="font-semibold" style={{ color: '#10b981' }}>🌱 {data.user.balance.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>累计收入</p>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>+{data.user.total_earned.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>累计消费</p>
                    <p className="font-semibold" style={{ color: '#ef4444' }}>-{data.user.total_spent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>交易笔数</p>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.user.transaction_count}</p>
                  </div>
                </div>
                {data.user.total_burned > 0 && (
                  <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                    累计销毁: 🔥 {data.user.total_burned} SEED
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
              每日产出上限 {data.daily_limit.toLocaleString()} 🌱 · 平台收入 50% 自动销毁
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
