'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 全局钱包余额指示器 — 固定在右上角工具栏旁
 * 登录用户显示 🌱 余额，点击弹出钱包菜单
 */
export default function WalletBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const fetchUserAndBalance = useCallback(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn && data.user) {
          setUser(data.user);
          fetch('/api/seed/balance', { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setBalance(d.data != null ? d.data.balance : d.balance); })
            .catch(() => {});
        } else {
          setUser(null);
          setBalance(null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUserAndBalance();
  }, [fetchUserAndBalance]);

  useEffect(() => {
    const handleAuthChanged = () => fetchUserAndBalance();
    window.addEventListener('auth-changed', handleAuthChanged);
    return () => window.removeEventListener('auth-changed', handleAuthChanged);
  }, [fetchUserAndBalance]);

  if (loading || !user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: balance !== null && balance > 0 ? '#10b981' : 'var(--text-muted)',
        }}
        title="我的 SEED 钱包"
      >
        <span>🌱</span>
        <span className="font-semibold">{balance?.toLocaleString() || '0'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-20 shadow-lg"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>余额</p>
              <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                🌱 {balance?.toLocaleString() || 0}
              </p>
            </div>
            <div className="py-1">
              <a
                href="/my/seed"
                className="flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-opacity-50"
                style={{ color: 'var(--accent)' }}
                onClick={() => setOpen(false)}
              >
                📊 交易记录
              </a>
              <button
                onClick={() => { setOpen(false); router.push('/skills'); }}
                className="flex items-center gap-2 px-4 py-2.5 text-xs w-full text-left"
                style={{ color: 'var(--text-secondary)' }}
              >
                🏆 富豪榜
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
