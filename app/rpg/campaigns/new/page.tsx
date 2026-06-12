'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
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
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/rpg/characters').then(r => r.json()).then(d => {
      if (d.success) setCharacters(d.data || []);
    });
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setError('请输入异时空名称'); return; }
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
          <Link href="/rpg" style={{ color: C.gold, fontSize: 14 }}>← 返回酒馆</Link>
        </div>

        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 24, marginBottom: 4 }}>
          开始新的冒险
        </h1>
        <p style={{ color: C.textSec, fontSize: 14, marginBottom: 24 }}>
          设定你的异时空世界，AI GM 将为你编织故事
        </p>

        {error && <div className="codex-tip warn" style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 6 }}>{error}</div>}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>异时空名称 *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="codex-input" placeholder="例如：失落的矿坑、暗影中的低语..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>规则系统</label>
          <select value={system} onChange={e => setSystem(e.target.value)}
            className="codex-select" style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text }}>
            <option value="dnd5e">龙与地下城 5e</option>
            <option value="coc7th">克苏鲁的呼唤 7th</option>
            <option value="custom">自由叙事</option>
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>世界设定（可选）</label>
          <textarea value={worldBrief} onChange={e => setWorldBrief(e.target.value)}
            className="codex-input" placeholder="描述你的世界背景、时代、核心冲突...&#10;AI GM 会以此为基础生成故事。"
            rows={4}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text, resize: 'vertical' }} />
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
                    color: characterId === ch.id ? C.gold : C.textSec,
                  }}>
                  🎭 {ch.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleCreate} disabled={loading}
          className="codex-btn-gold" style={{ padding: '12px 32px', borderRadius: 6, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, opacity: loading ? 0.6 : 1 }}>
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
        <div className="codex-skeleton" style={{ width: 400, height: 300, borderRadius: 8 }} />
      </div>
    }>
      <NewCampaignForm />
    </Suspense>
  );
}
