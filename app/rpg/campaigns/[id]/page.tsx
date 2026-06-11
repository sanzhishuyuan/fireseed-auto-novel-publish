'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
  inputBg: '#1a1a20', danger: '#ef4444', success: '#22c55e',
};

const SYS_LABEL: Record<string, string> = {
  dnd5e: 'D&D 5e', coc7th: 'CoC 7th', shadowrun: '暗影狂奔', custom: '自由',
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

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendAction = async () => {
    if (!action.trim() || processing) return;
    setProcessing(true);
    setError('');

    const memberChar = members.find(m => m.character_id);
    const characterId = memberChar?.character_id || undefined;

    // 添加玩家消息到本地
    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      role: 'player',
      content: action.trim(),
      msg_type: 'action',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setAction('');

    try {
      const res = await fetch(`/api/rpg/campaigns/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.trim(), characterId }),
      });
      const d = await res.json();
      if (d.success) {
        // 替换乐观消息为服务器消息
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        setMessages(prev => [...prev, ...(d.data?.message ? [d.data.message] : [])]);
        if (d.data?.diceRolls?.length > 0) {
          setDiceResult(d.data.diceRolls);
          setTimeout(() => setDiceResult(null), 5000);
        }
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
        // 添加骰子消息到聊天
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
      // 简单的反馈
      setError('');
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
          <Link href="/rpg" style={{ color: C.gold, fontSize: 13, textDecoration: 'none' }}>← 酒馆</Link>
          <span style={{ color: C.textDim }}>/</span>
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 15 }}>
            {campaign.name}
          </span>
          <span className="codex-pill" style={{ fontSize: 11, padding: '2px 8px' }}>{SYS_LABEL[campaign.system] || campaign.system}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleSave}
            className="codex-btn-ghost" style={{ padding: '4px 12px', borderRadius: 4, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.textDim, fontSize: 12 }}>
            💾 存档
          </button>
          <button onClick={() => setShowSidebar(!showSidebar)}
            className="codex-btn-ghost" style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.textDim, fontSize: 12 }}>
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

          {/* Action Input */}
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

            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={action}
                onChange={e => setAction(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的行动... (按 Enter 发送，Shift+Enter 换行)"
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
                  className="codex-btn-gold" style={{
                    padding: '10px 16px', borderRadius: 6, border: 'none',
                    cursor: (processing || !action.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: 13, opacity: (processing || !action.trim()) ? 0.5 : 1, flex: 1,
                    whiteSpace: 'nowrap',
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
                  className="codex-btn-gold" style={{
                    padding: '6px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13,
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
            display: 'none', // 移动端默认隐藏
          } as any}
            className="sidebar-panel">
            {/* 角色信息 */}
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

            {/* 战役信息 */}
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

            {/* 快速掷骰 */}
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
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .sidebar-panel { display: block !important; }
        }
      `}</style>
    </div>
  );
}
