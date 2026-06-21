/**
 * 雾隐酒馆 — TypeScript 类型定义
 */

// ===== 角色卡 (SillyTavern V2 兼容) =====

export interface CharacterCardData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  system_prompt: string;
  post_history_instructions: string;
  tags: string[];
  creator: string;
  character_version: string;
  // TRPG 扩展
  trpg?: {
    system: string;            // dnd5e / coc7th / custom
    level?: number;
    attributes: Record<string, number>;
    skills: Record<string, number>;
    hp: { current: number; max: number };
    mp?: { current: number; max: number };
    san?: { current: number; max: number };
    equipment: string[];
    spells: string[];
    backstory: string;
    inventory: { name: string; quantity: number; description?: string }[];
    // 命运公式扩展字段
    dynamic_state?: {
      cultivation?: { realm: string; realm_value?: number };
      reputation?: number;
      resources?: number;
      health?: number;
      rank?: string;
      [key: string]: any;
    };
    flags?: Record<string, boolean | number | string>;
    relationships?: { target: string; value: number }[];
  };
  character_book?: {
    entries: LorebookEntry[];
  };
}

export interface CharacterCard {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: CharacterCardData;
}

// ===== 世界书条目 =====

export interface LorebookEntry {
  id: string;
  keys: string[];
  content: string;
  enabled: boolean;
  selective: boolean;
  priority: number;
  secondary_keys?: string[];
  constant?: boolean;
}

// ===== 异时空 =====

export type CampaignMode = 'solo' | 'coop' | 'human_gm' | 'hybrid';
export type CampaignStatus = 'recruiting' | 'active' | 'paused' | 'completed';
export type GameSystem = 'dnd5e' | 'coc7th' | 'shadowrun' | 'custom';

export interface Campaign {
  id: string;
  name: string;
  mode: CampaignMode;
  system: GameSystem;
  gm_type: 'ai' | 'human';
  gm_user_id: string | null;
  world_brief: string;
  status: CampaignStatus;
  max_players: number;
  is_public: number;
  lorebook_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ===== 资产关联（副本-人物卡-世界书交叉引用） =====

export type AssetSourceType = 'module' | 'lorebook' | 'character';
export type AssetLinkedType = 'character' | 'lorebook' | 'module';

export interface AssetLink {
  id: string;
  source_type: AssetSourceType;
  source_id: string;
  linked_type: AssetLinkedType;
  linked_id: string;
  role: string;
  created_by: string;
  created_at: string;
}

export interface AssetLinkWithDetail extends AssetLink {
  linked_name: string;
  linked_avatar?: string;
  linked_description?: string;
  linked_author?: string;
}

// ===== 会话消息 =====

export type MessageRole = 'gm' | 'player' | 'system' | 'narrator';
export type MessageType = 'narrative' | 'action' | 'dice' | 'system' | 'dialogue';

export interface CampaignMessage {
  id: string;
  campaign_id: string;
  session_id: string;
  user_id: string | null;
  character_id: string | null;
  role: MessageRole;
  content: string;
  msg_type: MessageType;
  dice_result: string | null;
  created_at: string;
}

// ===== 预设规则系统 =====

export interface RulePreset {
  id: GameSystem;
  name: string;
  description: string;
  dice: string;       // 默认骰子
  attributes: string[];
  skills: Record<string, string[]>;
  systemPrompt: string;
}

export const RULE_PRESETS: Record<GameSystem, RulePreset> = {
  dnd5e: {
    id: 'dnd5e',
    name: '龙与地下城 5e',
    description: '经典的奇幻冒险规则系统',
    dice: 'D20',
    attributes: ['力量', '敏捷', '体质', '智力', '感知', '魅力'],
    skills: {
      '力量': ['运动'],
      '敏捷': ['杂技', '巧手', '隐匿', '体操'],
      '体质': ['体操'],
      '智力': ['秘法', '历史', '调查', '自然', '宗教'],
      '感知': ['驯兽', '洞察', '医药', '察觉', '求生'],
      '魅力': ['欺瞒', '威吓', '表演', '游说'],
    },
    systemPrompt: `你是一位经验丰富的 D&D 5e 地下城主 (Game Master)。
规则要点：
- 使用 D20 进行属性检定和攻击检定，加上对应的属性调整值和熟练加值
- 困难等级 (DC): 5(非常容易), 10(容易), 15(中等), 20(困难), 25(非常困难), 30(几乎不可能)
- 战斗中使用先攻顺序，每个回合包括：移动、动作、附赠动作、反应
- 当需要掷骰时，使用 [[D20+N]] 格式标记
- 保持叙事生动，描述场景的视觉、听觉、嗅觉细节
- 给玩家选择权，不要替玩家做决定
- 奖励创造性思维，灵活处理规则`,
  },
  coc7th: {
    id: 'coc7th',
    name: '克苏鲁的呼唤 7th',
    description: '恐怖调查角色扮演游戏',
    dice: 'D100',
    attributes: ['力量', '体质', '体型', '敏捷', '外貌', '智力', '意志', '教育', '幸运'],
    skills: {
      '专业技能': ['会计', '人类学', '考古学', '艺术与手艺', '魅惑', '攀爬', '计算机', '信用评级', '克苏鲁神话', '汽车驾驶', '电气维修', '话术', '格斗', '火器', '急救', '历史', '恐吓', '跳跃', '法律', '图书馆', '聆听', '锁匠', '机械维修', '医学', '自然史', '导航', '神秘学', '操作重型机械', '说服', '精神分析', '心理学', '骑术', '科学', '妙手', '侦查', '潜行', '生存', '游泳', '投掷', '追踪'],
    },
    systemPrompt: `你是一位克苏鲁的呼唤 7th 版守秘人 (Keeper of Arcane Lore)。
规则要点：
- 使用 D100 进行技能检定，结果 ≤ 技能值为成功
- 困难成功: ≤ 技能值的一半，极难成功: ≤ 技能值的五分之一
- 大成功: 掷出 01，大失败: 掷出 100
- 理智值 (SAN) 是关键机制，遭遇恐怖事件需要进行理智检定
- 战斗是危险的，鼓励调查和思考而非硬碰硬
- 营造悬疑和恐怖的氛围，描述环境的细节和不安感
- 当需要掷骰时，使用 [[D100]] 或 [[D100>技能值]] 格式标记`,
  },
  shadowrun: {
    id: 'shadowrun',
    name: '暗影狂奔',
    description: '赛博朋克+奇幻的混合世界',
    dice: 'D6',
    attributes: ['力量', '敏捷', '体质', '智力', '意志', '魅力', '边缘', '魔法/共鸣'],
    skills: {
      '通用': ['运动', '自动化', '生物科技', '破解', '电子战', '工程', '逃脱', '火器', '投掷武器',
        '肉搏', '潜入', '调查', '语言', '领导力', '医疗', '近战', '导航',
        '谈判', '秘法', '驾驶', '手枪', '长枪', '霰弹枪', '潜行', '生存', '追踪'],
    },
    systemPrompt: `你是一位精通暗影狂奔 (Shadowrun) 第六世界规则的 GM（Game Master）。
规则要点：
- 使用 D6 骰池系统：属性值 + 技能等级 = 骰子数量，每个骰子掷出 5 或 6 算一个成功（hit）
- 阈值检定：GM 根据任务难度设定所需成功数。1(简单), 2(普通), 3(困难), 4(极难), 6+(传奇)
- 对抗检定：双方各自掷骰池，比较成功数，多者胜
- 边缘值 (Edge)：玩家可花费边缘值重掷失败骰、在掷后增加骰子、或将失败变为成功。边缘值每场景恢复 1 点
- 故障 (Glitch)：超过一半骰子掷出 1 时触发故障（行动仍可能成功但附带意外）；若同时零成功则为大故障
- 战斗轮：先攻 = 反应 + 直觉 + D6，每轮可用动作：2 个简单动作或 1 个复杂动作 + 1 个自由动作
- 伤害抵抗：用体质 + 护甲骰池抵抗伤害，每成功减少 1 点伤害
- 魔法：施法者掷魔法 + 对应技能，需抵抗流失（drain）；精神力过低会导致昏迷
- 矩阵/网络：黑客使用设备等级 + 黑客技能进行矩阵行动，对抗 ICE（入侵对抗电子系统）
- 当需要掷骰时，使用 [[ND6]] 或 [[ND6>N]] 格式标记，引擎会自动解析
- 保持赛博朋克的阴暗氛围，描述霓虹灯下的暗巷、义体改造的代价、企业阴谋的冷酷
- 给玩家选择权，不要替玩家做决定。道德灰色地带是暗影狂奔的核心主题`,
  },
  custom: {
    id: 'custom',
    name: '自由叙事',
    description: '完全自由的叙事式角色扮演，无固定规则约束',
    dice: 'D20',
    attributes: ['力量', '敏捷', '智力', '魅力'],
    skills: {},
    systemPrompt: `你是一位富有创造力的叙事主持人 (Storyteller)。
- 用生动的语言描述场景、角色和事件
- 推动剧情发展，但给玩家充分的自由选择空间
- 当需要不确定性时，使用 [[D20]] 进行检定
- 10+ 为成功，15+ 为大成功，5- 为失败
- 注重角色发展和故事深度
- 灵活适应玩家的选择和创意`,
  },
};

// ===== AI GM 请求/响应 =====

export interface GMRequest {
  campaignId: string;
  sessionId: string;
  playerAction: string;
  characterId?: string;
  context?: {
    recentMessages: CampaignMessage[];
    characterCard?: CharacterCardData;
    worldBrief?: string;
    loreEntries?: LorebookEntry[];
  };
}

export interface GMResponse {
  narrative: string;
  diceRolls?: { expression: string; result: string }[];
  choices?: string[];
  updatedState?: Record<string, any>;
}
