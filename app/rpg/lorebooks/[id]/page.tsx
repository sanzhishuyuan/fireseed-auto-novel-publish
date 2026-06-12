'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24', inputBg: '#1a1a20',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
  danger: '#ef4444', success: '#22c55e',
};

interface LorebookEntry {
  id: string;
  keys: string[];
  content: string;
  enabled: boolean;
  selective: boolean;
  priority: number;
  secondary_keys?: string[];
  constant?: boolean;
}

const emptyEntry = (): LorebookEntry => ({
  id: '', keys: [''], content: '', enabled: true, selective: false, priority: 10, secondary_keys: [], constant: false,
});

export default function LorebookEditorPage() {
  const params = useParams();
  const router = useRouter();

  const [lorebook, setLorebook] = useState<any>(null);
  const [entries, setEntries] = useState<LorebookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editEntry, setEditEntry] = useState<LorebookEntry>(emptyEntry());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [system, setSystem] = useState('custom');
  const [filterText, setFilterText] = useState('');

  const loadLorebook = useCallback(async () => {
    try {
      const res = await fetch(`/api/rpg/lorebooks/${params.id}`);
      const d = await res.json();
      if (d.success) {
        setLorebook(d.data);
        setEntries(d.data.entries || []);
        setName(d.data.name || '');
        setDescription(d.data.description || '');
        setSystem(d.data.system || 'custom');
      }
    } catch {} finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { loadLorebook(); }, [loadLorebook]);

  const showSaveMsg = (msg: string) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleSaveMeta = async () => {
    setSaving(true);
    try {
      await fetch(`/api/rpg/lorebooks/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, system }),
      });
      showSaveMsg('基本信息已保存');
    } catch {} finally { setSaving(false); }
  };

  const handleAddEntry = async () => {
    try {
      const res = await fetch(`/api/rpg/lorebooks/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_entry',
          entry: { keys: [''], content: '', enabled: true, selective: false, priority: 10 },
        }),
      });
      const d = await res.json();
      if (d.success) {
        setEntries(d.data.entries);
        setEditIdx(d.data.entries.length - 1);
        setEditEntry(d.data.entries[d.data.entries.length - 1]);
      }
    } catch {}
  };

  const handleSaveEntry = async () => {
    if (!editEntry.keys.some(k => k.trim()) || !editEntry.content.trim()) {
      showSaveMsg('请至少填写一个关键词和内容');
      return;
    }
    setSaving(true);
    try {
      const cleaned = { ...editEntry, keys: editEntry.keys.filter(k => k.trim()) };
      const res = await fetch(`/api/rpg/lorebooks/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_entry', entryId: editEntry.id, entry: cleaned }),
      });
      const d = await res.json();
      if (d.success) {
        setEntries(d.data.entries);
        setEditIdx(null);
        showSaveMsg('条目已保存');
      }
    } catch {} finally { setSaving(false); }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('确定删除此条目？')) return;
    try {
      const res = await fetch(`/api/rpg/lorebooks/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_entry', entryId }),
      });
      const d = await res.json();
      if (d.success) {
        setEntries(d.data.entries);
        if (editIdx !== null && entries[editIdx]?.id === entryId) {
          setEditIdx(null);
        }
        showSaveMsg('条目已删除');
      }
    } catch {}
  };

  const handleToggleEntry = async (entryId: string) => {
    try {
      const res = await fetch(`/api/rpg/lorebooks/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_entry', entryId }),
      });
      const d = await res.json();
      if (d.success) setEntries(d.data.entries);
    } catch {}
  };

  const filteredEntries = entries.filter(e =>
    !filterText || e.keys.some(k => k.toLowerCase().includes(filterText.toLowerCase()))
    || e.content.toLowerCase().includes(filterText.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="codex-skeleton" style={{ width: '80%', maxWidth: 700, height: 400, borderRadius: 8 }} />
      </div>
    );
  }

  if (!lorebook) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <p>世界书不存在</p>
        <Link href="/rpg/lorebooks" style={{ color: C.gold }}>回到列表</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 顶部导航 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/rpg/lorebooks" style={{ color: C.gold, fontSize: 14, textDecoration: 'none' }}>← 世界书</Link>
            <span style={{ color: C.textDim }}>/</span>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 16 }}>{lorebook.name}</span>
          </div>
          {saveMsg && (
            <span style={{ fontSize: 13, color: saveMsg.includes('删除') ? C.danger : C.success, animation: 'fadeIn 0.3s' }}>
              {saveMsg}
            </span>
          )}
        </div>

        {/* 元信息编辑 */}
        <div style={{
          padding: 16, borderRadius: 8, background: C.card,
          border: `1px solid ${C.border}`, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.textSec, marginBottom: 4 }}>名称</label>
              <input value={name} onChange={e => setName(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 14,
                }} />
            </div>
            <div style={{ flex: 2, minWidth: 300 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.textSec, marginBottom: 4 }}>描述</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 14,
                }} />
            </div>
            <div style={{ minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.textSec, marginBottom: 4 }}>
                推荐规则系统
                <span style={{ fontSize: 10, color: C.textDim, marginLeft: 4 }}>创建副本时自动填充</span>
              </label>
              <select value={system} onChange={e => setSystem(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 14,
                }}>
                <option value="custom">自由叙事</option>
                <option value="dnd5e">龙与地下城 5e</option>
                <option value="coc7th">克苏鲁的呼唤 7th</option>
                <option value="shadowrun">暗影狂奔</option>
              </select>
            </div>
            <button onClick={handleSaveMeta} disabled={saving}
              style={{
                padding: '8px 16px', borderRadius: 6, border: `1px solid ${C.goldDim}`,
                background: C.goldDim + '20', color: C.gold, cursor: 'pointer', fontSize: 13,
                marginTop: 18, flexShrink: 0,
              }}>
              保存信息
            </button>
          </div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>
            共 {entries.length} 条目 · {entries.filter(e => e.enabled).length} 启用 · {entries.filter(e => e.constant).length} 常驻
          </div>
        </div>

        {/* 工具栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <input value={filterText} onChange={e => setFilterText(e.target.value)}
            placeholder="搜索条目..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 6,
              background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 13,
            }} />
          <button onClick={handleAddEntry}
            className="codex-btn-gold" style={{
              padding: '8px 20px', borderRadius: 6, border: 'none',
              cursor: 'pointer', fontSize: 13, flexShrink: 0,
            }}>
            + 添加条目
          </button>
        </div>

        {/* 条目列表 */}
        <div style={{ display: 'grid', gap: 8 }}>
          {filteredEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim }}>
              <p style={{ fontSize: 13 }}>
                {entries.length === 0 ? '还没有条目，点击上方按钮添加' : '没有匹配的条目'}
              </p>
            </div>
          ) : filteredEntries.map((entry, idx) => {
            const realIdx = entries.findIndex(e => e.id === entry.id);
            const isEditing = editIdx === realIdx;

            return isEditing ? (
              <EntryEditor
                key={entry.id}
                entry={editEntry}
                onChange={setEditEntry}
                onSave={handleSaveEntry}
                onCancel={() => setEditIdx(null)}
                saving={saving}
              />
            ) : (
              <div key={entry.id} style={{
                padding: '12px 16px', borderRadius: 8, background: C.card,
                border: `1px solid ${C.border}`,
                opacity: entry.enabled ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      {entry.keys.map((k, ki) => (
                        <span key={ki} style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 12,
                          background: C.gold + '20', color: C.gold, fontFamily: "'DM Mono', monospace",
                        }}>
                          {k}
                        </span>
                      ))}
                      {entry.constant && (
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#8b5cf620', color: '#a78bfa' }}>
                          常驻
                        </span>
                      )}
                      {entry.selective && (
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#3b82f620', color: '#60a5fa' }}>
                          条件触发
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: 13, color: C.textSec, lineHeight: 1.5, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {entry.content}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 12 }}>
                    <button onClick={() => { setEditIdx(realIdx); setEditEntry(entry); }}
                      style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, background: 'transparent', border: `1px solid ${C.border}`, color: C.textDim, cursor: 'pointer' }}>
                      编辑
                    </button>
                    <button onClick={() => handleToggleEntry(entry.id)}
                      style={{ padding: '4px 8px', borderRadius: 4, fontSize: 11, background: 'transparent', border: `1px solid ${C.border}`, color: entry.enabled ? C.success : C.textDim, cursor: 'pointer' }}>
                      {entry.enabled ? '✓' : '○'}
                    </button>
                    <button onClick={() => handleDeleteEntry(entry.id)}
                      style={{ padding: '4px 8px', borderRadius: 4, fontSize: 11, background: 'transparent', border: `1px solid ${C.border}`, color: C.textDim, cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部提示 */}
        <div style={{ marginTop: 32, padding: 16, borderRadius: 8, background: C.card, border: `1px solid ${C.border}` }}>
          <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, color: C.gold, margin: '0 0 8px' }}>
            使用提示
          </h3>
          <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, margin: 0 }}>
            <strong>关键词</strong>：当玩家或 AI GM 的叙事中提到这些关键词时，对应的条目内容会被注入上下文。<br />
            <strong>常驻条目</strong>：始终注入 AI GM 上下文，适合核心世界设定。<br />
            <strong>条件触发</strong>：只有同时提到主关键词和副关键词时才触发。<br />
            <strong>优先级</strong>：数值越高越优先注入（上下文窗口有限时高优先级条目优先）。
          </p>
        </div>
      </div>
    </div>
  );
}

/** 条目编辑器组件 */
function EntryEditor({ entry, onChange, onSave, onCancel, saving }: {
  entry: LorebookEntry;
  onChange: (e: LorebookEntry) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const addKey = () => onChange({ ...entry, keys: [...entry.keys, ''] });
  const removeKey = (idx: number) => {
    const keys = entry.keys.filter((_, i) => i !== idx);
    onChange({ ...entry, keys: keys.length > 0 ? keys : [''] });
  };
  const updateKey = (idx: number, val: string) => {
    const keys = [...entry.keys];
    keys[idx] = val;
    onChange({ ...entry, keys });
  };

  return (
    <div style={{
      padding: 16, borderRadius: 8, background: C.card,
      border: `1px solid ${C.gold}`,
    }}>
      {/* 关键词 */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, color: C.textSec, marginBottom: 6 }}>
          关键词（触发此条目的关键字）
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {entry.keys.map((k, i) => (
            <div key={i} style={{ display: 'flex', gap: 2 }}>
              <input value={k} onChange={e => updateKey(i, e.target.value)}
                placeholder="关键词"
                style={{
                  width: 120, padding: '6px 10px', borderRadius: 4,
                  background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13,
                  fontFamily: "'DM Mono', monospace",
                }} />
              {entry.keys.length > 1 && (
                <button onClick={() => removeKey(i)}
                  style={{ padding: '6px 8px', borderRadius: 4, background: 'transparent', border: `1px solid ${C.border}`, color: C.textDim, cursor: 'pointer', fontSize: 11 }}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button onClick={addKey}
            style={{ padding: '6px 10px', borderRadius: 4, background: 'transparent', border: `1px solid ${C.border}`, color: C.textDim, cursor: 'pointer', fontSize: 12 }}>
            + 关键词
          </button>
        </div>
      </div>

      {/* 内容 */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, color: C.textSec, marginBottom: 6 }}>
          条目内容（AI GM 会读取这段信息来丰富叙事）
        </label>
        <textarea value={entry.content} onChange={e => onChange({ ...entry, content: e.target.value })}
          placeholder="描述这个世界设定、人物、地点或物品..."
          rows={5}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 6,
            background: C.inputBg, border: `1px solid ${C.border}`, color: C.text,
            fontSize: 13, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit',
          }} />
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
          {entry.content.length} 字
        </div>
      </div>

      {/* 选项 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.textSec, cursor: 'pointer' }}>
          <input type="checkbox" checked={entry.constant} onChange={e => onChange({ ...entry, constant: e.target.checked })}
            style={{ accentColor: C.gold }} />
          常驻（始终注入上下文）
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.textSec, cursor: 'pointer' }}>
          <input type="checkbox" checked={entry.selective} onChange={e => onChange({ ...entry, selective: e.target.checked })}
            style={{ accentColor: C.gold }} />
          条件触发
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: C.textSec }}>优先级:</span>
          <input type="number" value={entry.priority} min={0} max={100}
            onChange={e => onChange({ ...entry, priority: parseInt(e.target.value) || 0 })}
            style={{
              width: 60, padding: '4px 8px', borderRadius: 4,
              background: C.inputBg, border: `1px solid ${C.border}`, color: C.text,
              fontSize: 13, fontFamily: "'DM Mono', monospace", textAlign: 'center',
            }} />
        </div>
      </div>

      {/* 按钮 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSave} disabled={saving}
          className="codex-btn-gold" style={{
            padding: '8px 20px', borderRadius: 6, border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
            opacity: saving ? 0.5 : 1,
          }}>
          {saving ? '保存中...' : '保存条目'}
        </button>
        <button onClick={onCancel}
          style={{
            padding: '8px 16px', borderRadius: 6, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textDim, cursor: 'pointer', fontSize: 13,
          }}>
          取消
        </button>
      </div>
    </div>
  );
}
