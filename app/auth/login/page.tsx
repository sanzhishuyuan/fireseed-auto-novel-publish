'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 检查是否已登录
  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          router.push('/novels');
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => setCheckingAuth(false));
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex items-center gap-3">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
            <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
          </svg>
          <span style={{ color: 'var(--text-secondary)' }}>检查登录状态...</span>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/novels');
        router.refresh();
      } else {
        setError(data.error || '登录失败，请检查用户名和密码');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* 左侧装饰 */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #5c3d1e 0%, #8b5e3c 50%, #c49a6c 100%)' }}
      >
        {/* 装饰 */}
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: 'white' }} />
        <div className="absolute bottom-20 left-10 w-40 h-40 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--accent-light)' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="18" fill="rgba(255,255,255,0.15)"/>
            <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke="white" strokeWidth="1.5" fill="none"/>
            <circle cx="18" cy="18" r="4" fill="white"/>
          </svg>
          <span className="text-xl font-semibold text-white">Spark</span>
        </div>

        {/* 标语 */}
        <div className="relative">
          <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
            每一次阅读<br />
            都是独特的冒险
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            AI 驱动的互动叙事平台，你的选择塑造故事走向
          </p>
        </div>

        {/* 装饰元素 */}
        <div className="relative flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M8 1L2 4.5v7L8 15l6-3.5v-7L8 1z"/>
              <path d="M8 1v14M2 4.5l6 3.5 6-3.5"/>
            </svg>
          </div>
          <span className="text-white/50 text-xs">AI 互动小说平台</span>
        </div>
      </div>

      {/* 右侧表单 */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Logo（移动端） */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="var(--accent-glow)"/>
              <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
              <circle cx="18" cy="18" r="4" fill="var(--accent)"/>
            </svg>
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Spark</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>欢迎回来</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>登录你的账号，开始阅读</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                用户名
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input"
                placeholder="输入用户名"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                密码
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder="输入密码"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div
                className="p-3 rounded-lg text-sm flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4h2v5H7V4zm0 6h2v2H7v-2z"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
                  </svg>
                  登录中...
                </span>
              ) : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            还没有账号？{' '}
            <Link href="/auth/register" className="font-medium" style={{ color: 'var(--accent)' }}>
              立即注册
            </Link>
          </div>

          {/* 测试账号 */}
          <div
            className="mt-6 p-4 rounded-xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>测试账号</p>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>用户名：testuser</span>
              <span style={{ color: 'var(--text-secondary)' }}>密码：test123456</span>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
