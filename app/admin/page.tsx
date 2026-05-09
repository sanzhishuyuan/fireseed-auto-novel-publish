'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim() || undefined,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/admin/dashboard');
      } else {
        setError(data.error || '用户名或密码错误');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
              <circle cx="18" cy="18" r="4" fill="var(--accent)"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>创作后台</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>管理员账号登录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input text-center"
              placeholder="用户名（可留空用管理密码）"
              autoComplete="username"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input text-center"
              placeholder="密码"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              className="p-3 rounded-lg text-sm text-center"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3"
          >
            {loading ? '验证中...' : '进入后台'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            用户名留空则使用系统管理密码登录
          </p>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-xs" style={{ color: 'var(--text-muted)' }}>
            ← 返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
