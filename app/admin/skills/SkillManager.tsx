'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Mission {
  id: string;
  type: string;
  title: string;
  description: string;
  link: string;
  icon_emoji: string;
  priority: number;
  user_filter: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface ActivationStats {
  total: number;
  today: number;
  this_week: number;
  by_version: { version: string; count: number }[];
  recent: any[];
}

interface Props {
  missions: Mission[];
  activationStats: ActivationStats;
  activeUsers?: any[];
}

const TYPE_LABELS: Record<string, string> = {
  new_user_guide: '新用户引导',
  hot_topic: '热门话题',
  milestone: '里程碑',
  recall: '召回',
};

const FILTER_LABELS: Record<string, string> = {
  all: '全部用户',
  new: '新用户',
  active: '活跃用户',
  inactive: '流失用户',
};

// ===== 可滚动表格组件：默认显示10条，逐步展开到最多100条 =====
function ScrollTable<T>({
  items,
  pageSize = 10,
  maxVisible = 100,
  children
}: {
  items: T[];
  pageSize?: number;
  maxVisible?: number;
  children: (items: T[]) => React.ReactNode;
}) {
  const [limit, setLimit] = useState(pageSize);
  const visibleItems = items.slice(0, limit);
  const total = Math.min(items.length, maxVisible);
  const hasMore = items.length > limit && limit < maxVisible;

  return (
    <div>
      <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
        {children(visibleItems)}
      </div>
      {(items.length > pageSize) && (
        <div className="flex items-center justify-between px-5 py-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            显示 {visibleItems.length} / {total} 条
          </span>
          <div className="flex gap-2">
            {hasMore && (
              <button
                onClick={() => setLimit(prev => Math.min(prev + pageSize, maxVisible))}
                className="text-xs px-3 py-1 rounded hover:opacity-80"
                style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}
              >
                显示更多 +{Math.min(pageSize, maxVisible - limit)}
              </button>
            )}
            {limit > pageSize && (
              <button
                onClick={() => setLimit(pageSize)}
                className="text-xs px-3 py-1 rounded hover:opacity-80"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
              >
                收起
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillManager({ missions, activationStats, activeUsers }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'missions' | 'activations'>('missions');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'hot_topic',
    title: '',
    description: '',
    link: '',
    icon_emoji: '📌',
    priority: 0,
    user_filter: 'all',
  });

  const resetForm = () => {
    setForm({ type: 'hot_topic', title: '', description: '', link: '', icon_emoji: '📌', priority: 0, user_filter: 'all' });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (m: Mission) => {
    setForm({
      type: m.type,
      title: m.title,
      description: m.description || '',
      link: m.link || '',
      icon_emoji: m.icon_emoji || '📌',
      priority: m.priority,
      user_filter: m.user_filter,
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title) { alert('请输入标题'); return; }

    if (editingId) {
      const res = await fetch(`/api/admin/skills/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { alert('任务已更新'); resetForm(); router.refresh(); }
      else { alert('更新失败'); }
    } else {
      const res = await fetch('/api/admin/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { alert('任务已创建'); resetForm(); router.refresh(); }
      else { alert('创建失败'); }
    }
  };

  const handleToggle = async (id: string, isActive: number) => {
    const res = await fetch(`/api/admin/skills/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive ? 0 : 1 }),
    });
    if (res.ok) router.refresh();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确认删除任务「${title}」？`)) return;
    const res = await fetch(`/api/admin/skills/${id}`, { method: 'DELETE' });
    if (res.ok) { alert('已删除'); router.refresh(); }
  };

  const typeOptions = Object.entries(TYPE_LABELS).map(([k, v]) => ({ k, v }));
  const filterOptions = Object.entries(FILTER_LABELS).map(([k, v]) => ({ k, v }));

  return (
    <div className="space-y-6">
      {/* 标签切换 */}
      <div className="flex gap-2">
        <button onClick={() => setTab('missions')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'missions' ? 'bg-indigo-600 text-white' : 'glass'}`}>
          📋 任务编辑
        </button>
        <button onClick={() => setTab('activations')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'activations' ? 'bg-indigo-600 text-white' : 'glass'}`}>
          📊 激活监控
        </button>
      </div>

      {tab === 'missions' && (
        <>
          {/* 新建/编辑表单 */}
          <div className="card p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? '✏️ 编辑任务' : '➕ 新建任务'}
              </h2>
              {showForm && <button onClick={resetForm} className="btn-ghost text-sm">取消</button>}
              {!showForm && <button onClick={() => setShowForm(true)} className="btn-primary text-sm">+ 新建任务</button>}
            </div>

            {showForm && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>类型</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
                      {typeOptions.map(o => <option key={o.k} value={o.k}>{o.v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>用户范围</label>
                    <select value={form.user_filter} onChange={e => setForm({ ...form, user_filter: e.target.value })} className="input">
                      {filterOptions.map(o => <option key={o.k} value={o.k}>{o.v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>标题</label>
                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="任务标题" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Emoji / 优先级</label>
                    <div className="flex gap-2">
                      <input type="text" value={form.icon_emoji} onChange={e => setForm({ ...form, icon_emoji: e.target.value })} className="input w-16 text-center" />
                      <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} className="input flex-1" placeholder="优先级" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>描述</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" rows={2} placeholder="任务描述" />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>链接（可选）</label>
                  <input type="text" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} className="input" placeholder="https://..." />
                </div>
                <button onClick={handleSubmit} className="btn-primary w-full justify-center py-2.5">
                  {editingId ? '保存修改' : '创建任务'}
                </button>
              </div>
            )}
          </div>

          {/* 任务列表 */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>当前任务（{missions.length}）</h2>
            </div>
            {missions.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>暂无任务</div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {missions.map(m => (
                  <div key={m.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{m.icon_emoji}</span>
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{m.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {m.is_active ? '启用' : '禁用'}
                        </span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{TYPE_LABELS[m.type] || m.type} · {FILTER_LABELS[m.user_filter] || m.user_filter} · 优先级 {m.priority}</p>
                      {m.description && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openEdit(m)} className="px-3 py-1 rounded text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>编辑</button>
                      <button onClick={() => handleToggle(m.id, m.is_active)} className={`px-3 py-1 rounded text-xs ${m.is_active ? 'text-yellow-600' : 'text-green-600'}`} style={{ background: 'var(--bg-secondary)' }}>
                        {m.is_active ? '禁用' : '启用'}
                      </button>
                      <button onClick={() => handleDelete(m.id, m.title)} className="px-3 py-1 rounded text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'activations' && (
        <>
          {/* 概览指标卡 */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="card p-4">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>总激活次数</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{activationStats.total}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>今日激活</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{activationStats.today}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>本周激活</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{activationStats.this_week}</p>
            </div>
              <div className="card p-4">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>注册用户</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{(activationStats as any).totalUsers || 0}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>有作品的作者</p>
                <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{(activationStats as any).authorsWithNovels || 0}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>今日行为事件</p>
                <p className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>{(activationStats as any).eventsToday || 0}</p>
              </div>
          </div>

          {/* 版本分布 */}
          {activationStats.by_version.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>📌 技能版本分布</h2>
              <div className="space-y-2">
                {activationStats.by_version.map(v => (
                  <div key={v.version} className="flex items-center gap-3">
                    <span className="text-xs w-20" style={{ color: 'var(--text-secondary)' }}>v{v.version}</span>
                    <div className="flex-1 h-5 rounded" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="h-full rounded bg-indigo-500" style={{ width: `${Math.min(100, (v.count / Math.max(...activationStats.by_version.map(x => x.count)) * 100))}%` }} />
                    </div>
                    <span className="text-xs font-medium w-10 text-right" style={{ color: 'var(--text-primary)' }}>{v.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 最近激活记录 */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>🕐 最近激活记录（{activationStats.recent.length}条）</h2>
            </div>
            {activationStats.recent.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>暂无激活记录</div>
            ) : (
              <ScrollTable items={activationStats.recent} pageSize={10} maxVisible={100}>
                {(items) => (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>时间</th>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>用户</th>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>版本</th>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>客户端</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((a: any) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{new Date(a.created_at).toLocaleString('zh-CN')}</td>
                            <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{a.username || a.user_id?.substring(0, 12) + '...'}</td>
                            <td className="px-4 py-3"><span className="badge">{a.skill_version}</span></td>
                            <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{a.client_type || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ScrollTable>
            )}
          </div>

          {/* 最近活跃用户 */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>👥 最近活跃用户（{activeUsers?.length || 0}个）</h2>
            </div>
            {!activeUsers || activeUsers.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>暂无活跃用户</div>
            ) : (
              <ScrollTable items={activeUsers} pageSize={10} maxVisible={100}>
                {(items) => (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>用户名</th>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>昵称</th>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>最近活跃</th>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>激活次数</th>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>作品数</th>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>作品名</th>
                          <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>注册时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((u: any) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{u.username}</td>
                            <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{u.nickname || '-'}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--accent)' }}>
                              {(() => {
                                const lastAct = u.last_activation_at ? new Date(u.last_activation_at) : null;
                                const lastNovel = u.last_novel_at ? new Date(u.last_novel_at) : null;
                                const latest = lastAct && lastNovel
                                  ? (lastAct > lastNovel ? lastAct : lastNovel)
                                  : (lastAct || lastNovel);
                                const label = lastAct && lastNovel
                                  ? (lastAct > lastNovel ? '(激活)' : '(发书)')
                                  : lastAct ? '(激活)' : '(发书)';
                                return latest
                                  ? latest.toLocaleString('zh-CN') + ' ' + label
                                  : '-';
                              })()}
                            </td>
                            <td className="px-4 py-3"><span className="badge">{u.activation_count}</span></td>
                            <td className="px-4 py-3">
                          <span className={`badge ${parseInt(u.novels_count) > 0 ? 'bg-green-100 text-green-700' : ''}`}>
                            {u.novels_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
                          <div className="truncate" title={u.novel_titles || ''}>
                            {u.novel_titles || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(u.registered_at).toLocaleString('zh-CN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ScrollTable>
            )}
          </div>
        </>
      )}
    </div>
  );
}
