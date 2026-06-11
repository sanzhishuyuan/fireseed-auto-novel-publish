'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg: '#0b0b0f',
  card: '#131318',
  elevated: '#1a1a22',
  hover: '#22222c',
  text: '#f0ece4',
  dim: '#9a9a8e',
  muted: '#5a5a52',
  gold: '#c9a55c',
  goldLight: '#e4cc8a',
  goldGlow: 'rgba(201,165,92,0.12)',
  goldBorder: 'rgba(201,165,92,0.2)',
  border: 'rgba(255,255,255,0.06)',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
} as const;
const fontDisplay = "'Fraunces', Georgia, serif";
const fontMono = "'DM Mono', 'Menlo', monospace";

interface Resource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  tags: string;
  provider_id: string | null;
  provider_name: string;
  status: string;
  useful_count: number;
  useless_count: number;
  verified_count: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  resources: Resource[];
  statusCounts: Record<string, number>;
}

const STATUS_TABS = [
  { key: 'pending', label: '待审核', emoji: '⏳' },
  { key: 'verified', label: '已通过', emoji: '✅' },
  { key: 'rejected', label: '已拒绝', emoji: '❌' },
];

const CATEGORY_EMOJIS: Record<string, string> = {
  'ai-tool': '🤖',
  'ai-coding': '💻',
  'ai-image': '🎨',
  'ai-video': '🎬',
  'ai-api': '🔌',
  'ai-data': '📊',
  'dev-tools': '🛠️',
  'other': '📦',
};

const CATEGORY_LABELS: Record<string, string> = {
  'ai-tool': 'AI 对话',
  'ai-coding': 'AI 编程',
  'ai-image': 'AI 图像',
  'ai-video': 'AI 视频',
  'ai-api': 'API 平台',
  'ai-data': '数据训练',
  'dev-tools': '开发工具',
  'other': '其他资源',
};

const ITEMS_PER_PAGE = 20;

export default function ResourceManager({ resources, statusCounts }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 按状态过滤并排序（最新的在前）
  const filteredResources = useMemo(() => {
    return resources
      .filter(r => r.status === activeTab)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [resources, activeTab]);

  // 分页
  const totalPages = Math.ceil(filteredResources.length / ITEMS_PER_PAGE);
  const paginatedResources = filteredResources.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // 切换 tab 时重置页码
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  // 审核操作
  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      const status = action === 'approve' ? 'verified' : 'rejected';
      const res = await fetch(`/api/admin/resources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const json = await res.json();
        alert(json.error?.message || '操作失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="codex-badge-gold">待审核</span>;
      case 'verified':
        return <span className="codex-badge-green">已通过</span>;
      case 'rejected':
        return <span className="codex-badge-red">已拒绝</span>;
      default:
        return <span className="codex-badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 概览统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="codex-card p-4">
          <p className="text-xs mb-1" style={{ color: C.dim }}>待审核</p>
          <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{statusCounts['pending'] || 0}</p>
        </div>
        <div className="codex-card p-4">
          <p className="text-xs mb-1" style={{ color: C.dim }}>已通过</p>
          <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{statusCounts['verified'] || 0}</p>
        </div>
        <div className="codex-card p-4">
          <p className="text-xs mb-1" style={{ color: C.dim }}>已拒绝</p>
          <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{statusCounts['rejected'] || 0}</p>
        </div>
        <div className="codex-card p-4">
          <p className="text-xs mb-1" style={{ color: C.dim }}>全部</p>
          <p className="text-2xl font-bold" style={{ color: C.text }}>{resources.length}</p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all`}
            style={activeTab === tab.key ? { background: C.gold, color: '#0b0b0f' } : { background: C.elevated, color: C.dim }}
          >
            {tab.emoji} {tab.label}
            <span className="ml-1.5 opacity-70">({statusCounts[tab.key] || 0})</span>
          </button>
        ))}
      </div>

      {/* 资源列表表格 */}
      <div className="codex-card overflow-hidden">
        {paginatedResources.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm codex-empty" style={{ color: C.dim }}>
            {activeTab === 'pending'
              ? '暂无待审核的资源'
              : activeTab === 'verified'
              ? '暂无已通过的资源'
              : '暂无已拒绝的资源'
            }
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: C.dim }}>资源</th>
                    <th className="text-left px-4 py-3 text-xs font-medium hide-mobile" style={{ color: C.dim }}>分类</th>
                    <th className="text-left px-4 py-3 text-xs font-medium hide-mobile" style={{ color: C.dim }}>提交者</th>
                    <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: C.dim }}>状态</th>
                    <th className="text-left px-4 py-3 text-xs font-medium hide-mobile" style={{ color: C.dim }}>有用/无用</th>
                    <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: C.dim }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResources.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }} className="hover:opacity-90">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{CATEGORY_EMOJIS[r.category] || '📦'}</span>
                          <div>
                            <div className="font-medium text-sm" style={{ color: C.text, fontFamily: fontDisplay }}>
                              {r.title}
                            </div>
                            <div className="text-xs truncate max-w-[200px]" style={{ color: C.dim }}>
                              {r.url}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hide-mobile">
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: C.elevated, color: C.dim }}>
                          {CATEGORY_LABELS[r.category] || r.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 hide-mobile text-xs" style={{ color: C.dim }}>
                        {r.provider_name || '匿名'}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(r.status)}
                      </td>
                      <td className="px-4 py-3 hide-mobile">
                        <span className="text-xs" style={{ color: C.dim }}>
                          <span style={{ color: '#10b981' }}>{r.useful_count}</span>
                          /
                          <span style={{ color: '#ef4444' }}>{r.useless_count}</span>
                          {' · '}验证 {r.verified_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAction(r.id, 'approve')}
                              disabled={actionLoading === r.id}
                              className="px-3 py-1 rounded text-xs font-medium transition-all disabled:opacity-50"
                              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
                            >
                              {actionLoading === r.id ? '处理中...' : '通过'}
                            </button>
                            <button
                              onClick={() => handleAction(r.id, 'reject')}
                              disabled={actionLoading === r.id}
                              className="px-3 py-1 rounded text-xs font-medium transition-all disabled:opacity-50"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                            >
                              拒绝
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAction(r.id, r.status === 'verified' ? 'reject' : 'approve')}
                            disabled={actionLoading === r.id}
                            className="codex-btn-ghost text-xs"
                            style={{ background: C.elevated, color: C.dim }}
                          >
                            {actionLoading === r.id ? '处理中...' : r.status === 'verified' ? '改为拒绝' : '改为通过'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: C.border }}>
                <span className="text-xs" style={{ color: C.dim }}>
                  共 {filteredResources.length} 条
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded text-xs disabled:opacity-40"
                    style={{ background: C.elevated, color: C.dim }}
                  >
                    上一页
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className="w-7 h-7 rounded text-xs font-medium transition-all"
                        style={{
                          background: page === pageNum ? C.gold : 'transparent',
                          color: page === pageNum ? '#0b0b0f' : C.dim,
                          border: page === pageNum ? 'none' : `1px solid ${C.border}`,
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 rounded text-xs disabled:opacity-40"
                    style={{ background: C.elevated, color: C.dim }}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
