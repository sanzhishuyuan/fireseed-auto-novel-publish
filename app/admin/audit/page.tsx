'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHeaderConfig } from '@/components/HeaderContext';

const ACTION_LABELS: Record<string, string> = {
  login: '登录',
  logout: '退出',
  create_novel: '创建小说',
  edit_novel: '编辑小说',
  delete_novel: '删除小说',
  create_chapter: '创建章节',
  edit_chapter: '编辑章节',
  delete_chapter: '删除章节',
  create_ai_token: '创建 AI Token',
  toggle_ai_token: '切换 Token 状态',
  delete_ai_token: '删除 AI Token',
  create_skill_mission: '创建技能任务',
  edit_skill_mission: '编辑技能任务',
  delete_skill_mission: '删除技能任务',
  upload_music: '上传音乐',
  delete_music: '删除音乐',
  cleanup_novel: '清理小说',
  update_admin_role: '更新管理员角色',
  remove_admin: '移除管理员',
  system_setting: '系统设置',
};

const ACTION_COLORS: Record<string, string> = {
  login: 'text-blue-400 bg-blue-400/10',
  logout: 'text-gray-400 bg-gray-400/10',
  create_novel: 'text-emerald-400 bg-emerald-400/10',
  edit_novel: 'text-amber-400 bg-amber-400/10',
  delete_novel: 'text-red-400 bg-red-400/10',
  create_chapter: 'text-emerald-400 bg-emerald-400/10',
  edit_chapter: 'text-amber-400 bg-amber-400/10',
  delete_chapter: 'text-red-400 bg-red-400/10',
  create_ai_token: 'text-emerald-400 bg-emerald-400/10',
  toggle_ai_token: 'text-amber-400 bg-amber-400/10',
  delete_ai_token: 'text-red-400 bg-red-400/10',
  create_skill_mission: 'text-emerald-400 bg-emerald-400/10',
  edit_skill_mission: 'text-amber-400 bg-amber-400/10',
  delete_skill_mission: 'text-red-400 bg-red-400/10',
  upload_music: 'text-emerald-400 bg-emerald-400/10',
  delete_music: 'text-red-400 bg-red-400/10',
  cleanup_novel: 'text-red-400 bg-red-400/10',
  update_admin_role: 'text-purple-400 bg-purple-400/10',
  remove_admin: 'text-red-400 bg-red-400/10',
  system_setting: 'text-blue-400 bg-blue-400/10',
};

interface AuditLog {
  id: string;
  admin_id: string;
  admin_username: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | string | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminAuditPage() {
  const router = useRouter();
  const { setConfig } = useHeaderConfig();
  const [adminInfo, setAdminInfo] = useState<{ username: string; nickname?: string; role: string } | null>(null);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { setConfig({ hideHeader: true }); return () => setConfig({}); }, [setConfig]);

  // 验证超级管理员身份
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

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '50');
      if (actionFilter) params.set('action', actionFilter);
      if (adminFilter) params.set('admin_id', adminFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const res = await fetch(`/api/admin/audit?${params}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) setData(d.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [actionFilter, adminFilter, startDate, endDate]);

  useEffect(() => {
    if (!checking) fetchLogs(page);
  }, [page, checking, fetchLogs]);

  const handleFilter = () => { setPage(1); fetchLogs(1); };

  const handleReset = () => {
    setActionFilter('');
    setAdminFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
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
              <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>审计日志</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {adminInfo ? `${adminInfo.nickname || adminInfo.username}` : 'FireSeed 平台'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="btn-ghost text-sm">仪表盘</Link>
            <Link href="/admin/users" className="btn-ghost text-sm">用户管理</Link>
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
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>操作审计日志</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              记录所有管理员操作，仅追加不删除，共 {data?.total || 0} 条
            </p>
          </div>
        </div>

        {/* 过滤条件 */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>操作类型</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="input"
              >
                <option value="">全部操作</option>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>管理员</label>
              <input
                type="text"
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
                className="input"
                placeholder="管理员用户名..."
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleFilter} className="btn-primary text-sm px-4 py-2.5">筛选</button>
              <button onClick={handleReset} className="btn-ghost text-sm px-4 py-2.5">重置</button>
            </div>
          </div>
        </div>

        {/* 日志列表 */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>时间</th>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>管理员</th>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>操作</th>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>目标</th>
                  <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>来源 IP</th>
                  <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>详情</th>
                </tr>
              </thead>
              <tbody>
                {data?.logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {log.admin_username}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${ACTION_COLORS[log.action] || 'text-gray-400 bg-gray-400/10'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {log.target_type ? (
                        <span className="text-xs">
                          {log.target_type}
                          {log.target_id && (
                            <span className="ml-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                              #{log.target_id.slice(0, 8)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.detail ? (
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          {expandedId === log.id ? '收起' : '查看'}
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data || data.logs.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {loading ? '加载中...' : '暂无审计日志'}
                    </td>
                  </tr>
                )}

                {/* 展开的详情行 */}
                {data?.logs.filter(l => expandedId === l.id).map((log) => (
                  <tr key={`detail-${log.id}`}>
                    <td colSpan={6} className="px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
                      <pre className="text-xs leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)', maxHeight: 200 }}>
                        {JSON.stringify(log.detail, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
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

        {/* 说明 */}
        <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>关于审计日志</h3>
          <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
            <li>• 审计日志记录所有管理员的重要操作，仅追加不删除</li>
            <li>• 即使 super_admin 也不能删除审计日志</li>
            <li>• 日志包含操作人、操作时间、目标对象、IP 地址和详细参数</li>
            <li>• 建议定期审查审计日志，发现异常操作及时处理</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
