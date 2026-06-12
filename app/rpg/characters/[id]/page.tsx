'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
  inputBg: '#1a1a20',
};

const SYS_LABEL: Record<string, string> = {
  dnd5e: '龙与地下城 5e', coc7th: '克苏鲁的呼唤 7th',
  shadowrun: '暗影狂奔', custom: '自由叙事',
};

export default function CharacterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCharType, setEditCharType] = useState<'universal' | 'dedicated'>('dedicated');
  const [saving, setSaving] = useState(false);
  const [inboundLinks, setInboundLinks] = useState<any[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    fetch(`/api/rpg/characters/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCharacter(d.data);
          setEditName(d.data.card_data?.name || d.data.name);
          setEditDesc(d.data.card_data?.description || '');
          setEditCharType(d.data.char_type || 'dedicated');
        }
      })
      .finally(() => setLoading(false));

    // 加载反向引用（此角色被哪些副本/世界书引用）
    setLoadingLinks(true);
    fetch(`/api/rpg/asset-links?sourceType=character&sourceId=${params.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setInboundLinks(d.data || []); })
      .finally(() => setLoadingLinks(false));
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/rpg/characters/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc, char_type: editCharType }),
      });
      const d = await res.json();
      if (d.success) {
        setCharacter({ ...character, name: editName, char_type: editCharType, card_data: { ...character.card_data, name: editName, description: editDesc } });
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="codex-skeleton" style={{ width: 400, height: 300, borderRadius: 8 }} />
      </div>
    );
  }

  if (!character) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <p>角色不存在</p>
        <Link href="/rpg/characters" style={{ color: C.gold }}>返回角色工坊</Link>
      </div>
    );
  }

  const card = character.card_data || {};
  const trpg = card.trpg;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link href="/rpg" style={{ color: C.gold, fontSize: 14 }}>← 返回酒馆</Link>
          <span style={{ color: C.textDim }}>/</span>
          <span style={{ color: C.textSec, fontSize: 14 }}>角色</span>
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 32 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%', background: C.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0,
          }}>
            🎭
          </div>
          <div style={{ flex: 1 }}>
            {editing ? (
              <div>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="codex-input" style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, padding: '8px 12px', borderRadius: 6, fontSize: 20, marginBottom: 8, width: '100%' }} />
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  className="codex-input" rows={3}
                  style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, padding: '8px 12px', borderRadius: 6, width: '100%', marginBottom: 8, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: C.textSec }}>角色类型:</label>
                  <select value={editCharType} onChange={e => setEditCharType(e.target.value as any)}
                    style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, padding: '4px 8px', borderRadius: 4, fontSize: 13 }}>
                    <option value="dedicated">专用角色</option>
                    <option value="universal">通用角色</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSave} disabled={saving}
                    className="codex-btn-gold" style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13 }}>
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="codex-btn-ghost" style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.textSec, fontSize: 13 }}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 28, color: C.gold, margin: 0 }}>
                  {character.name}
                </h1>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ color: C.textSec, fontSize: 14 }}>
                    {SYS_LABEL[character.system] || character.system}
                    {trpg?.level ? ` · Lv.${trpg.level}` : ''}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: character.char_type === 'universal' ? '#c9a55c20' : C.border,
                    color: character.char_type === 'universal' ? C.gold : C.textDim,
                    border: `1px solid ${character.char_type === 'universal' ? C.goldDim : C.border}`,
                  }}>
                    {character.char_type === 'universal' ? '通用角色' : '专用角色'}
                  </span>
                </div>
                {card.description && <p style={{ color: C.textSec, fontSize: 14, marginTop: 8 }}>{card.description}</p>}
                <button onClick={() => setEditing(true)}
                  className="codex-btn-ghost" style={{ marginTop: 8, padding: '4px 12px', borderRadius: 4, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.textDim, fontSize: 12 }}>
                  ✎ 编辑
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Attributes */}
        {trpg?.attributes && (
          <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: C.gold, margin: '0 0 12px' }}>属性</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
              {Object.entries(trpg.attributes).map(([k, v]) => {
                const mod = Math.floor(((v as number) - 10) / 2);
                return (
                  <div key={k} style={{ textAlign: 'center', padding: 8, background: C.bg, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: C.gold }}>{v as number}</div>
                    <div style={{ fontSize: 11, color: C.textSec }}>{mod >= 0 ? `+${mod}` : mod}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HP */}
        {trpg?.hp && (
          <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: C.gold, margin: '0 0 12px' }}>生命值</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                flex: 1, height: 24, background: C.bg, borderRadius: 12, overflow: 'hidden', position: 'relative',
              }}>
                <div style={{
                  width: `${(trpg.hp.current / trpg.hp.max) * 100}%`, height: '100%',
                  background: trpg.hp.current > trpg.hp.max * 0.3 ? '#22c55e' : '#ef4444',
                  borderRadius: 12, transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{trpg.hp.current} / {trpg.hp.max}</span>
            </div>
          </div>
        )}

        {/* Personality & Backstory */}
        {card.personality && (
          <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: C.gold, margin: '0 0 8px' }}>性格</h3>
            <p style={{ color: C.textSec, fontSize: 14, margin: 0, lineHeight: 1.6 }}>{card.personality}</p>
          </div>
        )}

        {trpg?.backstory && (
          <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: C.gold, margin: '0 0 8px' }}>背景故事</h3>
            <p style={{ color: C.textSec, fontSize: 14, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{trpg.backstory}</p>
          </div>
        )}

        {/* 关联的异时空/副本 */}
        {inboundLinks.length > 0 && (
          <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: C.gold, margin: '0 0 12px' }}>
              关联的异时空 {loadingLinks && <span style={{ fontSize: 12, color: C.textDim }}>(加载中...)</span>}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inboundLinks.map((link: any) => (
                <div key={link.id} style={{
                  padding: '10px 14px', borderRadius: 6, background: C.bg,
                  border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 11, color: C.textDim, background: C.border, padding: '2px 6px', borderRadius: 4 }}>
                    {link.source_type === 'module' ? '副本' : link.source_type === 'lorebook' ? '世界书' : '人物卡'}
                  </span>
                  <span style={{ flex: 1, color: C.text, fontSize: 14 }}>{link.linked_name || '未知'}</span>
                  {link.linked_author && <span style={{ fontSize: 12, color: C.textDim }}>by {link.linked_author}</span>}
                  {link.role && <span style={{ fontSize: 12, color: C.goldDim }}>角色: {link.role}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Link href={`/rpg/campaigns/new?character=${params.id}`}
            className="codex-btn-gold" style={{ padding: '10px 24px', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
            ⚔️ 用此角色开始冒险
          </Link>
        </div>
      </div>
    </div>
  );
}
