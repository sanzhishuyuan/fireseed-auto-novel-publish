'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24', inputBg: '#1a1a20',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
};

function NewCampaignForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedChar = searchParams.get('character') || '';

  const [name, setName] = useState('');
  const [system, setSystem] = useState('dnd5e');
  const [worldBrief, setWorldBrief] = useState('');
  const [characterId, setCharacterId] = useState(preselectedChar);
  const [lorebookId, setLorebookId] = useState('');
  const [characters, setCharacters] = useState<any[]>([]);
  const [lorebooks, setLorebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/rpg/characters').then(r => r.json()).then(d => {
      if (d.success) setCharacters(d.data || []);
    });
    fetch('/api/rpg/lorebooks').then(r => r.json()).then(d => {
      if (d.success) setLorebooks(d.data || []);
    }).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setError('请输入战役名称'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/rpg/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          mode: 'solo',
          system,
          world_brief: worldBrief.trim(),
          character_id: characterId || undefined,
          lorebook_id: lorebookId || undefined,
        }),
      });
      const d = await res.json();
      if (d.success) {
        router.push(`/rpg/campaigns/${d.data.id}`);
      } else {
        setError(d.error || '创建失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div style={{ marginBottom: 24 }}>
          <Link href="/rpg" style={{ color: C.gold, fontSize: 14, textDecoration: 'none' }}>← 返回酒馆</Link>
        </div>

        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 24, marginBottom: 4 }}>
          开始新的冒险
        </h1>
        <p style={{ color: C.textSec, fontSize: 14, marginBottom: 24 }}>
          设定你的战役世界，AI GM 将为你编织故事
        </p>

        {error && <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 6, background: '#ef444420', color: '#ef4444', fontSize: 13 }}>{error}</div>}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>战役名称 *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="例如：失落的矿坑、暗影中的低语..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>规则系统</label>
          <select value={system} onChange={e => setSystem(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }}>
            <option value="dnd5e">龙与地下城 5e</option>
            <option value="coc7th">克苏鲁的呼唤 7th</option>
            <option value="custom">自由叙事</option>
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>世界设定（可选）</label>
          <textarea value={worldBrief} onChange={e => setWorldBrief(e.target.value)}
            placeholder="描述你的世界背景、时代、核心冲突...&#10;AI GM 会以此为基础生成故事。"
            rows={4}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, resize: 'vertical' }} />
        </div>

        {/* 世界书选择 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>
            世界书（可选）
            <span style={{ fontSize: 11, color: C.textDim, marginLeft: 8 }}>AI GM 会引用世界书中的条目来丰富叙事</span>
          </label>
          {lorebooks.length === 0 ? (
            <div style={{ padding: '10px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 13, color: C.textDim, margin: 0 }}>
                还没有世界书
                <Link href="/rpg/lorebooks" style={{ color: C.gold, marginLeft: 8 }}>去创建</Link>
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              <button onClick={() => setLorebookId('')}
                style={{
                  padding: '8px 14px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                  background: !lorebookId ? C.goldDim + '30' : C.card,
                  border: !lorebookId ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                  color: !lorebookId ? C.gold : C.textSec, fontSize: 13,
                }}>
                不使用世界书
              </button>
              {lorebooks.map((lb: any) => (
                <button key={lb.id} onClick={() => setLorebookId(lorebookId === lb.id ? '' : lb.id)}
                  style={{
                    padding: '8px 14px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    background: lorebookId === lb.id ? C.goldDim + '30' : C.card,
                    border: lorebookId === lb.id ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                    color: lorebookId === lb.id ? C.gold : C.textSec, fontSize: 13,
                  }}>
                  📖 {lb.name}
                  <span style={{ fontSize: 11, color: C.textDim, marginLeft: 8 }}>{lb.entry_count || 0} 条目</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>选择角色（可选）</label>
          {characters.length === 0 ? (
            <p style={{ color: C.textDim, fontSize: 13 }}>还没有角色，可以在冒险开始后创建</p>
          ) : (
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {characters.map((ch: any) => (
                <button key={ch.id} onClick={() => setCharacterId(characterId === ch.id ? '' : ch.id)}
                  style={{
                    padding: '10px 14px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    background: characterId === ch.id ? C.goldDim + '30' : C.card,
                    border: characterId === ch.id ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                    color: characterId === ch.id ? C.gold : C.textSec, fontSize: 14,
                  }}>
                  🎭 {ch.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SEED 费用提示 */}
        <div style={{
          padding: '10px 14px', borderRadius: 6, background: C.gold + '10',
          border: `1px solid ${C.goldDim}40`, marginBottom: 16, fontSize: 13, color: C.textSec,
        }}>
          🌱 AI GM 每次响应消耗 2 SEED。首次体验可免费使用。
        </div>

        <button onClick={handleCreate} disabled={loading}
          style={{
            padding: '12px 32px', borderRadius: 6, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 15, opacity: loading ? 0.6 : 1,
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`, color: '#0b0b0f', fontWeight: 600,
          }}>
          {loading ? '创建中...' : '⚔️ 开始冒险'}
        </button>
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 400, height: 300, borderRadius: 8, background: C.card }} />
      </div>
    }>
      <NewCampaignForm />
    </Suspense>
  );
}
