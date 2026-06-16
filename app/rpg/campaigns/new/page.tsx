'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24', inputBg: '#1a1a20',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
  purple: '#a78bfa',
};

const SYS_LABEL: Record<string, string> = {
  dnd5e: '龙与地下城 5e', coc7th: '克苏鲁的呼唤 7th', shadowrun: '暗影狂奔', custom: '自由叙事',
};

function NewCampaignForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedChar = searchParams.get('character') || '';

  const [name, setName] = useState('');
  const [system, setSystem] = useState('custom');
  const [worldBrief, setWorldBrief] = useState('');
  const [characterId, setCharacterId] = useState(preselectedChar);
  const [lorebookId, setLorebookId] = useState('');
  const [characters, setCharacters] = useState<any[]>([]);
  const [lorebooks, setLorebooks] = useState<any[]>([]);
  const [selectedLorebook, setSelectedLorebook] = useState<any>(null);
  const [linkedNPCs, setLinkedNPCs] = useState<any[]>([]);
  const [loadingNPCs, setLoadingNPCs] = useState(false);
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

  // 选择世界书后，自动填充规则系统、世界设定，并加载关联的 NPC
  const handleLorebookSelect = async (lbId: string) => {
    setLorebookId(lbId);
    setSelectedLorebook(null);
    setLinkedNPCs([]);

    if (!lbId) return;

    // 获取世界书详情
    try {
      const res = await fetch(`/api/rpg/lorebooks/${lbId}`);
      const d = await res.json();
      if (d.success && d.data) {
        const lb = d.data;
        setSelectedLorebook(lb);

        // 自动填充规则系统（如果世界书指定了推荐系统且不是 custom）
        if (lb.system && lb.system !== 'custom') {
          setSystem(lb.system);
        }

        // 自动填充世界设定（用世界书的描述）
        if (lb.description && !worldBrief.trim()) {
          setWorldBrief(lb.description);
        }

        // 加载世界书关联的角色（通过 asset-links）
        setLoadingNPCs(true);
        try {
          const linkRes = await fetch(`/api/rpg/asset-links?sourceType=lorebook&sourceId=${lbId}`);
          if (linkRes.ok) {
            const linkData = await linkRes.json();
            if (linkData.success) {
              const charLinks = (linkData.data || []).filter((l: any) => l.linked_type === 'character');
              setLinkedNPCs(charLinks);
            }
          }
        } catch {} finally { setLoadingNPCs(false); }
      }
    } catch {}
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('请输入副本名称'); return; }
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
          <Link href="/rpg"
            className="nav-back-btn"
            style={{
              color: C.gold,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              padding: '8px 18px',
              borderRadius: 6,
              background: `${C.gold}10`,
              border: `1px solid ${C.gold}40`,
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}>
            ← 回到酒馆
          </Link>
        </div>

        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 24, marginBottom: 4 }}>
          开始新的冒险
        </h1>
        <p style={{ color: C.textSec, fontSize: 14, marginBottom: 24 }}>
          选定世界书，AI GM 将为你编织故事
        </p>

        {error && <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 6, background: '#ef444420', color: '#ef4444', fontSize: 13 }}>{error}</div>}

        {/* Step 1: 副本名称 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>
            <span style={{ color: C.gold, marginRight: 6 }}>1.</span>副本名称 *
          </label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="例如：失落的矿坑、暗影中的低语..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }} />
        </div>

        {/* Step 2: 选择世界书 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>
            <span style={{ color: C.gold, marginRight: 6 }}>2.</span>选择世界书
            <span style={{ fontSize: 11, color: C.textDim, marginLeft: 8 }}>AI GM 会引用世界书中的条目来丰富叙事</span>
          </label>
          {lorebooks.length === 0 ? (
            <div style={{ padding: '10px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 13, color: C.textDim, margin: 0 }}>
                还没有世界书
                <Link href="/rpg/lorebooks" style={{ color: C.gold, marginLeft: 8 }}>去创建</Link>
                <Link href="/rpg/market" style={{ color: C.gold, marginLeft: 8 }}>去异界世场逛逛</Link>
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              <button onClick={() => { setLorebookId(''); setSelectedLorebook(null); setLinkedNPCs([]); }}
                style={{
                  padding: '8px 14px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                  background: !lorebookId ? C.goldDim + '30' : C.card,
                  border: !lorebookId ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                  color: !lorebookId ? C.gold : C.textSec, fontSize: 13,
                }}>
                不使用世界书
              </button>
              {lorebooks.map((lb: any) => (
                <button key={lb.id} onClick={() => handleLorebookSelect(lorebookId === lb.id ? '' : lb.id)}
                  style={{
                    padding: '8px 14px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    background: lorebookId === lb.id ? C.goldDim + '30' : C.card,
                    border: lorebookId === lb.id ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                    color: lorebookId === lb.id ? C.gold : C.textSec, fontSize: 13,
                  }}>
                  📖 {lb.name}
                  <span style={{ fontSize: 11, color: C.textDim, marginLeft: 8 }}>{lb.entry_count || 0} 条目</span>
                  {lb.system && lb.system !== 'custom' && (
                    <span style={{ fontSize: 11, color: C.purple, marginLeft: 8 }}>
                      {SYS_LABEL[lb.system] || lb.system}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 世界书选中后自动展开的信息面板 */}
        {selectedLorebook && (
          <div style={{
            marginBottom: 20, padding: 16, borderRadius: 8,
            background: C.gold + '08', border: `1px solid ${C.goldDim}30`,
          }}>
            <div style={{ fontSize: 12, color: C.gold, marginBottom: 8, fontWeight: 500 }}>
              📖 已选择: {selectedLorebook.name}
            </div>

            {/* 自动填充的规则系统 */}
            {selectedLorebook.system && selectedLorebook.system !== 'custom' && (
              <div style={{ fontSize: 12, color: C.textSec, marginBottom: 6 }}>
                规则系统: <span style={{ color: C.purple }}>{SYS_LABEL[selectedLorebook.system] || selectedLorebook.system}</span>
                <span style={{ color: C.textDim, marginLeft: 8 }}>(已自动设置)</span>
              </div>
            )}

            {/* 关联的 NPC */}
            {loadingNPCs ? (
              <div style={{ fontSize: 12, color: C.textDim }}>加载关联角色中...</div>
            ) : linkedNPCs.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: C.textSec, marginBottom: 6 }}>
                  关联角色 ({linkedNPCs.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {linkedNPCs.map((npc: any) => (
                    <span key={npc.id} style={{
                      padding: '4px 10px', borderRadius: 4, fontSize: 12,
                      background: C.purple + '15', border: `1px solid ${C.purple}30`,
                      color: C.purple,
                    }}>
                      🎭 {npc.linked_name || npc.linked_id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: 规则系统（可手动覆写） */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>
            <span style={{ color: C.gold, marginRight: 6 }}>3.</span>规则系统
            <span style={{ fontSize: 11, color: C.textDim, marginLeft: 8 }}>
              {lorebookId ? '可手动覆写世界书推荐的规则系统' : '决定骰子和判定方式'}
            </span>
          </label>
          <select value={system} onChange={e => setSystem(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 14 }}>
            <option value="custom">自由叙事</option>
            <option value="dnd5e">龙与地下城 5e</option>
            <option value="coc7th">克苏鲁的呼唤 7th</option>
            <option value="shadowrun">暗影狂奔</option>
          </select>
        </div>

        {/* 世界设定（当不使用世界书时显示，使用世界书时自动填充） */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>
            世界设定{lorebookId ? '（已自动填充）' : '（可选）'}
          </label>
          <textarea value={worldBrief} onChange={e => setWorldBrief(e.target.value)}
            placeholder="描述你的世界背景、时代、核心冲突...&#10;AI GM 会以此为基础生成故事。"
            rows={3}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 6,
              background: lorebookId ? C.gold + '05' : C.card,
              border: `1px solid ${lorebookId ? C.goldDim + '30' : C.border}`,
              color: C.text, fontSize: 14, resize: 'vertical',
            }} />
        </div>

        {/* Step 4: 选择角色 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>
            <span style={{ color: C.gold, marginRight: 6 }}>4.</span>选择角色（可选）
          </label>
          {characters.length === 0 ? (
            <p style={{ color: C.textDim, fontSize: 13 }}>还没有角色，可以在冒险开始后创建</p>
          ) : (
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {characters.map((ch: any) => {
                const isLinkedNPC = linkedNPCs.some(n => n.linked_id === ch.id);
                return (
                  <button key={ch.id} onClick={() => setCharacterId(characterId === ch.id ? '' : ch.id)}
                    style={{
                      padding: '10px 14px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                      background: characterId === ch.id ? C.goldDim + '30' : C.card,
                      border: characterId === ch.id ? `1px solid ${C.gold}` : `1px solid ${isLinkedNPC ? C.purple + '30' : C.border}`,
                      color: characterId === ch.id ? C.gold : C.textSec, fontSize: 14,
                    }}>
                    🎭 {ch.name}
                    {isLinkedNPC && (
                      <span style={{
                        marginLeft: 6, padding: '0px 6px', borderRadius: 3, fontSize: 10,
                        background: C.purple + '20', color: C.purple,
                      }}>
                        推荐
                      </span>
                    )}
                  </button>
                );
              })}
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
