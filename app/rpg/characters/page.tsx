'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  bg: 'var(--codex-bg)', card: 'var(--codex-bg-card)', border: 'var(--codex-border)',
  gold: 'var(--codex-gold)', goldDim: 'var(--codex-gold)',
  text: 'var(--codex-text)', textSec: 'var(--codex-text-dim)', textDim: 'var(--codex-text-muted)',
  danger: 'var(--codex-red)', purple: 'var(--codex-purple)',
};

const SYS_LABEL: Record<string, string> = {
  dnd5e: 'D&D 5e', coc7th: 'CoC 7th', shadowrun: '暗影狂奔', custom: '自由',
};

export default function CharacterListPage() {
  const [tab, setTab] = useState<'owned' | 'purchased'>('owned');
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSystem, setNewSystem] = useState('custom');
  const [newCharType, setNewCharType] = useState('dedicated');
  const [creating, setCreating] = useState(false);

  const loadList = async (t?: string) => {
    setLoading(true);
    try {
      const currentTab = t || tab;
      const res = await fetch(`/api/rpg/characters?tab=${currentTab}`);
      const d = await res.json();
      if (d.success) setCharacters(d.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadList(); }, []);

  const handleTabChange = (t: 'owned' | 'purchased') => {
    setTab(t);
    loadList(t);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rpg/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), system: newSystem, char_type: newCharType }),
      });
      const d = await res.json();
      if (d.success) {
        setShowCreate(false);
        setNewName('');
        setNewSystem('custom');
        setNewCharType('dedicated');
        setTab('owned');
        loadList('owned');
      }
    } catch {} finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除角色卡「${name}」？此操作不可撤销。`)) return;
    try {
      const res = await fetch(`/api/rpg/characters/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) loadList();
    } catch {}
  };

  const CHAR_TYPE_LABEL: Record<string, string> = {
    universal: '通用', dedicated: '专属',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* 导航 */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/rpg"
            className="nav-back-btn"
            style={{
              color: C.gold,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              padding: '8px 18px',
              borderRadius: 6,
              background: 'var(--codex-gold-glow)',
              border: '1px solid var(--codex-border-gold)',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}>
            ← 回到酒馆
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 24, marginBottom: 4 }}>
              ✦ 角色工坊
            </h1>
            <p style={{ color: C.textSec, fontSize: 14 }}>
              管理你创建的角色卡和购买的角色资产
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {tab === 'owned' && (
              <>
                <button onClick={() => setShowCreate(!showCreate)}
                  style={{
                    padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                    background: 'transparent', border: `1px solid ${C.border}`, color: C.textSec,
                  }}>
                  {showCreate ? '取消' : '✦ 快速创建'}
                </button>
                <Link href="/rpg/characters/create"
                  style={{
                    padding: '8px 20px', borderRadius: 6,
                    background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
                    color: '#0b0b0f', textDecoration: 'none', fontSize: 14, fontWeight: 600,
                  }}>
                  完整创建 →
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 标签页 */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          {([
            { key: 'owned' as const, label: '我的角色' },
            { key: 'purchased' as const, label: '已购买' },
          ]).map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              style={{
                padding: '10px 20px', cursor: 'pointer', fontSize: 14,
                background: 'transparent', border: 'none',
                color: tab === t.key ? C.gold : C.textDim,
                borderBottom: tab === t.key ? `2px solid ${C.gold}` : '2px solid transparent',
                transition: 'all 0.2s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 快速创建面板 */}
        {tab === 'owned' && showCreate && (
          <div style={{
            padding: 20, borderRadius: 8, background: C.card,
            border: `1px solid ${C.border}`, marginBottom: 24,
          }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>角色名 *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="例如：流浪剑客、暗影法师..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6,
                  background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 14,
                }} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>规则系统</label>
                <select value={newSystem} onChange={e => setNewSystem(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 6,
                    background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 14,
                  }}>
                  <option value="custom">自由叙事</option>
                  <option value="dnd5e">龙与地下城 5e</option>
                  <option value="coc7th">克苏鲁的呼唤 7th</option>
                  <option value="shadowrun">暗影狂奔</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>角色类型</label>
                <select value={newCharType} onChange={e => setNewCharType(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 6,
                    background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 14,
                  }}>
                  <option value="dedicated">专属角色</option>
                  <option value="universal">通用角色</option>
                </select>
              </div>
            </div>
            <button onClick={handleCreate} disabled={creating || !newName.trim()}
              style={{
                padding: '10px 24px', borderRadius: 6, border: 'none',
                cursor: (creating || !newName.trim()) ? 'not-allowed' : 'pointer',
                fontSize: 14, opacity: (creating || !newName.trim()) ? 0.5 : 1,
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
                color: '#0b0b0f', fontWeight: 600,
              }}>
              {creating ? '创建中...' : '快速创建'}
            </button>
          </div>
        )}

        {/* 列表 */}
        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 80, borderRadius: 8, background: C.card }} />
            ))}
          </div>
        ) : characters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textDim }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>✦</p>
            <p style={{ fontSize: 15, marginBottom: 8, color: C.textSec }}>
              {tab === 'purchased' ? '还没有购买过角色卡' : '还没有角色卡'}
            </p>
            <p style={{ fontSize: 13 }}>
              {tab === 'purchased' ? (
                <Link href="/rpg/market" style={{ color: C.gold }}>去异界世场逛逛</Link>
              ) : '创建你的第一个角色，或是去市场购买其他创作者的优秀角色'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {characters.map((ch: any) => {
              const isPurchased = tab === 'purchased' || !!ch._purchased;
              return (
                <div key={ch.id} style={{
                  padding: 16, borderRadius: 8, background: C.card,
                  border: `1px solid ${isPurchased ? C.purple + '30' : C.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Link href={`/rpg/characters/${ch.id}`}
                        style={{ color: C.gold, fontSize: 16, fontFamily: "'Fraunces', Georgia, serif", textDecoration: 'none' }}>
                        {ch.name}
                      </Link>
                      {isPurchased && (
                        <span style={{
                          padding: '1px 8px', borderRadius: 4, fontSize: 11,
                          background: C.purple + '20', color: C.purple,
                        }}>
                          已购买
                        </span>
                      )}
                      {ch.char_type && (
                        <span style={{ fontSize: 11, color: C.textDim }}>
                          {CHAR_TYPE_LABEL[ch.char_type] || ch.char_type}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 6, display: 'flex', gap: 12 }}>
                      <span>🎲 {SYS_LABEL[ch.system] || ch.system}</span>
                      {ch.download_count > 0 && <span>⬇ {ch.download_count}</span>}
                      {ch.seed_price > 0 && <span>🌱 {ch.seed_price}</span>}
                      <span>更新于 {ch.updated_at ? new Date(ch.updated_at).toLocaleDateString('zh-CN') : '—'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Link href={`/rpg/characters/${ch.id}`}
                      style={{
                        padding: '6px 14px', borderRadius: 4, fontSize: 12,
                        background: C.goldDim + '20', border: `1px solid ${C.goldDim}`,
                        color: C.gold, textDecoration: 'none',
                      }}>
                      查看
                    </Link>
                    {!isPurchased && (
                      <button onClick={() => handleDelete(ch.id, ch.name)}
                        style={{
                          padding: '6px 10px', borderRadius: 4, fontSize: 12,
                          background: 'transparent', border: `1px solid ${C.border}`,
                          color: C.textDim, cursor: 'pointer',
                        }}>
                        删除
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
