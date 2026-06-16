'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
  inputBg: '#1a1a20', danger: '#ef4444', success: '#22c55e',
  fateSuccess: '#22c55e', fateFail: '#ef4444', fateCritical: '#a855f7', fateMixed: '#eab308',
};

const SYS_LABEL: Record<string, string> = {
  dnd5e: 'D&D 5e', coc7th: 'CoC 7th', shadowrun: '暗影狂奔', custom: '自由',
};

const ACTION_BUTTONS = [
  { key: 'combat_attack', label: '⚔️ 攻击', color: '#ef4444' },
  { key: 'combat_defend', label: '🛡️ 防御', color: '#3b82f6' },
  { key: 'persuade_neutral', label: '💬 说服', color: '#22c55e' },
  { key: 'stealth', label: '🏃 潜行', color: '#8b5cf6' },
  { key: 'search', label: '🔍 搜索', color: '#eab308' },
  { key: 'perception', label: '👁️ 感知', color: '#06b6d4' },
  { key: 'deceive', label: '🎭 欺骗', color: '#ec4899' },
  { key: 'bargain', label: '💰 交易', color: '#f59e0b' },
  { key: 'healing', label: '💊 治疗', color: '#10b981' },
  { key: 'knowledge', label: '📚 知识', color: '#6366f1' },
  { key: 'climb', label: '🧗 攀爬', color: '#78716c' },
  { key: 'lockpick', label: '🔓 开锁', color: '#a78bfa' },
  { key: 'breakthrough_minor', label: '✨ 修炼', color: '#c084fc' },
  { key: 'breakthrough_major', label: '⚡ 渡劫', color: '#f472b6' },
  { key: 'alchemy', label: '🧪 炼丹', color: '#14b8a6' },
  { key: 'crafting', label: '⚒️ 锻造', color: '#fb923c' },
];

const DEGREE_LABELS: Record<string, { text: string; color: string; icon: string }> = {
  critical_success: { text: '大成功', color: C.fateCritical, icon: '🌟' },
  success: { text: '成功', color: C.fateSuccess, icon: '✓' },
  mixed: { text: '勉强成功', color: C.fateMixed, icon: '~' },
  failure: { text: '失败', color: C.fateFail, icon: '✗' },
  critical_failure: { text: '大失败', color: '#dc2626', icon: '💀' },
};

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const chatEnd = useRef<HTMLDivElement>(null);

  const [campaign, setCampaign] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showDice, setShowDice] = useState(false);
  const [diceExpr, setDiceExpr] = useState('D20');
  const [diceResult, setDiceResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [assetLinks, setAssetLinks] = useState<any[]>([]);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [linkType, setLinkType] = useState<'character' | 'lorebook'>('character');
  const [linkSearch, setLinkSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Fate Formula state
  const [fateActionType, setFateActionType] = useState<string | null>(null);
  const [fateDifficulty, setFateDifficulty] = useState<number>(1.0);
  const [fateMods, setFateMods] = useState<any>(null);
  const [fateModsLoading, setFateModsLoading] = useState(false);
  const [lastFateResult, setLastFateResult] = useState<any>(null);
  const [showFatePanel, setShowFatePanel] = useState(false);
  const [showActionButtons, setShowActionButtons] = useState(false);

  const loadCampaign = async () => {
    try {
      const res = await fetch(`/api/rpg/campaigns/${params.id}`);
      const d = await res.json();
      if (d.success) {
        setCampaign(d.data);
        setMessages(d.data.messages || []);
        setSession(d.data.session);
        setMembers(d.data.members || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCampaign(); }, [params.id]);

  // Load asset links
  const loadAssetLinks = async () => {
    try {
      const res = await fetch(`/api/rpg/asset-links?sourceType=module&sourceId=${params.id}`);
      const d = await res.json();
      if (d.success) setAssetLinks(d.data || []);
    } catch {}
  };

  useEffect(() => { if (params.id) loadAssetLinks(); }, [params.id]);

  // Load fate mods when character is selected
  useEffect(() => {
    const memberChar = members.find(m => m.character_id);
    if (!memberChar?.character_id || !params.id) return;

    const loadFateMods = async () => {
      setFateModsLoading(true);
      try {
        const res = await fetch(`/api/rpg/fate?characterId=${memberChar.character_id}&campaignId=${params.id}`);
        const d = await res.json();
        if (d.success) setFateMods(d.data);
      } catch {}
      setFateModsLoading(false);
    };
    loadFateMods();
  }, [members, params.id]);

  const handleLinkSearch = async () => {
    if (!linkSearch.trim()) return;
    setSearching(true);
    try {
      if (linkType === 'character') {
        const res = await fetch(`/api/rpg/characters?search=${encodeURIComponent(linkSearch.trim())}`);
        const d = await res.json();
        setSearchResults(d.success ? (d.data || []) : []);
      } else {
        const res = await fetch(`/api/rpg/lorebooks?search=${encodeURIComponent(linkSearch.trim())}`);
        const d = await res.json();
        setSearchResults(d.success ? (d.data || []) : []);
      }
    } catch {} finally {
      setSearching(false);
    }
  };

  const handleCreateLink = async (linkedId: string) => {
    try {
      const res = await fetch('/api/rpg/asset-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'module', sourceId: params.id,
          linkedType: linkType, linkedId, role: '',
        }),
      });
      const d = await res.json();
      if (d.success) {
        loadAssetLinks();
        setSearchResults(prev => prev.filter((r: any) => r.id !== linkedId));
      }
    } catch {}
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await fetch(`/api/rpg/asset-links/${linkId}`, { method: 'DELETE' });
      setAssetLinks(prev => prev.filter(l => l.id !== linkId));
    } catch {}
  };

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendAction = async () => {
    if (!action.trim() || processing) return;
    setProcessing(true);
    setError('');

    const memberChar = members.find(m => m.character_id);
    const characterId = memberChar?.character_id || undefined;

    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      role: 'player',
      content: action.trim(),
      msg_type: 'action',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    const savedAction = action.trim();
    setAction('');

    try {
      const res = await fetch(`/api/rpg/campaigns/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: savedAction,
          characterId,
          fateActionType: fateActionType || undefined,
          fateDifficulty: fateDifficulty !== 1.0 ? fateDifficulty : undefined,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        setMessages(prev => [...prev, ...(d.data?.message ? [d.data.message] : [])]);
        if (d.data?.diceRolls?.length > 0) {
          setDiceResult(d.data.diceRolls);
          setTimeout(() => setDiceResult(null), 5000);
        }
        // Show fate result
        if (d.data?.fateResult) {
          setLastFateResult(d.data.fateResult);
          setShowFatePanel(true);
          setTimeout(() => setLastFateResult(null), 15000);
        }
        // Clear action type after send
        setFateActionType(null);
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        setError(d.error || 'AI GM 响应失败');
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setError('网络错误，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleDiceRoll = async () => {
    try {
      const res = await fetch('/api/rpg/dice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: diceExpr }),
      });
      const d = await res.json();
      if (d.success) {
        setDiceResult([{ expression: diceExpr, detail: d.data.detail, total: d.data.total }]);
        const diceMsg = {
          id: 'dice-' + Date.now(),
          role: 'system',
          content: `🎲 掷骰 **${diceExpr}** → **${d.data.total}** (${d.data.detail})`,
          msg_type: 'dice',
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, diceMsg]);
        setTimeout(() => setDiceResult(null), 8000);
      }
    } catch {}
  };

  const handleSave = async () => {
    try {
      await fetch(`/api/rpg/campaigns/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      alert('存档成功！');
    } catch {
      alert('存档失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAction();
    }
  };

  const selectActionType = (key: string) => {
    setFateActionType(prev => prev === key ? null : key);
    setShowActionButtons(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="codex-skeleton" style={{ width: '80%', maxWidth: 600, height: 400, borderRadius: 8 }} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <p>战役不存在</p>
        <Link href="/rpg" style={{ color: C.gold }}>回到酒馆</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/rpg"
            className="nav-back-btn"
            style={{
              color: C.gold,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              padding: '6px 14px',
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
          <span style={{ color: C.textDim }}>/</span>
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 15 }}>
            {campaign.name}
          </span>
          <span className="codex-pill" style={{ fontSize: 11, padding: '2px 8px' }}>{SYS_LABEL[campaign.system] || campaign.system}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleSave}
            style={{ padding: '4px 12px', borderRadius: 4, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.textDim, fontSize: 12 }}>
            💾 存档
          </button>
          <button onClick={() => setShowSidebar(!showSidebar)}
            style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.textDim, fontSize: 12 }}>
            {showSidebar ? '▸' : '◂'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Chat/Narrative Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textDim }}>
                <p style={{ fontSize: 28, marginBottom: 12 }}>🏰</p>
                <p style={{ fontSize: 15, marginBottom: 8, color: C.textSec }}>
                  AI GM 正在准备你的冒险...
                </p>
                <p style={{ fontSize: 13 }}>
                  输入你的第一个行动开始冒险吧！
                </p>
                {campaign.world_brief && (
                  <div style={{
                    margin: '20px auto', maxWidth: 480, padding: 16, borderRadius: 8,
                    background: C.card, border: `1px solid ${C.border}`, textAlign: 'left',
                  }}>
                    <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, color: C.gold, margin: '0 0 8px' }}>
                      世界设定
                    </h3>
                    <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {campaign.world_brief}
                    </p>
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id || i} style={{
                marginBottom: 12,
                display: 'flex',
                justifyContent: msg.role === 'player' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 16px',
                  borderRadius: msg.role === 'player' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: msg.role === 'player' ? C.goldDim + '25' :
                              msg.role === 'system' ? C.border :
                              C.card,
                  border: msg.role === 'gm' ? `1px solid ${C.border}` : 'none',
                }}>
                  {msg.role === 'gm' && (
                    <div style={{ fontSize: 11, color: C.gold, marginBottom: 4, fontWeight: 600 }}>
                      🏰 AI GM
                    </div>
                  )}
                  {msg.role === 'system' && (
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>
                      {msg.msg_type === 'dice' ? '🎲 掷骰' : '📋 系统'}
                    </div>
                  )}
                  <div style={{
                    fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                    color: msg.role === 'player' ? C.gold : C.text,
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 4, textAlign: 'right' }}>
                    {new Date(msg.created_at || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>

          {/* Fate Result Popup */}
          {lastFateResult && (
            <div style={{
              margin: '0 16px 8px',
              padding: '12px 16px',
              borderRadius: 8,
              background: C.card,
              border: `2px solid ${DEGREE_LABELS[lastFateResult.degree]?.color || C.border}`,
              animation: 'fadeIn 0.3s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: DEGREE_LABELS[lastFateResult.degree]?.color }}>
                  {DEGREE_LABELS[lastFateResult.degree]?.icon} 命运判定：{DEGREE_LABELS[lastFateResult.degree]?.text}
                </span>
                <button onClick={() => { setLastFateResult(null); setShowFatePanel(false); }}
                  style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>
                  ×
                </button>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: C.textSec }}>
                <span>成功率: <strong style={{ color: C.text }}>{lastFateResult.finalRate}%</strong></span>
                <span>掷骰: <strong style={{ color: lastFateResult.success ? C.fateSuccess : C.fateFail }}>{lastFateResult.roll}</strong></span>
                <span>难度: {lastFateResult.difficulty}x</span>
                {lastFateResult.breakdown?.playerMods?.length > 0 && (
                  <span>玩家修正: {lastFateResult.playerMod > 0 ? '+' : ''}{lastFateResult.playerMod}</span>
                )}
                {lastFateResult.breakdown?.worldMods?.length > 0 && (
                  <span>世界修正: {lastFateResult.worldMod > 0 ? '+' : ''}{lastFateResult.worldMod}</span>
                )}
              </div>
              {lastFateResult.breakdown?.playerMods?.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: C.textDim }}>
                  {lastFateResult.breakdown.playerMods.map((m: any, i: number) => (
                    <span key={i} style={{ marginRight: 8 }}>
                      {m.source} <span style={{ color: m.value > 0 ? C.fateSuccess : C.fateFail }}>{m.value > 0 ? '+' : ''}{m.value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Input Area */}
          <div style={{
            borderTop: `1px solid ${C.border}`, padding: '12px 16px',
            background: C.bg,
          }}>
            {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{error}</div>}
            {diceResult && (
              <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(Array.isArray(diceResult) ? diceResult : [diceResult]).map((r: any, i: number) => (
                  <div key={i} style={{
                    padding: '6px 12px', borderRadius: 6, background: C.card,
                    border: `1px solid ${C.goldDim}`, fontSize: 13, color: C.gold,
                  }}>
                    🎲 {r.expression} → <strong>{r.total}</strong>
                    <span style={{ color: C.textDim, fontSize: 11, marginLeft: 6 }}>{r.detail}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Type Buttons */}
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setShowActionButtons(!showActionButtons)}
                style={{
                  padding: '4px 10px', borderRadius: 4,
                  border: `1px solid ${fateActionType ? C.gold : C.border}`,
                  background: fateActionType ? C.goldDim + '20' : 'transparent',
                  color: fateActionType ? C.gold : C.textDim,
                  cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap',
                }}>
                🎯 {fateActionType ? ACTION_BUTTONS.find(b => b.key === fateActionType)?.label?.replace(/^[^\s]+\s/, '') : '行动类型'}
              </button>
              {fateActionType && (
                <span style={{ fontSize: 11, color: C.textSec }}>
                  基础成功率: {(() => {
                    const btn = ACTION_BUTTONS.find(b => b.key === fateActionType);
                    const rates: Record<string, number> = {
                      combat_attack: 60, combat_defend: 50, persuade_neutral: 50, stealth: 55,
                      search: 30, perception: 55, deceive: 45, bargain: 40, healing: 55,
                      knowledge: 50, climb: 50, lockpick: 40, breakthrough_minor: 70,
                      breakthrough_major: 10, alchemy: 40, crafting: 45,
                    };
                    return rates[fateActionType] || 50;
                  })()}%
                </span>
              )}
              <div style={{ flex: 1 }} />
              {/* Difficulty selector */}
              <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: C.textDim, marginRight: 4 }}>难度</span>
                {[
                  { v: 1.5, l: '简' },
                  { v: 1.2, l: '易' },
                  { v: 1.0, l: '常' },
                  { v: 0.8, l: '难' },
                  { v: 0.6, l: '极' },
                ].map(d => (
                  <button key={d.v} onClick={() => setFateDifficulty(d.v)}
                    style={{
                      padding: '2px 6px', borderRadius: 3, fontSize: 10,
                      border: `1px solid ${fateDifficulty === d.v ? C.gold : C.border}`,
                      background: fateDifficulty === d.v ? C.goldDim + '20' : 'transparent',
                      color: fateDifficulty === d.v ? C.gold : C.textDim,
                      cursor: 'pointer',
                    }}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Expanded Action Buttons */}
            {showActionButtons && (
              <div style={{
                marginBottom: 8, padding: 8, borderRadius: 6,
                background: C.card, border: `1px solid ${C.border}`,
                display: 'flex', flexWrap: 'wrap', gap: 4,
              }}>
                {ACTION_BUTTONS.map(btn => (
                  <button key={btn.key} onClick={() => selectActionType(btn.key)}
                    style={{
                      padding: '4px 10px', borderRadius: 4, fontSize: 11,
                      border: `1px solid ${fateActionType === btn.key ? btn.color : C.border}`,
                      background: fateActionType === btn.key ? btn.color + '20' : 'transparent',
                      color: fateActionType === btn.key ? btn.color : C.textDim,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>
                    {btn.label}
                  </button>
                ))}
                <button onClick={() => { setFateActionType(null); setShowActionButtons(false); }}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 11,
                    border: `1px solid ${C.border}`, background: 'transparent',
                    color: C.textDim, cursor: 'pointer',
                  }}>
                  ✕ 清除
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={action}
                onChange={e => setAction(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={fateActionType
                  ? `描述你的${ACTION_BUTTONS.find(b => b.key === fateActionType)?.label?.replace(/^[^\s]+\s/, '') || ''}行动... (Enter 发送)`
                  : '输入你的行动... (按 Enter 发送，Shift+Enter 换行)'}
                rows={2}
                disabled={processing}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 8,
                  background: C.inputBg, border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 14, resize: 'none',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={handleSendAction} disabled={processing || !action.trim()}
                  style={{
                    padding: '10px 16px', borderRadius: 6, border: 'none',
                    cursor: (processing || !action.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: 13, opacity: (processing || !action.trim()) ? 0.5 : 1, flex: 1,
                    whiteSpace: 'nowrap',
                    background: `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`,
                    color: '#0b0b0f', fontWeight: 600,
                  }}>
                  {processing ? '思考中...' : '发送'}
                </button>
                <button onClick={() => setShowDice(!showDice)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`,
                    cursor: 'pointer', background: 'transparent', color: C.textDim, fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}>
                  🎲 掷骰
                </button>
              </div>
            </div>

            {/* Dice Roller */}
            {showDice && (
              <div style={{
                marginTop: 8, padding: 12, borderRadius: 8,
                background: C.card, border: `1px solid ${C.border}`,
                display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 13, color: C.textSec }}>🎲 表达式:</span>
                <input value={diceExpr} onChange={e => setDiceExpr(e.target.value)}
                  style={{
                    width: 120, padding: '6px 10px', borderRadius: 4,
                    background: C.inputBg, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 14, fontFamily: "'DM Mono', monospace",
                  }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {['D20', '2D6', 'D100', 'D20+5'].map(e => (
                    <button key={e} onClick={() => setDiceExpr(e)}
                      style={{
                        padding: '4px 8px', borderRadius: 4, border: `1px solid ${C.border}`,
                        cursor: 'pointer', background: diceExpr === e ? C.goldDim + '30' : 'transparent',
                        color: diceExpr === e ? C.gold : C.textDim, fontSize: 12, fontFamily: "'DM Mono', monospace",
                      }}>
                      {e}
                    </button>
                  ))}
                </div>
                <button onClick={handleDiceRoll}
                  style={{
                    padding: '6px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13,
                    background: `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`,
                    color: '#0b0b0f', fontWeight: 600,
                  }}>
                  掷骰
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div style={{
            width: 240, borderLeft: `1px solid ${C.border}`,
            padding: 12, overflowY: 'auto', flexShrink: 0,
            display: 'none',
          } as any}
            className="sidebar-panel">

            {/* Fate Mods Panel */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 13, color: C.gold, margin: '0 0 8px', letterSpacing: '0.5px' }}>
                ⚖️ 命运修正
              </h3>
              {fateModsLoading ? (
                <div style={{ fontSize: 11, color: C.textDim }}>加载中...</div>
              ) : fateMods ? (
                <div style={{
                  padding: 8, borderRadius: 6, background: C.card,
                  border: `1px solid ${C.border}`, fontSize: 11,
                }}>
                  {fateMods.playerMods?.length > 0 ? (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ color: C.textSec, marginBottom: 3, fontWeight: 600 }}>玩家修正</div>
                      {fateMods.playerMods.map((m: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: C.textDim }}>
                          <span>{m.source}</span>
                          <span style={{ color: m.value > 0 ? C.fateSuccess : C.fateFail }}>
                            {m.value > 0 ? '+' : ''}{m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {fateMods.worldMods?.length > 0 ? (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ color: C.textSec, marginBottom: 3, fontWeight: 600 }}>世界修正</div>
                      {fateMods.worldMods.map((m: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: C.textDim }}>
                          <span>{m.source}</span>
                          <span style={{ color: m.value > 0 ? C.fateSuccess : C.fateFail }}>
                            {m.value > 0 ? '+' : ''}{m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div style={{
                    borderTop: `1px solid ${C.border}`, paddingTop: 4, marginTop: 2,
                    display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span style={{ color: C.textSec, fontWeight: 600 }}>总修正</span>
                    <span style={{
                      color: fateMods.totalMod > 0 ? C.fateSuccess : fateMods.totalMod < 0 ? C.fateFail : C.textDim,
                      fontWeight: 600,
                    }}>
                      {fateMods.totalMod > 0 ? '+' : ''}{fateMods.totalMod}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: C.textDim }}>未绑定角色</div>
              )}
            </div>

            {/* Members */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 13, color: C.gold, margin: '0 0 8px', letterSpacing: '0.5px' }}>
                冒险者
              </h3>
              {members.filter(m => m.role === 'player').map(m => (
                <div key={m.user_id} style={{
                  padding: 8, borderRadius: 6, background: C.card,
                  border: `1px solid ${C.border}`, marginBottom: 4,
                }}>
                  <div style={{ fontSize: 13, color: C.text }}>{m.character_name || m.nickname || m.username}</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>{m.role}</div>
                </div>
              ))}
            </div>

            {/* Campaign Info */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 13, color: C.gold, margin: '0 0 8px', letterSpacing: '0.5px' }}>
                战役信息
              </h3>
              <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.8 }}>
                <div>系统: {SYS_LABEL[campaign.system] || campaign.system}</div>
                {session && <div>进度: 第 {session.session_number} 章</div>}
                <div>状态: {campaign.status}</div>
                <div>消息: {messages.length}</div>
              </div>
            </div>

            {/* Quick Dice */}
            <div>
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 13, color: C.gold, margin: '0 0 8px', letterSpacing: '0.5px' }}>
                快速掷骰
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {[{e: 'D20', l: 'D20'}, {e: 'D20+5', l: 'D20+5'}, {e: '2D6', l: '2D6'}, {e: 'D100', l: 'D100'}].map(q => (
                  <button key={q.e} onClick={() => { setDiceExpr(q.e); setShowDice(true); }}
                    style={{
                      padding: '6px', borderRadius: 4, border: `1px solid ${C.border}`,
                      cursor: 'pointer', background: 'transparent', color: C.textDim,
                      fontSize: 12, fontFamily: "'DM Mono', monospace", textAlign: 'center',
                    }}>
                    {q.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Links */}
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 13, color: C.gold, margin: '0 0 8px', letterSpacing: '0.5px' }}>
                关联资产
                <button onClick={() => setShowLinkPanel(!showLinkPanel)}
                  style={{ marginLeft: 8, fontSize: 11, color: C.goldDim, background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showLinkPanel ? '收起' : '+ 添加'}
                </button>
              </h3>
              {assetLinks.length === 0 ? (
                <p style={{ fontSize: 12, color: C.textDim }}>暂无关联资产</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {assetLinks.map((link: any) => (
                    <div key={link.id} style={{
                      padding: '6px 8px', borderRadius: 4, background: C.card,
                      border: `1px solid ${C.border}`, fontSize: 12,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{
                        fontSize: 10, padding: '1px 4px', borderRadius: 3,
                        background: link.linked_type === 'character' ? '#c9a55c20' : '#1e3a5f30',
                        color: link.linked_type === 'character' ? C.gold : '#6b9fff',
                      }}>
                        {link.linked_type === 'character' ? '人物' : '世界书'}
                      </span>
                      <span style={{ flex: 1, color: C.text }}>{link.linked_name || '未知'}</span>
                      <button onClick={() => handleDeleteLink(link.id)}
                        style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showLinkPanel && (
                <div style={{
                  marginTop: 8, padding: 8, borderRadius: 6,
                  background: C.bg, border: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <button onClick={() => { setLinkType('character'); setSearchResults([]); }}
                      style={{
                        flex: 1, padding: '4px 8px', borderRadius: 4, fontSize: 11,
                        background: linkType === 'character' ? C.goldDim + '30' : 'transparent',
                        border: `1px solid ${linkType === 'character' ? C.goldDim : C.border}`,
                        color: linkType === 'character' ? C.gold : C.textDim, cursor: 'pointer',
                      }}>
                      人物卡
                    </button>
                    <button onClick={() => { setLinkType('lorebook'); setSearchResults([]); }}
                      style={{
                        flex: 1, padding: '4px 8px', borderRadius: 4, fontSize: 11,
                        background: linkType === 'lorebook' ? C.goldDim + '30' : 'transparent',
                        border: `1px solid ${linkType === 'lorebook' ? C.goldDim : C.border}`,
                        color: linkType === 'lorebook' ? C.gold : C.textDim, cursor: 'pointer',
                      }}>
                      世界书
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLinkSearch()}
                      placeholder="搜索名称..."
                      style={{
                        flex: 1, padding: '4px 8px', borderRadius: 4, fontSize: 12,
                        background: C.inputBg, border: `1px solid ${C.border}`, color: C.text,
                        outline: 'none',
                      }} />
                    <button onClick={handleLinkSearch} disabled={searching}
                      style={{
                        padding: '4px 10px', borderRadius: 4, border: 'none',
                        cursor: 'pointer', fontSize: 11,
                        background: `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`,
                        color: '#0b0b0f', fontWeight: 600,
                      }}>
                      搜索
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 160, overflowY: 'auto' }}>
                      {searchResults.map((r: any) => (
                        <div key={r.id} style={{
                          padding: '4px 8px', borderRadius: 4, background: C.card,
                          border: `1px solid ${C.border}`, fontSize: 11,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <span style={{ flex: 1, color: C.text }}>{r.name}</span>
                          <button onClick={() => handleCreateLink(r.id)}
                            style={{ padding: '2px 8px', borderRadius: 3, background: C.goldDim + '30', border: `1px solid ${C.goldDim}`, color: C.gold, cursor: 'pointer', fontSize: 11 }}>
                            + 关联
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .sidebar-panel { display: block !important; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}