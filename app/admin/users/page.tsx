'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHeaderConfig } from '@/components/HeaderContext';

const ROLE_LABELS: Record<string, string> = {
  reader: '注册用户',
  viewer: '数据观察员',
  editor: '内容管理员',
  admin: '高级管理员',
  super_admin: '超级管理员',
};

const ROLE_COLORS: Record<string, string> = {
  reader: 'text-gray-400 bg-gray-400/10',
  viewer: 'text-yellow-400 bg-yellow-400/10',
  editor: 'text-green-400 bg-green-400/10',
  admin: 'text-blue-400 bg-blue-400/10',
  super_admin: 'text-purple-400 bg-purple-400/10',
};

const ASSIGNABLE_ROLES = [
  { value: 'viewer', label: '数据观察员' },
  { value: 'editor', label: '内容管理员' },
  { value: 'admin', label: '高级管理员' },
  { value: 'super_admin', label: '超级管理员' },
];

interface User {
  id: string;
  username: string;
  nickname: string;
  role: string;
  roleLabel: string;
  novelsCount: number;
  registeredAt: string;
}

interface PageData {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { setConfig } = useHeaderConfig();
  const [adminInfo, setAdminInfo] = useState<{ username: string; nickname?: string; role: string } | null>(null);
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [changingId, setChangingId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => { setConfig({ hideHeader: true }); return () => setConfig({}); }, [setConfig]);

  // 验证管理员身份
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (!res.ok) { router.push('/admin'); return; }
        const d = await res.json();
        if (!d.loggedIn || !d.admin) { router.push('/admin'); return; }
        if (d.admin.role !== 'super_admin') { router.push('/admin/dashboard'); return; }
        setAdminInfo(d.admin);
        setChecking(false);
      } catch {
        router.push('/admin');
      }
    })();
  }, [router]);

  const fetchUsers = useCallback(async (p: number, s: string, r: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '30');
      if (s) params.set('search', s);
      if (r) params.set('role', r);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setData(d.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!checking) fetchUsers(page, search, roleFilter);
  }, [page, checking, fetchUsers]);

  const handleSearch = () => { setPage(1); fetchUsers(1, search, roleFilter); };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingId(userId);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const d = await res.json();
      if (d.success) {
        setMessage(d.message);
        fetchUsers(page, search, roleFilter);
      } else {
        setMessage(d.error || '操作失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setChangingId(null);
    }
  };

  const handleRemoveAdmin = async (userId: string, username: string) => {
    if (!confirm(`确认移除管理员「${username}」的管理权限？`)) return;
    setChangingId(userId);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        setMessage(d.message);
        fetchUsers(page, search, roleFilter);
      } else {
        setMessage(d.error || '操作失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setChangingId(null);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>验证中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
                <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
                <circle cx="18" cy="18" r="4" fill="var(--accent)"/>
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>用户管理</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {adminInfo ? `${adminInfo.nickname || adminInfo.username}` : 'FireSeed 平台'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="btn-ghost text-sm">仪表盘</Link>
            <Link href="/admin/novels" className="btn-ghost text-sm">小说管理</Link>
            <Link href="/admin/audit" className="btn-ghost text-sm">审计日志</Link>
            <button onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' });
              router.push('/admin');
            }} className="btn-ghost text-sm">退出</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>用户列表</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              共 {data?.total || 0} 人
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{
            background: message.includes('已更新') || message.includes('已移除') || message.includes('成功')
              ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            color: message.includes('已更新') || message.includes('已移除') || message.includes('成功')
              ? '#10b981' : '#ef4444',
          }}>
            {message}
          </div>
        )}

        {/* 搜索和过滤 */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>搜索</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input"
                placeholder="用户名或昵称..."
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>角色筛选</label>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="input"
                style={{ minWidth: 120 }}
              >
                <option value="">全部角色</option>
                <option value="reader">注册用户</option>
                <option value="viewer">数据观察员</option>
                <option value="editor">内容管理员</option>
                <option value="admin">高级管理员</option>
                <option value="super_admin">超级管理员</option>
              </select>
            </div>
            <button onClick={handleSearch} className="btn-primary text-sm px-6 py-2.5">搜索</button>
          </div>
        </div>

        {/* 用户表格 */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>用户名</th>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>当前角色</th>
                  <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>作品数</th>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>注册时间</th>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {data?.users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <span>{user.nickname}</span>
                        {user.username === '__admin__' && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }}>系统</span>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>@{user.username}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] || 'text-gray-400 bg-gray-400/10'}`}>
                        {user.roleLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-muted)' }}>{user.novelsCount}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {new Date(user.registeredAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.username !== '__admin__' && user.role !== 'super_admin' ? (
                          <>
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              disabled={changingId === user.id}
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-light)',
                              }}
                            >
                              <option value="reader">降级为普通用户</option>
                              {ASSIGNABLE_ROLES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            {user.role !== 'reader' && (
                              <button
                                onClick={() => handleRemoveAdmin(user.id, user.nickname)}
                                disabled={changingId === user.id}
                                className="text-xs hover:underline"
                                style={{ color: '#ef4444' }}
                              >
                                移除
                              </button>
                            )}
                          </>
                        ) : user.role === 'super_admin' ? (
                          <span className="text-xs" style={{ color: '#a78bfa' }}>—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data || data.users.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {loading ? '加载中...' : '暂无数据'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-light)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                第 {data.page} / {data.totalPages} 页，共 {data.total} 条
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  className="btn-ghost text-xs px-3 py-1"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={data.page >= data.totalPages}
                  className="btn-ghost text-xs px-3 py-1"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
