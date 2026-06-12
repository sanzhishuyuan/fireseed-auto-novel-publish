'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
  danger: '#ef4444',
};

export default function LorebookListPage() {
  const [lorebooks, setLorebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const loadList = async () => {
    try {
      const res = await fetch('/api/rpg/lorebooks');
      const d = await res.json();
      if (d.success) setLorebooks(d.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadList(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rpg/lorebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setShowCreate(false);
        setNewName('');
        setNewDesc('');
        loadList();
      }
    } catch {} finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除世界书「${name}」？此操作不可撤销。`)) return;
    try {
      const res = await fetch(`/api/rpg/lorebooks/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) loadList();
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* 导航 */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/rpg" style={{ color: C.gold, fontSize: 14, textDecoration: 'none' }}>← 返回酒馆</Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 24, marginBottom: 4 }}>
              世界书
            </h1>
            <p style={{ color: C.textSec, fontSize: 14 }}>
              创建世界设定、人物档案、地点百科，AI GM 会在叙事中引用这些内容
            </p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="codex-btn-gold" style={{
              padding: '8px 20px', borderRadius: 6, border: 'none',
              cursor: 'pointer', fontSize: 14, flexShrink: 0,
            }}>
            {showCreate ? '取消' : '✦ 新建世界书'}
          </button>
        </div>

        {/* 创建面板 */}
        {showCreate && (
          <div style={{
            padding: 20, borderRadius: 8, background: C.card,
            border: `1px solid ${C.border}`, marginBottom: 24,
          }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>名称 *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="例如：中土世界百科、赛博朋克2077设定集..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6,
                  background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 14,
                }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>描述</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="这本世界书的用途和范围..."
                rows={2}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6,
                  background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, resize: 'vertical',
                }} />
            </div>
            <button onClick={handleCreate} disabled={creating || !newName.trim()}
              className="codex-btn-gold" style={{
                padding: '10px 24px', borderRadius: 6, border: 'none',
                cursor: (creating || !newName.trim()) ? 'not-allowed' : 'pointer',
                fontSize: 14, opacity: (creating || !newName.trim()) ? 0.5 : 1,
              }}>
              {creating ? '创建中...' : '创建'}
            </button>
          </div>
        )}

        {/* 列表 */}
        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="codex-skeleton" style={{ height: 80, borderRadius: 8, background: C.card }} />
            ))}
          </div>
        ) : lorebooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textDim }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>📖</p>
            <p style={{ fontSize: 15, marginBottom: 8, color: C.textSec }}>还没有世界书</p>
            <p style={{ fontSize: 13 }}>创建世界书来丰富 AI GM 的叙事素材</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {lorebooks.map((lb: any) => (
              <div key={lb.id} style={{
                padding: 16, borderRadius: 8, background: C.card,
                border: `1px solid ${C.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ flex: 1 }}>
                  <Link href={`/rpg/lorebooks/${lb.id}`}
                    style={{ color: C.gold, fontSize: 16, fontFamily: "'Fraunces', Georgia, serif", textDecoration: 'none' }}>
                    {lb.name}
                  </Link>
                  <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>
                    {lb.description || '暂无描述'}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 6, display: 'flex', gap: 12 }}>
                    <span>📝 {lb.entry_count || 0} 条目</span>
                    <span>{lb.is_public ? '🌐 公开' : '🔒 私有'}</span>
                    <span>更新于 {new Date(lb.updated_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link href={`/rpg/lorebooks/${lb.id}`}
                    style={{
                      padding: '6px 14px', borderRadius: 4, fontSize: 12,
                      background: C.goldDim + '20', border: `1px solid ${C.goldDim}`,
                      color: C.gold, textDecoration: 'none',
                    }}>
                    编辑
                  </Link>
                  <button onClick={() => handleDelete(lb.id, lb.name)}
                    style={{
                      padding: '6px 10px', borderRadius: 4, fontSize: 12,
                      background: 'transparent', border: `1px solid ${C.border}`,
                      color: C.textDim, cursor: 'pointer',
                    }}>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
