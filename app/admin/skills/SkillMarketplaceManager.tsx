'use client';

import { useState, useEffect } from 'react';
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

export default function SkillMarketplaceManager() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', title: '', description: '', author: '', icon_emoji: '📦',
    tags: '', repo_url: '', repo_type: 'github', skill_version: '',
    download_count: 0, star_count: 0, sort_order: 0, is_active: 1,
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/skills-market');
      if (res.ok) { const d = await res.json(); if (d.success) setItems(d.data); }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const resetForm = () => {
    setForm({ name: '', title: '', description: '', author: '', icon_emoji: '📦', tags: '', repo_url: '', repo_type: 'github', skill_version: '', download_count: 0, star_count: 0, sort_order: 0, is_active: 1 });
    setEditingId(null); setShowForm(false); setPreview(null);
  };

  const openEdit = (item: any) => {
    setForm({
      name: item.name, title: item.title, description: item.description || '',
      author: item.author || '', icon_emoji: item.icon_emoji || '📦', tags: item.tags || '',
      repo_url: item.repo_url || '', repo_type: item.repo_type || 'github',
      skill_version: item.skill_version || '', download_count: item.download_count || 0,
      star_count: item.star_count || 0, sort_order: item.sort_order || 0, is_active: item.is_active,
    });
    setEditingId(item.id); setShowForm(true);
  };

  const handleSync = async () => {
    if (!form.repo_url) { alert('请先填写仓库URL'); return; }
    setSyncing(form.repo_url);
    try {
      const res = await fetch('/api/skills/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: form.repo_url, repo_type: form.repo_type }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.metadata);
        setForm(prev => ({
          ...prev,
          name: data.metadata.name || prev.name,
          title: data.metadata.title || prev.title,
          description: data.metadata.description || prev.description,
          author: data.metadata.author || prev.author,
          icon_emoji: data.metadata.icon_emoji || prev.icon_emoji,
          tags: data.metadata.tags || prev.tags,
          skill_version: data.metadata.version || prev.skill_version,
        }));
        alert('元数据已提取，请确认后保存');
      } else {
        alert('同步失败: ' + (data.error || ''));
      }
    } catch { alert('同步失败'); }
    finally { setSyncing(''); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.title) { alert('名称和标题不能为空'); return; }
    const url = editingId ? '/api/admin/skills-market/' + editingId : '/api/admin/skills-market';
    const method = editingId ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { alert(editingId ? '已更新' : '已创建'); resetForm(); fetchItems(); }
      else { alert('操作失败'); }
    } catch { alert('操作失败'); }
  };

  const handleToggle = async (id: string, isActive: number) => {
    const res = await fetch('/api/admin/skills-market/' + id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive ? 0 : 1 }),
    });
    if (res.ok) fetchItems();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm('确认删除「' + title + '」？')) return;
    const res = await fetch('/api/admin/skills-market/' + id, { method: 'DELETE' });
    if (res.ok) { alert('已删除'); fetchItems(); }
  };

  return (
    <div className="space-y-4">
      {/* 表单 */}
      <div className="codex-card p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold" style={{ color: C.text, fontFamily: fontDisplay }}>
            {editingId ? '编辑技能' : '添加技能'}
          </h2>
          {showForm && <button onClick={resetForm} className="codex-btn-ghost text-sm">取消</button>}
          {!showForm && <button onClick={() => setShowForm(true)} className="codex-btn-gold text-sm">+ 添加</button>}
        </div>
        {showForm && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: C.dim }}>仓库URL / ClawHub Slug</label>
                <div className="flex gap-2">
                  <input type="text" value={form.repo_url} onChange={e => setForm({ ...form, repo_url: e.target.value })} className="codex-input flex-1" placeholder={form.repo_type === 'clawhub' ? '输入 ClawHub slug (如 fireseed-novel-auto-publish)' : 'https://github.com/xxx/xxx-skill'} />
                  <button onClick={handleSync} disabled={syncing !== ''} className="codex-btn-ghost text-xs px-3">{syncing ? '同步中...' : '提取元数据'}</button>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: C.dim }}>来源类型</label>
                <select value={form.repo_type} onChange={e => setForm({ ...form, repo_type: e.target.value })} className="codex-input">
                  <option value="github">GitHub</option>
                  <option value="gitee">Gitee</option>
                  <option value="clawhub">ClawHub</option>
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className="block text-xs mb-1" style={{ color: C.dim }}>标识名</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="codex-input" /></div>
              <div><label className="block text-xs mb-1" style={{ color: C.dim }}>显示名称</label><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="codex-input" /></div>
              <div className="flex gap-2">
                <div className="flex-1"><label className="block text-xs mb-1" style={{ color: C.dim }}>图标</label><input type="text" value={form.icon_emoji} onChange={e => setForm({ ...form, icon_emoji: e.target.value })} className="codex-input" /></div>
                <div className="flex-1"><label className="block text-xs mb-1" style={{ color: C.dim }}>作者</label><input type="text" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} className="codex-input" /></div>
              </div>
            </div>
            <div><label className="block text-xs mb-1" style={{ color: C.dim }}>简介</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="codex-input" rows={2} /></div>
            <div className="grid md:grid-cols-5 gap-4">
              <div><label className="block text-xs mb-1" style={{ color: C.dim }}>标签</label><input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="codex-input" placeholder="写作,工具" /></div>
              <div><label className="block text-xs mb-1" style={{ color: C.dim }}>版本</label><input type="text" value={form.skill_version} onChange={e => setForm({ ...form, skill_version: e.target.value })} className="codex-input" /></div>
              <div><label className="block text-xs mb-1" style={{ color: C.dim }}>下载数</label><input type="number" value={form.download_count} onChange={e => setForm({ ...form, download_count: parseInt(e.target.value) || 0 })} className="codex-input" /></div>
              <div><label className="block text-xs mb-1" style={{ color: C.dim }}>星数</label><input type="number" value={form.star_count} onChange={e => setForm({ ...form, star_count: parseInt(e.target.value) || 0 })} className="codex-input" /></div>
              <div><label className="block text-xs mb-1" style={{ color: C.dim }}>排序</label><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="codex-input" /></div>
            </div>
            {preview && (
              <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p className="font-medium mb-1" style={{ color: '#10b981' }}>元数据已提取</p>
                <pre style={{ color: C.dim }}>{JSON.stringify(preview, null, 2)}</pre>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.text }}>
              <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} />
              立即发布
            </label>
            <button onClick={handleSubmit} className="codex-btn-gold w-full justify-center py-2.5">{editingId ? '保存修改' : '创建技能'}</button>
          </div>
        )}
      </div>

      {/* 列表 */}
      <div className="codex-card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 className="font-semibold" style={{ color: C.text, fontFamily: fontDisplay }}>技能列表（{items.length}）</h2>
        </div>
        {loading ? (
          <div className="px-5 py-12 text-center text-sm codex-empty" style={{ color: C.dim }}>加载中...</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm codex-empty" style={{ color: C.dim }}>暂无技能</div>
        ) : (
          <div className="divide-y" style={{ borderColor: C.border }}>
            {items.map((item: any) => (
              <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{item.icon_emoji}</span>
                    <span className="font-medium text-sm" style={{ color: C.text, fontFamily: fontDisplay }}>{item.title}</span>
                    <span className={item.is_active ? 'codex-badge-green' : 'codex-badge'}>{item.is_active ? '已发布' : '隐藏'}</span>
                  </div>
                  <p className="text-xs" style={{ color: C.dim }}>v{item.skill_version} · {item.author} · {item.download_count} 下载</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(item)} className="px-3 py-1 rounded text-xs" style={{ background: C.elevated, color: C.dim }}>编辑</button>
                  <button onClick={() => handleToggle(item.id, item.is_active)} className="px-3 py-1 rounded text-xs" style={{ background: C.elevated, color: item.is_active ? '#d97706' : C.green }}>{item.is_active ? '隐藏' : '发布'}</button>
                  <button onClick={() => handleDelete(item.id, item.title)} className="px-3 py-1 rounded text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: C.red }}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
