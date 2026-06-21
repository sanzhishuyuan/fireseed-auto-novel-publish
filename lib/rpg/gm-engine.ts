/**
 * AI GM 引擎 — 解耦的提示词构建与叙事生成模块
 * 
 * 职责：
 * - 根据规则预设、战役设定、角色卡构建系统提示词
 * - 注入命运公式判定结果
 * - 管理 NPC 状态追踪（预留扩展）
 * - 支持长期记忆上下文（预留扩展）
 */

import { RULE_PRESETS, type CharacterCardData, type LorebookEntry } from './types';

// ===== 系统提示词构建 =====

export interface GMPromptOptions {
  preset: typeof RULE_PRESETS.dnd5e;
  campaign: {
    world_brief?: string;
    system?: string;
  };
  characterCard: CharacterCardData | null;
  lorebookEntries?: LorebookEntry[];
  playerMessage?: string;
  fateResult?: any;
  stateUpdate?: any;
}

/**
 * 构建 AI GM 系统提示词
 */
export function buildSystemPrompt(options: GMPromptOptions): string {
  const { preset, campaign, characterCard, fateResult, stateUpdate } = options;
  
  let prompt = preset.systemPrompt;

  // 世界设定
  if (campaign.world_brief) {
    prompt += `\n\n## 世界设定\n${campaign.world_brief}`;
  }

  // 世界书上下文注入
  if (lorebookEntries && lorebookEntries.length > 0) {
    const injected = injectLorebookContext(lorebookEntries, playerMessage || '');
    if (injected) {
      prompt += `\n\n## 世界百科（来自世界书，请在叙事中自然引用这些设定）\n${injected}`;
    }
  }

  // 玩家角色信息
  if (characterCard) {
    prompt += `\n\n## 玩家角色\n`;
    prompt += `名称: ${characterCard.name}\n`;
    prompt += `描述: ${characterCard.description}\n`;
    if (characterCard.personality) {
      prompt += `性格: ${characterCard.personality}\n`;
    }
    if (characterCard.trpg) {
      prompt += `等级: ${characterCard.trpg.level || 1}\n`;
      
      // 属性
      if (characterCard.trpg.attributes) {
        const attrs = Object.entries(characterCard.trpg.attributes)
          .map(([k, v]) => `${k}:${v}`).join(', ');
        prompt += `属性: ${attrs}\n`;
      }
      
      // 生命值/魔法值/SAN值
      if (characterCard.trpg.hp) {
        prompt += `HP: ${characterCard.trpg.hp.current}/${characterCard.trpg.hp.max}\n`;
      }
      if (characterCard.trpg.mp) {
        prompt += `MP: ${characterCard.trpg.mp.current}/${characterCard.trpg.mp.max}\n`;
      }
      if (characterCard.trpg.san) {
        prompt += `SAN: ${characterCard.trpg.san.current}/${characterCard.trpg.san.max}\n`;
      }
      
      // 装备
      if (characterCard.trpg.equipment?.length > 0) {
        prompt += `装备: ${characterCard.trpg.equipment.join(', ')}\n`;
      }
      
      // 背景故事
      if (characterCard.trpg.backstory) {
        prompt += `背景故事: ${characterCard.trpg.backstory}\n`;
      }
      
      // 命运公式动态状态
      if (characterCard.trpg.dynamic_state) {
        const ds = characterCard.trpg.dynamic_state;
        if (ds.reputation !== undefined) prompt += `声望: ${ds.reputation}\n`;
        if (ds.cultivation?.realm) prompt += `修为: ${ds.cultivation.realm}\n`;
        if (ds.resources !== undefined) prompt += `资源: ${ds.resources}\n`;
      }
      
      // 状态标记
      if (characterCard.trpg.flags) {
        const activeFlags = Object.entries(characterCard.trpg.flags)
          .filter(([_, v]) => v)
          .map(([k, v]) => typeof v === 'boolean' ? k : `${k}:${v}`)
          .join(', ');
        if (activeFlags) prompt += `当前状态标记: ${activeFlags}\n`;
      }
    }
    prompt += `\n请根据以上角色设定，以第二人称"你"称呼玩家。`;
  } else {
    prompt += `\n\n玩家尚未创建正式角色，请根据对话逐渐了解并称呼他们。`;
  }

  // 注入命运公式结果
  if (fateResult) {
    prompt += injectFateResult(fateResult, stateUpdate);
  }

  // 输出格式要求
  prompt += `\n\n## 输出格式要求
- 使用生动的叙事语言描述场景和事件
- 当需要玩家做决定时，给出 2-3 个清晰的选择
- 当需要掷骰判定时，使用 [[D20+N]] 或 [[D100]] 格式标记，引擎会自动解析
- 保持回复在 200-500 字之间
- 推动剧情发展，但不要替玩家做决定`;

  return prompt;
}

/**
 * 世界书上下文注入引擎
 * 根据玩家消息关键词匹配世界书条目，注入到 AI GM 系统提示中
 * 常驻条目始终注入，其余按关键词匹配，总量限制 2000 字符
 */
function injectLorebookContext(entries: LorebookEntry[], playerMessage: string): string {
  const MAX_CHARS = 2000;
  const msgLower = playerMessage.toLowerCase();

  // 1. 收集常驻条目
  const constantEntries = entries
    .filter(e => e.enabled && e.constant)
    .filter(e => !e.type || e.type !== 'fate_modifier'); // 排除纯机制条目

  // 2. 关键词匹配条目
  const matchedEntries: LorebookEntry[] = [];
  for (const entry of entries) {
    if (!entry.enabled || entry.constant) continue;
    if ((entry as any).type === 'fate_modifier') continue;

    // 主关键词匹配
    const keyMatch = entry.keys.some(k => k && msgLower.includes(k.toLowerCase()));
    if (!keyMatch) continue;

    // selective 条目需要副关键词也匹配
    if (entry.selective && entry.secondary_keys?.length) {
      const secMatch = entry.secondary_keys.some(k => k && msgLower.includes(k.toLowerCase()));
      if (!secMatch) continue;
    }

    matchedEntries.push(entry);
  }

  // 3. 合并并按优先级排序（高优先）
  const allEntries = [...constantEntries, ...matchedEntries]
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // 4. 拼接，限制总字符数
  let result = '';
  let charCount = 0;
  for (const entry of allEntries) {
    const text = entry.content.trim();
    if (!text) continue;
    const keysLabel = entry.keys.slice(0, 3).join('/');
    const line = `[${keysLabel}] ${text}\n`;
    if (charCount + line.length > MAX_CHARS) break;
    result += line;
    charCount += line.length;
  }

  return result.trim();
}

/**
 * 注入命运公式判定结果到提示词
 */
function injectFateResult(fateResult: any, stateUpdate?: any): string {
  const degreeLabels: Record<string, string> = {
    critical_success: '大成功（额外正面效果）',
    success: '成功',
    mixed: '勉强成功/代价成功',
    failure: '失败',
    critical_failure: '大失败（额外负面效果）',
  };

  let prompt = `\n\n## 命运判定结果（系统自动计算，请据此生成叙事）\n`;
  prompt += `- 判定结果: ${degreeLabels[fateResult.degree] || fateResult.degree}\n`;
  prompt += `- 成功率: ${fateResult.finalRate}%（掷骰: ${fateResult.roll}）\n`;

  if (fateResult.breakdown.playerMods?.length > 0) {
    const mods = fateResult.breakdown.playerMods
      .map((m: any) => `${m.source}(+${m.value})`).join('、');
    prompt += `- 玩家修正: ${mods}\n`;
  }

  if (fateResult.breakdown.worldMods?.length > 0) {
    const mods = fateResult.breakdown.worldMods
      .map((m: any) => `${m.source}(${m.value > 0 ? '+' : ''}${m.value})`).join('、');
    prompt += `- 世界修正: ${mods}\n`;
  }

  prompt += `\n重要：请根据以上判定结果生成叙事。`;
  if (fateResult.degree === 'critical_success') {
    prompt += `行动获得了超出预期的成功，应在叙事中体现额外的正面效果。`;
  } else if (fateResult.degree === 'critical_failure') {
    prompt += `行动遭遇了严重失败，应在叙事中体现额外的负面后果。`;
  }

  // 注入状态变化
  if (stateUpdate && stateUpdate.summary) {
    prompt += `\n- 状态变化: ${stateUpdate.summary}`;
  }

  return prompt;
}

/**
 * 根据玩家行动文本自动推断命运判定类型
 */
export function inferActionType(actionText: string): string | null {
  if (!actionText) return null;
  const text = actionText.toLowerCase();

  const patterns: [string, RegExp][] = [
    ['combat_attack', /攻击|战斗|砍|刺|射击|开火|施法攻击/],
    ['combat_defend', /防御|格挡|闪避|躲避|护盾/],
    ['persuade_neutral', /说服|劝说|请求|商量/],
    ['persuade_hostile', /威胁|恐吓|逼迫|命令/],
    ['deceive', /欺骗|撒谎|伪装|隐瞒|冒充/],
    ['bargain', /砍价|讲价|还价|交易|购买|出售/],
    ['stealth', /潜行|偷偷|悄悄地|隐藏|躲藏/],
    ['search', /搜索|寻找|查找|搜寻|翻找/],
    ['perception', /观察|察觉|注意|发现|聆听/],
    ['trap_detect', /陷阱|机关|埋伏/],
    ['lockpick', /开锁|撬锁|解锁/],
    ['climb', /爬|攀爬|翻越|攀登/],
    ['healing', /治疗|包扎|急救|治愈|恢复/],
    ['knowledge', /知道|了解|认识|熟悉|回忆/],
    ['survival', /生存|追踪|觅食|野外/],
    ['breakthrough_minor', /修炼|冥想|运功|突破小境界/],
    ['breakthrough_major', /筑基|金丹|元婴|突破大境界|渡劫/],
    ['alchemy', /炼丹|炼药|制药/],
    ['crafting', /炼器|打造|锻造|制作/],
    ['intimidate', /威吓|震慑|恐吓/],
  ];

  for (const [actionType, pattern] of patterns) {
    if (pattern.test(text)) return actionType;
  }
  return null;
}

// ===== NPC 管理（预留扩展）=====

export interface NPCState {
  id: string;
  name: string;
  attitude: number; // -100 ~ 100
  location?: string;
  health?: { current: number; max: number };
  inventory?: string[];
  flags: Record<string, any>;
}

/**
 * NPC 状态管理器（当前为内存实现，后续可持久化到数据库）
 */
export class NPCManager {
  private npcs = new Map<string, NPCState>();

  getNPC(campaignId: string, npcId: string): NPCState | undefined {
    return this.npcs.get(`${campaignId}:${npcId}`);
  }

  setNPC(campaignId: string, npc: NPCState): void {
    this.npcs.set(`${campaignId}:${npc.id}`, npc);
  }

  updateAttitude(campaignId: string, npcId: string, delta: number): void {
    const key = `${campaignId}:${npcId}`;
    const npc = this.npcs.get(key);
    if (npc) {
      npc.attitude = Math.max(-100, Math.min(100, npc.attitude + delta));
    }
  }

  getAllNPCs(campaignId: string): NPCState[] {
    const prefix = `${campaignId}:`;
    return Array.from(this.npcs.values())
      .filter(npc => npc.id.startsWith(prefix));
  }
}

// 全局 NPC 管理器实例
export const npcManager = new NPCManager();
