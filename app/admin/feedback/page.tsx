'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FeedbackItem {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  contact: string | null;
  status: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'open', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
];

const TYPE_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  feature: '💡 建议',
  question: '❓ 疑问',
  other: '📝 其他',
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  open: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  in_progress: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  resolved: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  closed: { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
};

const STATUS_LABELS: Record<string, string> = {
  open: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  closed: '已关闭',
};

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openCount, setOpenCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/feedback?${params}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setOpenCount(data.openCount);
        setStatusCounts(data.statusCounts || {});
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, router]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchFeedback();
        if (id === selectedId && newStatus !== 'open') {
          setReplyText('');
          setSelectedId(null);
        }
      }
    } catch {
      // ignore
    } finally {
      setUpdating(null);
    }
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_reply: replyText.trim(),
          status: 'resolved',
        }),
      });
      if (res.ok) {
        setReplyText('');
        setSelectedId(null);
        fetchFeedback();
      }
    } catch {
      // ignore
    } finally {
      setUpdating(null);
    }
  };

  const selectedItem = items.find((i) => i.id === selectedId);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
                <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
                <circle cx="18" cy="18" r="4" fill="var(--accent)"/>
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>反馈管理</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>用户意见与问题收集</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard" className="btn-ghost text-sm">← 返回面板</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* 状态统计 */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-6">
          <div className="card p-3 text-center cursor-pointer" onClick={() => setStatusFilter('')}
            style={{ border: statusFilter === '' ? '1px solid var(--accent)' : '1px solid var(--border-light)' }}>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{(statusCounts['open'] || 0) + (statusCounts['in_progress'] || 0) + (statusCounts['resolved'] || 0) + (statusCounts['closed'] || 0)}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>全部</p>
          </div>
          {STATUS_OPTIONS.slice(1).map((opt) => (
            <div key={opt.value} className="card p-3 text-center cursor-pointer" onClick={() => setStatusFilter(opt.value)}
              style={{ border: statusFilter === opt.value ? '1px solid var(--accent)' : '1px solid var(--border-light)' }}>
              <p className="text-lg font-bold" style={{ color: STATUS_STYLES[opt.value]?.color || 'var(--text-primary)' }}>
                {statusCounts[opt.value] || 0}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{opt.label}</p>
            </div>
          ))}
        </div>

        {/* 搜索 */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchFeedback()}
            className="input flex-1"
            placeholder="搜索标题或内容..."
          />
          <button onClick={fetchFeedback} className="btn-primary text-sm px-4">搜索</button>
        </div>

        {/* 反馈列表 */}
        <div className="space-y-3">
          {loading ? (
            <div className="card p-12 text-center">
              <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>📭</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{statusFilter ? '没有匹配的反馈' : '暂无反馈'}</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`card overflow-hidden transition-all duration-200 ${
                  selectedId === item.id ? 'ring-2' : ''
                }`}
                style={{
                  cursor: 'pointer',
                  border: selectedId === item.id ? '1px solid var(--accent)' : '1px solid var(--border-light)',
                  '--tw-ring-color': 'var(--accent)',
                } as React.CSSProperties}
              >
                {/* 反馈头 */}
                <div className="p-4" onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        {TYPE_LABELS[item.type] || item.type}
                      </span>
                      <h3 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          background: STATUS_STYLES[item.status]?.bg || 'var(--bg-secondary)',
                          color: STATUS_STYLES[item.status]?.color || 'var(--text-muted)',
                        }}
                      >
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${selectedId === item.id ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        style={{ color: 'var(--text-muted)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>
                      {item.message?.slice(0, 100)}{item.message?.length > 100 ? '...' : ''}
                    </p>
                    <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>

                {/* 展开详情 */}
                {selectedId === item.id && (
                  <div style={{ borderTop: '1px solid var(--border-light)' }}>
                    <div className="p-4 space-y-4">
                      {/* 完整内容 */}
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>反馈内容</p>
                        <div className="p-3 rounded-lg text-sm whitespace-pre-wrap" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                          {item.message}
                        </div>
                      </div>

                      {/* 联系方式 */}
                      {item.contact && (
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>联系方式</p>
                          <p className="text-sm" style={{ color: 'var(--accent)' }}>{item.contact}</p>
                        </div>
                      )}

                      {/* 已回复内容 */}
                      {item.admin_reply && (
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>已回复</p>
                          <div className="p-3 rounded-lg text-sm whitespace-pre-wrap" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--text-primary)' }}>
                            {item.admin_reply}
                          </div>
                        </div>
                      )}

                      {/* 状态操作按钮 */}
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>变更状态</p>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_OPTIONS.slice(1).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => handleStatusChange(item.id, opt.value)}
                              disabled={updating === item.id || item.status === opt.value}
                              className="text-xs px-3 py-1.5 rounded-lg transition-all"
                              style={{
                                background: item.status === opt.value
                                  ? (STATUS_STYLES[opt.value]?.bg || 'var(--bg-secondary)')
                                  : 'var(--bg-secondary)',
                                color: item.status === opt.value
                                  ? (STATUS_STYLES[opt.value]?.color || 'var(--text-primary)')
                                  : 'var(--text-muted)',
                                opacity: item.status === opt.value ? 0.7 : 1,
                                cursor: item.status === opt.value ? 'default' : 'pointer',
                              }}
                            >
                              {updating === item.id ? '...' : opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 回复区 */}
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>管理员回复</p>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="input w-full min-h-[80px] resize-y text-sm"
                          placeholder="输入回复内容，回复后将自动标记为已解决..."
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleReply(item.id)}
                            disabled={updating === item.id || !replyText.trim()}
                            className="btn-primary text-sm px-4 py-2"
                          >
                            {updating === item.id ? '回复中...' : '回复并解决'}
                          </button>
                        </div>
                      </div>

                      {/* 时间信息 */}
                      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>提交: {new Date(item.created_at).toLocaleString('zh-CN')}</span>
                        <span>更新: {new Date(item.updated_at).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
