'use client';

/**
 * 回合制战斗 UI 组件
 * 接入后端 combat API，提供完整的战斗界面
 */
import { useState, useEffect, useCallback } from 'react';
import { C } from './theme';

interface CombatParticipant {
  id: string;
  name: string;
  isPlayer: boolean;
  agility: number;
  health: number;
  maxHealth: number;
  statusEffects: Array<{ name: string; duration: number; modValue: number; type: 'buff' | 'debuff' }>;
}

interface CombatState {
  id: string;
  campaignId: string;
  participants: CombatParticipant[];
  turnOrder: string[];
  currentTurn: number;
  round: number;
  status: 'active' | 'ended';
  log: string[];
}

interface CombatUIProps {
  campaignId: string;
  characterId?: string;
  characterName?: string;
  onCombatEnd?: () => void;
}

// HP 条组件
function HealthBar({ current, max, isPlayer }: { current: number; max: number; isPlayer: boolean }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const color = pct > 50 ? C.success : pct > 25 ? C.warning : C.danger;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 8, background: C.border, borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          transition: 'width 0.3s ease',
          borderRadius: 4,
        }} />
      </div>
      <span style={{ fontSize: 11, color: C.textSec, minWidth: 50, textAlign: 'right' }}>
        {current}/{max}
      </span>
    </div>
  );
}

// 状态效果图标
function StatusEffectBadge({ effect }: { effect: CombatParticipant['statusEffects'][0] }) {
  const isBuff = effect.type === 'buff';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: isBuff ? C.success + '20' : C.danger + '20',
      color: isBuff ? C.success : C.danger,
      border: `1px solid ${isBuff ? C.success : C.danger}40`,
    }}>
      {isBuff ? '↑' : '↓'} {effect.name} ({effect.duration})
    </span>
  );
}

// 参与者卡片
function ParticipantCard({ participant, isCurrentTurn }: {
  participant: CombatParticipant;
  isCurrentTurn: boolean;
}) {
  return (
    <div style={{
      padding: 12, borderRadius: 8,
      background: isCurrentTurn ? C.gold + '08' : C.card,
      border: `1px solid ${isCurrentTurn ? C.gold + '60' : C.border}`,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{participant.isPlayer ? '🧙' : '👹'}</span>
        <span style={{
          flex: 1, fontWeight: 600, fontSize: 13,
          color: participant.isPlayer ? C.gold : C.text,
        }}>
          {participant.name}
        </span>
        {isCurrentTurn && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 6px',
            background: C.gold, color: '#000', borderRadius: 4,
          }}>当前回合</span>
        )}
      </div>
      <HealthBar current={participant.health} max={participant.maxHealth} isPlayer={participant.isPlayer} />
      {participant.statusEffects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {participant.statusEffects.map((eff, i) => (
            <StatusEffectBadge key={i} effect={eff} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CombatUI({ campaignId, characterId, characterName, onCombatEnd }: CombatUIProps) {
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionDesc, setActionDesc] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [initMode, setInitMode] = useState(false);
  const [enemyNames, setEnemyNames] = useState('');

  // 获取战斗状态
  const fetchState = useCallback(async (combatId: string) => {
    try {
      const res = await fetch('/api/rpg/combat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'state', combatId }),
      });
      const d = await res.json();
      if (d.success) setCombat(d.data);
    } catch (e) {
      console.error('Failed to fetch combat state:', e);
    }
  }, []);

  // 初始化战斗
  const handleInitCombat = async () => {
    if (!enemyNames.trim()) return;
    setLoading(true);
    try {
      const enemies = enemyNames.split(/[,，、]/).map(n => n.trim()).filter(Boolean);
      const res = await fetch('/api/rpg/combat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'init',
          campaignId,
          players: [{ id: characterId || 'player', name: characterName || '冒险者' }],
          enemies: enemies.map((name, i) => ({ id: `enemy_${i}`, name })),
        }),
      });
      const d = await res.json();
      if (d.success) {
        setCombat(d.data);
        setInitMode(false);
        // 自动选中第一个敌人作为目标
        if (d.data.participants) {
          const firstEnemy = d.data.participants.find((p: CombatParticipant) => !p.isPlayer);
          if (firstEnemy) setSelectedTarget(firstEnemy.id);
        }
      }
    } catch (e) {
      console.error('Failed to init combat:', e);
    } finally {
      setLoading(false);
    }
  };

  // 执行回合
  const handleTurn = async (actionType: string) => {
    if (!combat || !selectedTarget) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rpg/combat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'turn',
          combatId: combat.id,
          action: {
            actorId: characterId || 'player',
            actionType,
            targetId: selectedTarget,
            description: actionDesc || `${actionType} 攻击`,
          },
          campaignId,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setCombat(prev => prev ? { ...prev, ...d.data } : d.data);
        setActionDesc('');
      }
    } catch (e) {
      console.error('Failed to execute turn:', e);
    } finally {
      setLoading(false);
    }
  };

  // 结束战斗
  const handleEndCombat = async () => {
    if (!combat) return;
    setLoading(true);
    try {
      await fetch('/api/rpg/combat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'end', combatId: combat.id }),
      });
      setCombat(null);
      onCombatEnd?.();
    } catch (e) {
      console.error('Failed to end combat:', e);
    } finally {
      setLoading(false);
    }
  };

  // 未进入战斗：显示开始战斗按钮
  if (!combat && !initMode) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setInitMode(true)} style={{
          width: '100%', padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
          background: C.danger + '18', border: `1px solid ${C.danger}40`,
          color: C.danger, fontWeight: 600, fontSize: 14,
        }}>
          ⚔️ 进入战斗
        </button>
      </div>
    );
  }

  // 初始化模式：输入敌人名称
  if (initMode && !combat) {
    return (
      <div style={{ padding: 16, background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>
          ⚔️ 开始战斗
        </div>
        <label style={{ display: 'block', fontSize: 12, color: C.textSec, marginBottom: 6 }}>
          敌人名称（逗号分隔）
        </label>
        <input
          value={enemyNames}
          onChange={e => setEnemyNames(e.target.value)}
          placeholder="哥布林, 兽人战士, 暗影法师"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 6, marginBottom: 12,
            background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleInitCombat} disabled={loading} style={{
            flex: 1, padding: '10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: loading ? C.textDim : C.danger, color: '#fff', fontWeight: 600,
          }}>
            {loading ? '初始化中...' : '开始战斗'}
          </button>
          <button onClick={() => setInitMode(false)} style={{
            padding: '10px 16px', borderRadius: 6, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${C.border}`, color: C.textSec,
          }}>
            取消
          </button>
        </div>
      </div>
    );
  }

  if (!combat) return null;

  const players = combat.participants.filter(p => p.isPlayer);
  const enemies = combat.participants.filter(p => !p.isPlayer);
  const currentPlayer = combat.participants.find(p => p.id === combat.turnOrder[combat.currentTurn % combat.turnOrder.length]);

  return (
    <div style={{
      background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
      overflow: 'hidden',
    }}>
      {/* 战斗头部 */}
      <div style={{
        padding: '12px 16px', background: C.danger + '10',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚔️</span>
          <span style={{ fontWeight: 700, color: C.danger }}>战斗中</span>
          <span style={{ fontSize: 12, color: C.textSec }}>第 {combat.round} 回合</span>
        </div>
        <button onClick={handleEndCombat} disabled={loading} style={{
          padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
          background: 'transparent', border: `1px solid ${C.border}`, color: C.textSec,
        }}>
          结束战斗
        </button>
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* 我方 */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.success, marginBottom: 8 }}>
            👥 我方
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map(p => (
              <ParticipantCard
                key={p.id}
                participant={p}
                isCurrentTurn={currentPlayer?.id === p.id}
              />
            ))}
          </div>
        </div>

        {/* 敌方 */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.danger, marginBottom: 8 }}>
            👹 敌方
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {enemies.map(p => (
              <div key={p.id}
                onClick={() => setSelectedTarget(p.id)}
                style={{ cursor: 'pointer' }}
              >
                <ParticipantCard
                  participant={p}
                  isCurrentTurn={currentPlayer?.id === p.id}
                />
                {selectedTarget === p.id && (
                  <div style={{
                    marginTop: 4, textAlign: 'center', fontSize: 11,
                    color: C.gold, fontWeight: 600,
                  }}>
                    ✓ 已选中目标
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 行动面板 */}
      {currentPlayer?.isPlayer && (
        <div style={{
          padding: 16, borderTop: `1px solid ${C.border}`,
          background: C.card,
        }}>
          <div style={{ fontSize: 12, color: C.textSec, marginBottom: 8 }}>
            你的行动{selectedTarget ? ` → 目标: ${enemies.find(e => e.id === selectedTarget)?.name}` : '（请先选择目标）'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { type: 'combat_attack', label: '⚔️ 攻击', color: C.danger },
              { type: 'combat_defend', label: '🛡️ 防御', color: C.info },
              { type: 'healing', label: '💚 治疗', color: C.success },
              { type: 'stealth', label: '🌑 潜行', color: C.purple },
            ].map(act => (
              <button key={act.type} onClick={() => handleTurn(act.type)}
                disabled={loading || !selectedTarget}
                style={{
                  padding: '10px 8px', borderRadius: 6, cursor: loading || !selectedTarget ? 'not-allowed' : 'pointer',
                  background: act.color + '18', border: `1px solid ${act.color}40`,
                  color: act.color, fontWeight: 600, fontSize: 12,
                  opacity: loading || !selectedTarget ? 0.5 : 1,
                }}>
                {act.label}
              </button>
            ))}
          </div>
          <input
            value={actionDesc}
            onChange={e => setActionDesc(e.target.value)}
            placeholder="描述你的行动（可选）..."
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 6,
              background: C.inputBg, border: `1px solid ${C.border}`, color: C.text,
              fontSize: 13, boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* 战斗日志 */}
      {combat.log && combat.log.length > 0 && (
        <div style={{
          padding: 16, borderTop: `1px solid ${C.border}`,
          maxHeight: 120, overflowY: 'auto',
        }}>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>战斗日志</div>
          {combat.log.slice(-5).map((entry, i) => (
            <div key={i} style={{ fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>
              {entry}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
