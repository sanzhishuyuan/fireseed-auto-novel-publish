'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: 'var(--codex-bg)', card: 'var(--codex-bg-card)', border: 'var(--codex-border)',
  gold: 'var(--codex-gold)', goldDim: 'var(--codex-gold)',
  text: 'var(--codex-text)', textSec: 'var(--codex-text-dim)', textDim: 'var(--codex-text-muted)',
  inputBg: 'var(--codex-input-bg)', danger: 'var(--codex-red)',
};

const SYSTEMS = [
  { id: 'dnd5e', label: '龙与地下城 5e', desc: '经典的奇幻冒险，D20 检定' },
  { id: 'coc7th', label: '克苏鲁的呼唤 7th', desc: '恐怖调查，D100 技能检定' },
  { id: 'custom', label: '自由叙事', desc: '无固定规则，纯 AI 驱动' },
];

const ATTR_LABELS: Record<string, string[]> = {
  dnd5e: ['力量', '敏捷', '体质', '智力', '感知', '魅力'],
  coc7th: ['力量', '体质', '体型', '敏捷', '外貌', '智力', '意志', '教育'],
  custom: ['力量', '敏捷', '智力', '魅力'],
};

export default function CreateCharacterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'basics' | 'attributes' | 'story'>('basics');
  const [system, setSystem] = useState('dnd5e');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [attributes, setAttributes] = useState<Record<string, number>>({});
  const [backstory, setBackstory] = useState('');
  const [charType, setCharType] = useState<'universal' | 'dedicated'>('dedicated');

  // 初始化属性
  const initAttrs = (sys: string) => {
    const labels = ATTR_LABELS[sys] || ATTR_LABELS.custom;
    const attrs: Record<string, number> = {};
    labels.forEach(l => { attrs[l] = 10; });
    // DnD 使用标准属性分配 (27点购点法简化版)
    if (sys === 'dnd5e') {
      labels.forEach(l => { attrs[l] = 8; });
    }
    setAttributes(attrs);
  };

  const handleSystemChange = (sys: string) => {
    setSystem(sys);
    initAttrs(sys);
  };

  // 初始化
  useState(() => { initAttrs(system); });

  const handleCreate = async () => {
    if (!name.trim()) { setError('请输入角色名'); return; }
    setLoading(true);
    setError('');

    const trpg = system !== 'custom' ? {
      system,
      level: 1,
      attributes,
      skills: {},
      hp: { current: 10, max: 10 },
      equipment: [],
      spells: [],
      backstory,
      inventory: [],
    } : undefined;

    // DnD HP 按体质调整
    if (system === 'dnd5e') {
      const con = attributes['体质'] || 10;
      const conMod = Math.floor((con - 10) / 2);
      if (trpg) { trpg.hp = { current: 10 + conMod, max: 10 + conMod }; }
    }
    // CoC HP = (体质+体型)/10
    if (system === 'coc7th') {
      const con = attributes['体质'] || 10;
      const siz = attributes['体型'] || 10;
      const hp = Math.floor((con + siz) / 10);
      if (trpg) { trpg.hp = { current: hp, max: hp }; }
    }

    try {
      const res = await fetch('/api/rpg/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          system,
          description: description.trim(),
          personality: personality.trim(),
          trpg,
          char_type: charType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/rpg/characters/${data.data.id}`);
      } else {
        setError(data.error || '创建失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const renderAttrRow = (label: string) => {
    const val = attributes[label] || 8;
    const mod = Math.floor((val - 10) / 2);
    return (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 48, fontSize: 13, color: C.text }}>{label}</span>
        <button onClick={() => setAttributes(a => ({ ...a, [label]: Math.max(3, (a[label] || 8) - 1) }))}
          style={{ background: C.border, border: 'none', color: C.text, width: 28, height: 28, borderRadius: 4, cursor: 'pointer' }}>−</button>
        <span style={{ width: 36, textAlign: 'center', fontSize: 16, fontWeight: 600, color: C.gold }}>{val}</span>
        <button onClick={() => setAttributes(a => ({ ...a, [label]: Math.min(20, (a[label] || 8) + 1) }))}
          style={{ background: C.border, border: 'none', color: C.text, width: 28, height: 28, borderRadius: 4, cursor: 'pointer' }}>+</button>
        <span style={{ fontSize: 12, color: C.textDim }}>调整值: {mod >= 0 ? `+${mod}` : mod}</span>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* 顶部导航 */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/rpg/characters"
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
            ← 回到角色工坊
          </Link>
        </div>

        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 24, marginBottom: 4 }}>
          创建角色
        </h1>
        <p style={{ color: C.textSec, fontSize: 14, marginBottom: 24 }}>
          塑造你的冒险者——从名字到命运，一切由你决定
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: `1px solid ${C.border}` }}>
          {[
            { key: 'basics', label: '基本信息' },
            { key: 'attributes', label: '属性' },
            { key: 'story', label: '背景故事' },
          ].map(s => (
            <button key={s.key} onClick={() => setStep(s.key as any)}
              style={{
                padding: '8px 20px', background: 'transparent', border: 'none',
                color: step === s.key ? C.gold : C.textSec, cursor: 'pointer', fontSize: 13,
                borderBottom: step === s.key ? `2px solid ${C.gold}` : '2px solid transparent',
              }}>
              {s.label}
            </button>
          ))}
        </div>

        {error && <div className="codex-tip warn" style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 6 }}>{error}</div>}

        {/* Step 1: Basics */}
        {step === 'basics' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>角色名 *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="codex-input" placeholder="输入你的角色名..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>规则系统</label>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {SYSTEMS.map(s => (
                  <button key={s.id} onClick={() => handleSystemChange(s.id)}
                    style={{
                      padding: 12, borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                      background: system === s.id ? C.goldDim + '30' : C.card,
                      border: system === s.id ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                      color: system === s.id ? C.gold : C.textSec,
                      transition: 'all 0.2s',
                    }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 12 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>外貌描述</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="codex-input" placeholder="你的角色长什么样？像是年龄、身高、发型、服饰..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>性格特征</label>
              <textarea value={personality} onChange={e => setPersonality(e.target.value)}
                className="codex-input" placeholder="你的角色性格是怎样的？勇敢？谨慎？幽默？冷漠？"
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>角色类型</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setCharType('dedicated')}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                    background: charType === 'dedicated' ? C.goldDim + '30' : C.card,
                    border: charType === 'dedicated' ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                    color: charType === 'dedicated' ? C.gold : C.textSec,
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>专用角色</div>
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>仅限本人创建的异时空使用</div>
                </button>
                <button type="button" onClick={() => setCharType('universal')}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                    background: charType === 'universal' ? C.goldDim + '30' : C.card,
                    border: charType === 'universal' ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                    color: charType === 'universal' ? C.gold : C.textSec,
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>通用角色</div>
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>可在市场公开，被他人副本引用</div>
                </button>
              </div>
            </div>

            <button onClick={() => setStep('attributes')}
              className="codex-btn-gold" style={{ padding: '10px 24px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14 }}>
              下一步：属性
            </button>
          </div>
        )}

        {/* Step 2: Attributes */}
        {step === 'attributes' && (
          <div>
            <p style={{ color: C.textSec, fontSize: 13, marginBottom: 16 }}>
              {system === 'dnd5e' ? '分配你的属性值 (购点法: 每个属性最低 8，最高 20)' :
               system === 'coc7th' ? '分配你的属性值 (3D6 或 4D6D1 生成法简化版)' :
               '自由分配属性值'}
            </p>

            <div style={{ background: C.card, borderRadius: 8, padding: 16, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              {(ATTR_LABELS[system] || ATTR_LABELS.custom).map(renderAttrRow)}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('basics')}
                className="codex-btn-ghost" style={{ padding: '10px 24px', borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.text }}>
                上一步
              </button>
              <button onClick={() => setStep('story')}
                className="codex-btn-gold" style={{ padding: '10px 24px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14 }}>
                下一步：背景故事
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Story */}
        {step === 'story' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 6 }}>背景故事</label>
              <textarea value={backstory} onChange={e => setBackstory(e.target.value)}
                className="codex-input" placeholder="你的角色来自哪里？有着怎样的过去？为什么踏上冒险？..."
                rows={6}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('attributes')}
                className="codex-btn-ghost" style={{ padding: '10px 24px', borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.text }}>
                上一步
              </button>
              <button onClick={handleCreate} disabled={loading}
                className="codex-btn-gold" style={{ padding: '10px 24px', borderRadius: 6, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, opacity: loading ? 0.6 : 1 }}>
                {loading ? '创建中...' : '✦ 完成创建'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
