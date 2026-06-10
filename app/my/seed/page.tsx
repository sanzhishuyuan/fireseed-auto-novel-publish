'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useHeaderConfig } from '@/components/HeaderContext';

interface Transaction {
  id: string;
  user_id: string;
  target_id: string | null;
  type: string;
  ref_id: string | null;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  publish_novel: '发布小说',
  publish_chapter: '更新章节',
  like: '点赞',
  favorite: '收藏',
  register_bonus: '注册红包',
  seed_in: '充值',
  admin_deduct: '管理员扣除',
};

const TYPE_COLORS: Record<string, string> = {
  publish_novel: '#8b5cf6',
  publish_chapter: '#3b82f6',
  like: '#f59e0b',
  favorite: '#ef4444',
  register_bonus: '#10b981',
  seed_in: '#10b981',
  admin_deduct: '#ef4444',
};

export default function MySeedPage() {
  const [wallet, setWallet] = useState<{ balance: number; total_earned: number; total_spent: number } | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // 隐藏全局 Header（此页面使用自定义内联 Header）
  const { setConfig } = useHeaderConfig();
  useEffect(() => { setConfig({ hideHeader: true }); return () => setConfig({}); }, [setConfig]);

  useEffect(() => {
    Promise.all([
      fetch('/api/seed/balance', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/seed/transactions', { credentials: 'include' }).then(r => r.json()),
    ])
      .then(([balData, txData]) => {
        if (balData.success) setWallet(balData);
        if (txData.success) setTxns(txData.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center"><div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div><p className="text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>🌱 我的 SEED</span>
          </Link>
          <Link href="/" className="btn-ghost text-sm">← 返回首页</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* 余额卡片 */}
        {wallet && (
          <div className="card p-6 mb-6 text-center">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>当前余额</p>
            <p className="text-4xl font-bold mb-4" style={{ color: '#10b981' }}>🌱 {wallet.balance.toLocaleString()}</p>
            <div className="flex justify-center gap-8 text-sm">
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>🌾 {wallet.total_earned.toLocaleString()}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>累计收入</p>
              </div>
              <div>
                <p className="font-semibold" style={{ color: '#ef4444' }}>💸 {wallet.total_spent.toLocaleString()}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>累计消费</p>
              </div>
            </div>
          </div>
        )}

        {/* 交易流水 */}
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>交易记录</h2>
        {txns.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>📭</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无交易记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txns.map(tx => (
              <div key={tx.id} className="card p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: `${TYPE_COLORS[tx.type] || '#64748b'}20`, color: TYPE_COLORS[tx.type] || '#64748b' }}
                    >
                      {tx.amount > 0 ? '+' : '-'}
                    </span>
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {TYPE_LABELS[tx.type] || tx.type}
                    </span>
                    {tx.description && (
                      <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{tx.description}</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(tx.created_at).toLocaleString('zh-CN')}
                    {tx.ref_id && <span className="ml-2">#{tx.ref_id.slice(0, 8)}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-500' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 🌱
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>余额: {tx.balance_after}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
