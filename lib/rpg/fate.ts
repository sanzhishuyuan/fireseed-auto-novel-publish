/**
 * 命运公式引擎 — Fate Formula Engine
 *
 * 核心思想：将 AI 跑团的每次决策建模为可计算的函数
 * 结果 = F(玩家状态, 世界状态, 随机因子)
 *
 * 设计依据：命运公式设计思路 v1.0
 * 配合：人物卡 flags / dynamic_state / relationships + 副本 global_variables
 */

import db from '@/lib/db';

// ===== 类型定义 =====

export interface FateCheckParams {
  actionType: string;
  characterId: string;
  campaignId?: string;
  baseRate?: number;
  difficulty?: number;
  extraPlayerMod?: number;
  extraWorldMod?: number;
  targetNpcId?: string;
}

export interface FateCheckResult {
  success: boolean;
  finalRate: number;
  rawRate: number;
  roll: number;
  difficulty: number;
  playerMod: number;
  worldMod: number;
  degree: 'critical_success' | 'success' | 'mixed' | 'failure' | 'critical_failure';
  degreeDiff: number;
  breakdown: FateModBreakdown;
}

export interface FateModBreakdown {
  baseRate: number;
  playerMods: { source: string; value: number }[];
  worldMods: { source: string; value: number }[];
  difficulty: number;
}

// ===== 常量 =====

const DEFAULT_CONFIG = {
  defaultBaseRate: 50,
  minFinalRate: 5,
  maxFinalRate: 95,
  difficultyLimits: { min: 0.3, max: 2.0 },
  successDegreeThresholds: {
    critical_success: 30,
    success: 15,
    mixed: -15,
    failure: -30,
  },
};

export const ACTION_BASE_RATES: Record<string, number> = {
  persuade_neutral: 50,
  persuade_hostile: 20,
  persuade_friendly: 70,
  bargain: 40,
  intimidate: 35,
  deceive: 45,
  combat_attack: 60,
  combat_defend: 50,
  combat_critical: 10,
  stealth: 55,
  lockpick: 40,
  search: 30,
  trap_detect: 45,
  trap_disarm: 40,
  climb: 50,
  swim: 50,
  survival: 45,
  breakthrough_minor: 70,
  breakthrough_major: 10,
  alchemy: 40,
  crafting: 45,
  healing: 55,
  knowledge: 50,
  perception: 55,
  default: 50,
};

export const DIFFICULTY_TABLE: Record<string, number> = {
  trivial: 1.5,
  easy: 1.2,
  normal: 1.0,
  hard: 0.8,
  very_hard: 0.6,
  nearly_impossible: 0.4,
};

const REALM_VALUES: Record<string, number> = {
  '凡人': 0,
  '炼气一层': 1, '炼气二层': 2, '炼气三层': 3, '炼气四层': 4,
  '炼气五层': 5, '炼气六层': 6, '炼气七层': 7, '炼气八层': 8,
  '炼气九层': 9, '炼气十层': 10, '炼气十一层': 11, '炼气十二层': 12,
  '筑基初期': 20, '筑基中期': 25, '筑基后期': 30,
  '金丹初期': 50, '金丹中期': 60, '金丹后期': 70,
  '元婴初期': 100, '元婴中期': 120, '元婴后期': 140,
  '化神': 200,
};

// ===== 核心函数 =====

function getPlayerMods(characterId: string, targetNpcId?: string): { mods: { source: string; value: number }[]; total: number } {
  const mods: { source: string; value: number }[] = [];

  const char = db.prepare('SELECT card_data, name FROM rpg_characters WHERE id = ?').get(characterId) as any;
  if (!char) return { mods, total: 0 };

  let cardData: any;
  try { cardData = JSON.parse(char.card_data); } catch { return { mods, total: 0 }; }

  const trpg = cardData.trpg || cardData.extensions?.trpg || {};
  const dynamicState = trpg.dynamic_state || {};
  const flags = trpg.flags || {};
  const relationships = trpg.relationships || [];
  const attributes = trpg.attributes || {};

  // 修为修正
  if (dynamicState.cultivation?.realm) {
    const realm = dynamicState.cultivation.realm;
    const realmValue = dynamicState.cultivation.realm_value || REALM_VALUES[realm] || 0;
    const mod = realmValue * 2;
    mods.push({ source: `修为:${realm}`, value: mod });
  }

  // 声望修正
  if (dynamicState.reputation !== undefined) {
    const mod = Math.floor(dynamicState.reputation / 10);
    if (mod !== 0) mods.push({ source: `声望:${dynamicState.reputation}`, value: mod });
  }

  // 属性修正
  if (Object.keys(attributes).length > 0) {
    const values = Object.values(attributes) as number[];
    const maxAttr = Math.max(...values);
    const attrMod = Math.floor(maxAttr / 4);
    if (attrMod > 0) mods.push({ source: '属性加成', value: attrMod });
  }

  // Flag 修正
  if (flags.has_master_sword || flags.has_duanlan_sword) {
    mods.push({ source: 'flag:拥有名剑', value: 10 });
  }
  if (flags.cursed) {
    const curseLevel = typeof flags.cursed === 'number' ? flags.cursed : (flags.cursed ? 1 : 0);
    mods.push({ source: `flag:诅咒(Lv${curseLevel})`, value: -5 * curseLevel });
  }
  if (flags.poisoned) {
    mods.push({ source: 'flag:中毒', value: -10 });
  }
  if (flags.master_revenge_pending) {
    mods.push({ source: 'flag:复仇执念', value: 5 });
  }

  // 关系修正
  if (targetNpcId && relationships.length > 0) {
    const rel = relationships.find((r: any) => r.target === targetNpcId);
    if (rel) {
      const mod = Math.floor(rel.value / 5);
      if (mod !== 0) mods.push({ source: `关系:${targetNpcId}(${rel.value})`, value: mod });
    }
  }

  const total = mods.reduce((sum, m) => sum + m.value, 0);
  return { mods, total };
}

function getWorldMods(campaignId?: string): { mods: { source: string; value: number }[]; total: number } {
  const mods: { source: string; value: number }[] = [];
  if (!campaignId) return { mods, total: 0 };

  // 优先从 rpg_campaign_state 读取全局变量
  try {
    const stateRow = db.prepare('SELECT variables FROM rpg_campaign_state WHERE campaign_id = ?').get(campaignId) as any;
    if (stateRow?.variables) {
      const vars = JSON.parse(stateRow.variables);
      for (const [key, value] of Object.entries(vars)) {
        if (typeof value === 'number') {
          const mod = Math.floor(value / 10) - 5;
          if (mod !== 0) mods.push({ source: `世界:${key}`, value: mod });
        }
      }
      const total = mods.reduce((sum, m) => sum + m.value, 0);
      return { mods, total };
    }
  } catch {}

  // 降级：从 world_brief 中读取
  const campaign = db.prepare('SELECT world_brief FROM rpg_campaigns WHERE id = ?').get(campaignId) as any;
  if (!campaign) return { mods, total: 0 };

  try {
    const brief = campaign.world_brief;
    if (brief) {
      const jsonMatch = brief.match(/\{[\s\S]*"global_variables"[\s\S]*\}/);
      if (jsonMatch) {
        const vars = JSON.parse(jsonMatch[0]).global_variables;
        if (vars) {
          for (const [key, value] of Object.entries(vars)) {
            if (typeof value === 'number') {
              const mod = Math.floor(value / 10) - 5;
              if (mod !== 0) mods.push({ source: `世界:${key}`, value: mod });
            }
          }
        }
      }
    }
  } catch {}

  const total = mods.reduce((sum, m) => sum + m.value, 0);
  return { mods, total };
}

export function fateCheck(params: FateCheckParams): FateCheckResult {
  const { actionType, characterId, campaignId, difficulty = 1.0, extraPlayerMod = 0, extraWorldMod = 0, targetNpcId } = params;

  const baseRate = params.baseRate ?? ACTION_BASE_RATES[actionType] ?? DEFAULT_CONFIG.defaultBaseRate;
  const playerResult = getPlayerMods(characterId, targetNpcId);
  const playerMod = playerResult.total + extraPlayerMod;
  const worldResult = getWorldMods(campaignId);
  // 叠加世界书 fate_modifier 规则
  const lorebookMods = campaignId ? getLorebookFateMods(campaignId, actionType, characterId) : [];
  const lorebookTotal = lorebookMods.reduce((sum, m) => sum + m.value, 0);
  const worldMod = worldResult.total + lorebookTotal + extraWorldMod;
  const allWorldMods = [...worldResult.mods, ...lorebookMods];
  const rawRate = baseRate + playerMod + worldMod;
  const clampedDifficulty = Math.max(DEFAULT_CONFIG.difficultyLimits.min, Math.min(DEFAULT_CONFIG.difficultyLimits.max, difficulty));
  let finalRate = Math.round(rawRate * clampedDifficulty);
  finalRate = Math.max(DEFAULT_CONFIG.minFinalRate, Math.min(DEFAULT_CONFIG.maxFinalRate, finalRate));
  const roll = Math.floor(Math.random() * 100) + 1;
  const success = roll <= finalRate;
  const degreeDiff = finalRate - roll;

  let degree: FateCheckResult['degree'];
  const thresholds = DEFAULT_CONFIG.successDegreeThresholds;
  if (degreeDiff >= thresholds.critical_success) degree = 'critical_success';
  else if (degreeDiff >= thresholds.success) degree = 'success';
  else if (degreeDiff >= thresholds.mixed) degree = 'mixed';
  else if (degreeDiff >= thresholds.failure) degree = 'failure';
  else degree = 'critical_failure';

  if (success && degree === 'mixed') degree = 'success';
  else if (!success && degree === 'mixed') degree = 'failure';

  return {
    success, finalRate, rawRate, roll,
    difficulty: clampedDifficulty, playerMod, worldMod, degree, degreeDiff,
    breakdown: { baseRate, playerMods: playerResult.mods, worldMods: allWorldMods, difficulty: clampedDifficulty },
  };
}

export function getFateModSummary(characterId: string, campaignId?: string) {
  const player = getPlayerMods(characterId);
  const world = getWorldMods(campaignId);
  return { playerMods: player.mods, worldMods: world.mods, totalMod: player.total + world.total };
}

export function realmToValue(realm: string): number {
  return REALM_VALUES[realm] ?? 0;
}

export function getRealmList(): string[] {
  return Object.keys(REALM_VALUES);
}

export function getActionTypes(): { key: string; label: string; baseRate: number }[] {
  return Object.entries(ACTION_BASE_RATES).map(([key, rate]) => ({
    key, label: key.replace(/_/g, ' '), baseRate: rate,
  }));
}

export { REALM_VALUES, DEFAULT_CONFIG };

// ===== Phase 3: 世界书命运修正 + NPC 对抗 =====

/**
 * 从副本关联的世界书中读取 fate_modifier 类型的条目
 * 条目格式: { type: "fate_modifier", action: "bargain", condition: "flags.xxx == true", modifier: 15, description: "..." }
 */
export function getLorebookFateMods(
  campaignId: string,
  actionType: string,
  characterId: string
): { source: string; value: number }[] {
  const mods: { source: string; value: number }[] = [];

  const campaign = db.prepare('SELECT lorebook_id FROM rpg_campaigns WHERE id = ?').get(campaignId) as any;
  if (!campaign?.lorebook_id) return mods;

  const lorebook = db.prepare('SELECT entries FROM rpg_lorebooks WHERE id = ?').get(campaign.lorebook_id) as any;
  if (!lorebook?.entries) return mods;

  let entries: any[];
  try { entries = JSON.parse(lorebook.entries); } catch { return mods; }

  // 读取角色卡 flags 用于条件判断
  const char = db.prepare('SELECT card_data FROM rpg_characters WHERE id = ?').get(characterId) as any;
  let flags: Record<string, any> = {};
  if (char) {
    try {
      const cd = JSON.parse(char.card_data);
      flags = cd.trpg?.flags || cd.flags || {};
    } catch {}
  }

  for (const entry of entries) {
    if (entry.type !== 'fate_modifier') continue;
    if (!entry.enabled && entry.enabled !== undefined) continue;

    // 匹配行动类型
    if (entry.action && entry.action !== actionType && entry.action !== '*') continue;

    // 检查条件
    if (entry.condition) {
      if (!evaluateCondition(entry.condition, flags)) continue;
    }

    // 应用修正
    if (typeof entry.modifier === 'number') {
      mods.push({
        source: `世界书:${entry.description || entry.keys?.[0] || '规则'}`,
        value: entry.modifier,
      });
    }
  }

  return mods;
}

/**
 * 简单条件求值器
 * 支持: "flags.xxx == true", "flags.xxx == 5", "flags.xxx"
 */
function evaluateCondition(condition: string, flags: Record<string, any>): boolean {
  const eqMatch = condition.match(/flags\.(\w+)\s*==\s*(.+)/);
  if (eqMatch) {
    const flagName = eqMatch[1];
    const expected = eqMatch[2].trim();
    const actual = flags[flagName];
    if (expected === 'true') return actual === true || actual === 1;
    if (expected === 'false') return actual === false || actual === 0 || actual === undefined;
    return String(actual) === expected;
  }
  // 简写: "flags.xxx" 等价于 "flags.xxx == true"
  const flagMatch = condition.match(/flags\.(\w+)/);
  if (flagMatch) {
    const val = flags[flagMatch[1]];
    return !!val;
  }
  return false;
}

/**
 * NPC 对抗检定 — 双方各执行命运判定，比较成功度
 */
export interface OpposedCheckParams {
  actionType: string;
  characterId: string;
  npcId: string;
  campaignId?: string;
  difficulty?: number;
}

export interface OpposedCheckResult {
  playerResult: FateCheckResult;
  npcResult: FateCheckResult;
  winner: 'player' | 'npc' | 'tie';
  narration: string;
}

export function opposedCheck(params: OpposedCheckParams): OpposedCheckResult {
  const { actionType, characterId, npcId, campaignId, difficulty } = params;

  // 玩家检定
  const playerResult = fateCheck({
    actionType,
    characterId,
    campaignId,
    difficulty: difficulty || 1.0,
  });

  // NPC 检定 — 使用防御行动类型，NPC 作为 "player"
  const defenseType = actionType.startsWith('combat_attack') ? 'combat_defend' :
    actionType.startsWith('persuade') ? 'persuade_neutral' :
    actionType.startsWith('stealth') ? 'perception' : 'combat_defend';

  const npcResult = fateCheck({
    actionType: defenseType,
    characterId: npcId,
    campaignId,
    difficulty: 1.0,
  });

  // 比较成功度
  let winner: 'player' | 'npc' | 'tie';
  let narration: string;

  if (playerResult.success && !npcResult.success) {
    winner = 'player';
    narration = '玩家行动成功，NPC 应对失败';
  } else if (!playerResult.success && npcResult.success) {
    winner = 'npc';
    narration = '玩家行动失败，NPC 成功应对';
  } else if (playerResult.success && npcResult.success) {
    // 双方都成功，比较成功度
    if (playerResult.degreeDiff > npcResult.degreeDiff) {
      winner = 'player';
      narration = '双方都表现出色，但玩家更胜一筹';
    } else if (npcResult.degreeDiff > playerResult.degreeDiff) {
      winner = 'npc';
      narration = '双方都表现出色，但 NPC 更胜一筹';
    } else {
      winner = 'tie';
      narration = '势均力敌，不分胜负';
    }
  } else {
    // 双方都失败
    if (playerResult.degreeDiff > npcResult.degreeDiff) {
      winner = 'player';
      narration = '双方都失误了，但玩家稍好一些';
    } else if (npcResult.degreeDiff > playerResult.degreeDiff) {
      winner = 'npc';
      narration = '双方都失误了，但 NPC 稍好一些';
    } else {
      winner = 'tie';
      narration = '双方都失误，尴尬的平局';
    }
  }

  return { playerResult, npcResult, winner, narration };
}

// ===== Phase 4: 状态自动更新 + Flag 生命周期 + 模拟 =====

/**
 * 根据命运检定结果自动更新角色状态
 */
export interface StateUpdateResult {
  reputationChange: number;
  relationshipChanges: { target: string; change: number }[];
  healthChange: number;
  newFlags: { key: string; value: any }[];
  removedFlags: string[];
  summary: string;
}

export function applyFateStateUpdate(
  characterId: string,
  result: FateCheckResult,
  targetNpcName?: string
): StateUpdateResult {
  const changes: StateUpdateResult = {
    reputationChange: 0,
    relationshipChanges: [],
    healthChange: 0,
    newFlags: [],
    removedFlags: [],
    summary: '',
  };

  const summaries: string[] = [];

  switch (result.degree) {
    case 'critical_success':
      changes.reputationChange = 3;
      if (targetNpcName) changes.relationshipChanges.push({ target: targetNpcName, change: 15 });
      summaries.push('声望+3');
      if (targetNpcName) summaries.push(`${targetNpcName}好感+15`);
      break;
    case 'success':
      changes.reputationChange = 1;
      if (targetNpcName) changes.relationshipChanges.push({ target: targetNpcName, change: 5 });
      summaries.push('声望+1');
      if (targetNpcName) summaries.push(`${targetNpcName}好感+5`);
      break;
    case 'failure':
      changes.reputationChange = -1;
      if (targetNpcName) changes.relationshipChanges.push({ target: targetNpcName, change: -5 });
      summaries.push('声望-1');
      if (targetNpcName) summaries.push(`${targetNpcName}好感-5`);
      break;
    case 'critical_failure':
      changes.reputationChange = -3;
      if (targetNpcName) changes.relationshipChanges.push({ target: targetNpcName, change: -15 });
      changes.healthChange = -10;
      summaries.push('声望-3', '生命-10');
      if (targetNpcName) summaries.push(`${targetNpcName}好感-15`);
      break;
  }

  // 应用到数据库
  if (changes.reputationChange !== 0 || changes.healthChange !== 0 || changes.relationshipChanges.length > 0) {
    applyStateChangesToDB(characterId, changes);
  }

  changes.summary = summaries.join('，') || '无状态变化';
  return changes;
}

function applyStateChangesToDB(characterId: string, changes: StateUpdateResult) {
  const char = db.prepare('SELECT card_data FROM rpg_characters WHERE id = ?').get(characterId) as any;
  if (!char) return;

  let cardData: any;
  try { cardData = JSON.parse(char.card_data); } catch { return; }

  const trpg = cardData.trpg || cardData.extensions?.trpg || cardData;
  const ds = trpg.dynamic_state || {};

  // 更新声望
  if (changes.reputationChange !== 0) {
    ds.reputation = Math.max(0, Math.min(100, (ds.reputation || 0) + changes.reputationChange));
  }

  // 更新生命
  if (changes.healthChange !== 0) {
    ds.health = Math.max(0, Math.min(100, (ds.health || 100) + changes.healthChange));
  }

  trpg.dynamic_state = ds;

  // 更新关系
  if (changes.relationshipChanges.length > 0) {
    const rels: any[] = trpg.relationships || [];
    for (const rc of changes.relationshipChanges) {
      const existing = rels.find((r: any) => r.target === rc.target);
      if (existing) {
        existing.value = Math.max(-100, Math.min(100, existing.value + rc.change));
      } else {
        rels.push({ target: rc.target, value: rc.change });
      }
    }
    trpg.relationships = rels;
  }

  // 回写
  if (cardData.trpg) cardData.trpg = trpg;
  else if (cardData.extensions?.trpg) cardData.extensions.trpg = trpg;
  else Object.assign(cardData, trpg);

  db.prepare('UPDATE rpg_characters SET card_data = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(cardData), new Date().toISOString(), characterId);
}

/**
 * Flag 生命周期管理 — 设置/清除/切换 flag
 */
export function setFlag(characterId: string, flagName: string, value: any): boolean {
  const char = db.prepare('SELECT card_data FROM rpg_characters WHERE id = ?').get(characterId) as any;
  if (!char) return false;

  let cardData: any;
  try { cardData = JSON.parse(char.card_data); } catch { return false; }

  const trpg = cardData.trpg || cardData.extensions?.trpg || cardData;
  if (!trpg.flags) trpg.flags = {};
  trpg.flags[flagName] = value;

  if (cardData.trpg) cardData.trpg = trpg;
  else if (cardData.extensions?.trpg) cardData.extensions.trpg = trpg;
  else Object.assign(cardData, trpg);

  db.prepare('UPDATE rpg_characters SET card_data = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(cardData), new Date().toISOString(), characterId);
  return true;
}

export function removeFlag(characterId: string, flagName: string): boolean {
  const char = db.prepare('SELECT card_data FROM rpg_characters WHERE id = ?').get(characterId) as any;
  if (!char) return false;

  let cardData: any;
  try { cardData = JSON.parse(char.card_data); } catch { return false; }

  const trpg = cardData.trpg || cardData.extensions?.trpg || cardData;
  if (trpg.flags && flagName in trpg.flags) {
    delete trpg.flags[flagName];
  }

  if (cardData.trpg) cardData.trpg = trpg;
  else if (cardData.extensions?.trpg) cardData.extensions.trpg = trpg;
  else Object.assign(cardData, trpg);

  db.prepare('UPDATE rpg_characters SET card_data = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(cardData), new Date().toISOString(), characterId);
  return true;
}

export function getFlags(characterId: string): Record<string, any> {
  const char = db.prepare('SELECT card_data FROM rpg_characters WHERE id = ?').get(characterId) as any;
  if (!char) return {};
  try {
    const cd = JSON.parse(char.card_data);
    return cd.trpg?.flags || cd.extensions?.trpg?.flags || cd.flags || {};
  } catch { return {}; }
}

/**
 * 命运公式平衡性模拟 — 运行 N 次相同条件的检定，返回统计
 */
export interface SimulationResult {
  runs: number;
  successRate: number;
  criticalSuccessRate: number;
  criticalFailureRate: number;
  degreeDistribution: Record<string, number>;
  avgRoll: number;
  avgFinalRate: number;
  recommendation: string;
}

export function simulateFateCheck(
  params: FateCheckParams,
  runs: number = 1000
): SimulationResult {
  const degrees: Record<string, number> = {
    critical_success: 0, success: 0, mixed: 0, failure: 0, critical_failure: 0,
  };
  let successes = 0;
  let totalRoll = 0;
  let totalFinalRate = 0;

  for (let i = 0; i < runs; i++) {
    const result = fateCheck(params);
    if (result.success) successes++;
    degrees[result.degree]++;
    totalRoll += result.roll;
    totalFinalRate += result.finalRate;
  }

  const successRate = successes / runs;
  const avgFinalRate = totalFinalRate / runs;

  let recommendation = '';
  if (successRate > 0.8) recommendation = '成功率过高（>80%），建议提高难度系数或降低基础概率';
  else if (successRate < 0.2) recommendation = '成功率过低（<20%），建议降低难度系数或增加玩家修正';
  else if (successRate >= 0.4 && successRate <= 0.6) recommendation = '成功率平衡良好（40%-60%），参数设置合理';
  else recommendation = '成功率处于正常范围';

  return {
    runs,
    successRate,
    criticalSuccessRate: degrees.critical_success / runs,
    criticalFailureRate: degrees.critical_failure / runs,
    degreeDistribution: degrees,
    avgRoll: totalRoll / runs,
    avgFinalRate,
    recommendation,
  };
}

// ===== Phase 4: 回合制战斗引擎 =====

export interface CombatParticipant {
  id: string;
  name: string;
  isPlayer: boolean;
  agility: number;
  health: number;
  maxHealth: number;
  statusEffects: StatusEffect[];
}

export interface StatusEffect {
  name: string;
  duration: number;
  modValue: number;
  type: 'buff' | 'debuff';
}

export interface CombatAction {
  actorId: string;
  actionType: string;
  targetId: string;
  description: string;
}

export interface CombatTurnResult {
  actorId: string;
  actorName: string;
  targetId: string;
  targetName: string;
  actionType: string;
  fateResult: FateCheckResult;
  damage: number;
  statusChanges: string[];
  narration: string;
}

export interface CombatState {
  id: string;
  campaignId: string;
  participants: CombatParticipant[];
  turnOrder: string[];
  currentTurn: number;
  round: number;
  status: 'active' | 'ended';
  log: CombatTurnResult[];
}

// 战斗状态缓存（用于快速访问，但每次修改后都会同步到数据库）
const combatCache = new Map<string, CombatState>();

export function initCombat(
  campaignId: string,
  playerIds: { id: string; name: string }[],
  enemyIds: { id: string; name: string }[]
): CombatState {
  const participants: CombatParticipant[] = [];

  for (const p of playerIds) {
    const stats = getCombatStats(p.id);
    participants.push({
      id: p.id, name: p.name, isPlayer: true,
      agility: stats.agility, health: stats.health, maxHealth: stats.maxHealth,
      statusEffects: [],
    });
  }

  for (const e of enemyIds) {
    const stats = getCombatStats(e.id);
    participants.push({
      id: e.id, name: e.name, isPlayer: false,
      agility: stats.agility, health: stats.health, maxHealth: stats.maxHealth,
      statusEffects: [],
    });
  }

  // 按敏捷排序行动顺序
  const turnOrder = [...participants].sort((a, b) => b.agility - a.agility).map(p => p.id);

  const combatId = `combat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const state: CombatState = {
    id: combatId,
    campaignId,
    participants,
    turnOrder,
    currentTurn: 0,
    round: 1,
    status: 'active',
    log: [],
  };

  // 持久化到数据库
  db.transaction(() => {
    // 保存战斗会话
    db.prepare(`
      INSERT INTO rpg_combat_sessions (id, campaign_id, state_json, status)
      VALUES (?, ?, ?, 'active')
    `).run(combatId, campaignId, JSON.stringify({
      turnOrder, currentTurn: 0, round: 1, log: [],
    }));

    // 保存参战者
    for (const p of participants) {
      db.prepare(`
        INSERT INTO rpg_combat_participants (id, combat_session_id, participant_id, name, is_player, agility, health, max_health, status_effects)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${combatId}_${p.id}`, combatId, p.id, p.name, p.isPlayer ? 1 : 0,
        p.agility, p.health, p.maxHealth, JSON.stringify(p.statusEffects)
      );
    }
  })();

  combatCache.set(combatId, state);
  return state;
}

function getCombatStats(characterId: string): { agility: number; health: number; maxHealth: number } {
  const char = db.prepare('SELECT card_data FROM rpg_characters WHERE id = ?').get(characterId) as any;
  if (!char) return { agility: 5, health: 100, maxHealth: 100 };

  try {
    const cd = JSON.parse(char.card_data);
    const trpg = cd.trpg || cd.extensions?.trpg || cd;
    const attrs = trpg.attributes || {};
    const ds = trpg.dynamic_state || {};

    const agility = attrs['敏捷'] || attrs['AGI'] || attrs['Dexterity'] || 5;
    const health = ds.health ?? 100;

    return { agility, health, maxHealth: 100 };
  } catch { return { agility: 5, health: 100, maxHealth: 100 }; }
}

export function executeCombatTurn(
  combatId: string,
  action: CombatAction,
  campaignId?: string
): { turn: CombatTurnResult; state: CombatState } | null {
  // 从缓存或数据库加载战斗状态
  let state = combatCache.get(combatId);
  if (!state) {
    state = loadCombatFromDB(combatId) ?? undefined;
    if (!state) return null;
    combatCache.set(combatId, state);
  }

  if (state.status !== 'active') return null;

  const actor = state.participants.find(p => p.id === action.actorId);
  const target = state.participants.find(p => p.id === action.targetId);
  if (!actor || !target) return null;

  // 执行命运检定
  const fateResult = opposedCheck({
    actionType: action.actionType,
    characterId: action.actorId,
    npcId: action.targetId,
    campaignId: campaignId || state.campaignId,
  });

  // 计算伤害
  let damage = 0;
  const statusChanges: string[] = [];

  if (fateResult.winner === 'player') {
    // 攻击方赢，计算伤害
    const baseDamage = action.actionType === 'combat_critical' ? 30 : 15;
    const degreeBonus = Math.max(0, Math.floor(fateResult.playerResult.degreeDiff / 5));
    damage = baseDamage + degreeBonus;
    target.health = Math.max(0, target.health - damage);

    if (fateResult.playerResult.degree === 'critical_success') {
      target.statusEffects.push({ name: '破防', duration: 2, modValue: -10, type: 'debuff' });
      statusChanges.push(`${target.name} 陷入破防状态`);
    }
  } else if (fateResult.winner === 'npc') {
    // 防御方赢，反击伤害
    damage = 5;
    actor.health = Math.max(0, actor.health - damage);
  }

  const narration = fateResult.winner === 'player'
    ? `${actor.name} 的${action.description || '攻击'}命中了 ${target.name}，造成 ${damage} 点伤害`
    : fateResult.winner === 'npc'
    ? `${target.name} 成功防御并反击，对 ${actor.name} 造成 ${damage} 点伤害`
    : `${actor.name} 与 ${target.name} 交锋，不分胜负`;

  const turnResult: CombatTurnResult = {
    actorId: action.actorId,
    actorName: actor.name,
    targetId: action.targetId,
    targetName: target.name,
    actionType: action.actionType,
    fateResult: fateResult.playerResult,
    damage,
    statusChanges,
    narration,
  };

  state.log.push(turnResult);

  // 推进回合
  state.currentTurn++;
  if (state.currentTurn >= state.turnOrder.length) {
    state.currentTurn = 0;
    state.round++;
    // 递减状态效果持续时间
    for (const p of state.participants) {
      p.statusEffects = p.statusEffects.filter(e => {
        e.duration--;
        return e.duration > 0;
      });
    }
  }

  // 检查战斗结束
  const alivePlayers = state.participants.filter(p => p.isPlayer && p.health > 0);
  const aliveEnemies = state.participants.filter(p => !p.isPlayer && p.health > 0);

  if (alivePlayers.length === 0 || aliveEnemies.length === 0) {
    state.status = 'ended';
  }

  // 持久化到数据库
  persistCombatToDB(state);

  return { turn: turnResult, state };
}

/** 从数据库加载战斗状态 */
function loadCombatFromDB(combatId: string): CombatState | null {
  const session = db.prepare('SELECT * FROM rpg_combat_sessions WHERE id = ? AND status = ?')
    .get(combatId, 'active') as any;
  if (!session) return null;

  const stateJson = JSON.parse(session.state_json || '{}');
  const participants = db.prepare(`
    SELECT * FROM rpg_combat_participants WHERE combat_session_id = ?
  `).all(combatId) as any[];

  return {
    id: combatId,
    campaignId: session.campaign_id,
    participants: participants.map(p => ({
      id: p.participant_id,
      name: p.name,
      isPlayer: p.is_player === 1,
      agility: p.agility,
      health: p.health,
      maxHealth: p.max_health,
      statusEffects: JSON.parse(p.status_effects || '[]'),
    })),
    turnOrder: stateJson.turnOrder || [],
    currentTurn: stateJson.currentTurn || 0,
    round: stateJson.round || 1,
    status: session.status as 'active' | 'ended',
    log: stateJson.log || [],
  };
}

/** 将战斗状态持久化到数据库 */
function persistCombatToDB(state: CombatState): void {
  db.transaction(() => {
    // 更新战斗会话
    db.prepare(`
      UPDATE rpg_combat_sessions
      SET state_json = ?, status = ?, ended_at = CASE WHEN ? = 'ended' THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
    `).run(JSON.stringify({
      turnOrder: state.turnOrder,
      currentTurn: state.currentTurn,
      round: state.round,
      log: state.log,
    }), state.status, state.status, state.id);

    // 更新参战者状态
    for (const p of state.participants) {
      db.prepare(`
        UPDATE rpg_combat_participants
        SET health = ?, status_effects = ?
        WHERE combat_session_id = ? AND participant_id = ?
      `).run(p.health, JSON.stringify(p.statusEffects), state.id, p.id);
    }

    // 保存最新的回合记录（只保存最近未保存的）
    const existingTurnCount = db.prepare(
      'SELECT COUNT(*) as c FROM rpg_combat_turns WHERE combat_session_id = ?'
    ).get(state.id) as any;

    const newTurns = state.log.slice(existingTurnCount.c);
    for (const turn of newTurns) {
      db.prepare(`
        INSERT INTO rpg_combat_turns (id, combat_session_id, turn_number, actor_id, action_type, target_id, result_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${state.id}_turn_${turn.actorId}_${Date.now()}`,
        state.id, state.round, turn.actorId, turn.actionType,
        turn.targetId, JSON.stringify(turn)
      );
    }
  })();
}

export function getCombatState(combatId: string): CombatState | null {
  // 优先从缓存获取
  let state = combatCache.get(combatId);
  if (!state) {
    state = loadCombatFromDB(combatId) ?? undefined;
    if (state) combatCache.set(combatId, state);
  }
  return state || null;
}

export function endCombat(combatId: string): CombatState | null {
  let state = combatCache.get(combatId);
  if (!state) {
    state = loadCombatFromDB(combatId) ?? undefined;
  }
  if (state) {
    state.status = 'ended';
    persistCombatToDB(state);
    combatCache.delete(combatId);
  }
  return state || null;
}
