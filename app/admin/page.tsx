'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg: '#0b0b0f',
  card: '#131318',
  elevated: '#1a1a22',
  text: '#f0ece4',
  dim: '#9a9a8e',
  muted: '#5a5a52',
  gold: '#c9a55c',
  goldLight: '#e4cc8a',
  goldGlow: 'rgba(201,165,92,0.12)',
  goldBorder: 'rgba(201,165,92,0.2)',
  border: 'rgba(255,255,255,0.06)',
  red: '#ef4444',
} as const;

const fontDisplay = "'Fraunces', Georgia, serif";
const fontMono = "'DM Mono', 'Menlo', monospace";

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
      background: C.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '40px 32px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: C.goldGlow,
            border: `1px solid ${C.goldBorder}`,
          }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z"
                stroke={C.gold} strokeWidth="1.5" fill="none"/>
              <circle cx="18" cy="18" r="4" fill={C.gold}/>
            </svg>
          </div>
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: fontDisplay,
            color: C.text,
            marginBottom: 4,
          }}>创作后台</h1>
          <p style={{
            fontSize: 13,
            fontFamily: fontMono,
            color: C.muted,
          }}>ADMIN CONSOLE</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名（可留空用管理密码）"
            autoComplete="username"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 14,
              color: C.text,
              background: C.elevated,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            required
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 14,
              color: C.text,
              background: C.elevated,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              textAlign: 'center',
              background: 'rgba(239,68,68,0.08)',
              color: C.red,
              border: '1px solid rgba(239,68,68,0.15)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 0',
              fontSize: 14,
              fontWeight: 600,
              color: '#0b0b0f',
              background: C.gold,
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: fontDisplay,
              letterSpacing: '0.02em',
            }}
          >
            {loading ? '验证中...' : '进入后台'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: C.muted }}>
            用户名留空则使用系统管理密码登录
          </p>
        </div>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <a href="/" style={{
            fontSize: 12,
            color: C.dim,
            textDecoration: 'none',
          }}>
            ← 返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
