# AI 跑团系统 · 命运公式科学升级方案

> 版本：2.0 | 日期：2026-06-13 | 状态：Phase 1 已完成，Phase 2-4 规划中

---

## 一、升级背景与核心理念

### 1.1 问题诊断

当前 AI 跑团系统基于 DeepSeek LLM 构建，AI GM 通过系统提示词 + 角色卡 + 消息历史来生成叙事。这套架构在实际运行中面临几个核心挑战：

1. **记忆模糊**：LLM 的上下文窗口有限（当前保留 30 条消息），超出窗口的历史事件会被遗忘。玩家三小时前救过一只狗，AI GM 三小时后已经不知道这件事了。
2. **判定不一致**：同样的行动（如"说服卫兵"），AI GM 在不同时刻可能给出完全不同的难度判定，缺乏统一的数值标准。
3. **叙事与机制脱节**：角色卡中有属性、技能、装备等数值，但 AI GM 在做判定时并不真正使用这些数值——它只是"凭感觉"回应。
4. **成本高**：为了解决记忆问题，通常需要向量数据库 + 记忆检索系统，但这会大幅增加系统复杂度和运行成本。

### 1.2 命运公式的核心思想

命运公式（Fate Formula）将上述问题用一个简洁的数学模型解决：

```
结果 = F(玩家状态, 世界状态, 随机因子)

最终成功率 = (基础成功率 + Σ玩家修正 + Σ世界修正) × 难度系数
判定结果 = 掷骰 D100 ≤ 最终成功率 ? 成功 : 失败
```

核心理念是：**过去的因果已经被压缩进了状态数字里**。AI 不需要回忆"玩家三小时前救了一只狗"，因为这一行为的结果已经反映在人物卡的数值中（如声望 +3、村民好感度 +10）。

### 1.3 设计目标

| 目标 | 说明 |
|------|------|
| **确定性** | 同样的状态输入 → 同样的成功率（除随机因子外），AI 不会混淆或遗忘 |
| **可调试** | 任何结果都可以追溯到公式中的具体变量和系数 |
| **低成本** | 无需向量数据库、记忆检索，每次判定仅需一次数学计算 |
| **可扩展** | 数值来自角色卡和世界书，世界创作者可自定义修正规则 |
| **保留叙事力** | AI 仍负责生成叙事文本，公式只负责成功/失败判定 |

---

## 二、系统架构升级

### 2.1 整体架构（升级后）

```
┌─────────────────────────────────────────────────────────┐
│                      前端 RPG 界面                       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ 角色管理 │ │ 副本大厅 │ │ AI GM 聊天│ │ 命运修正面板 │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └──────┬──────┘ │
└───────┼──────────┼────────────┼───────────────┼─────────┘
        │          │            │               │
        ▼          ▼            ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                    API 层 (Next.js)                      │
│                                                         │
│  /api/rpg/campaigns/[id]  ← 核心 AI GM 端点（已集成）    │
│  /api/rpg/fate            ← 命运公式独立 API             │
│  /api/rpg/dice            ← 骰子服务                     │
│  /api/rpg/characters      ← 角色卡 CRUD                  │
│  /api/rpg/lorebooks       ← 世界书管理                   │
└─────────────────────────────────────────────────────────┘
        │          │            │
        ▼          ▼            ▼
┌─────────────────────────────────────────────────────────┐
│                    引擎层                                │
│                                                         │
│  lib/rpg/fate.ts    ← 命运公式引擎（fateCheck）          │
│  lib/rpg/dice.ts    ← 骰子引擎                          │
│  lib/rpg/economy.ts ← SEED 经济系统                     │
│  lib/rpg/types.ts   ← 类型定义                          │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│                    数据层 (SQLite)                       │
│                                                         │
│  rpg_characters.card_data  ← 含 flags/dynamic_state/     │
│                               relationships/attributes   │
│  rpg_campaigns.world_brief ← 含 global_variables         │
│  rpg_messages              ← 对话历史                    │
│  rpg_dice_rolls            ← 骰子日志                    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 AI GM 调用流程（升级后）

```
玩家输入动作
      │
      ▼
┌─────────────────┐
│ 1. 解析动作类型  │ ← inferActionType() 自动识别 或 前端指定
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. 收集玩家修正  │ ← 读取人物卡: cultivation.realm, reputation,
│                  │   flags, relationships, attributes
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. 收集世界修正  │ ← 读取副本: global_variables (势力值、季节等)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. 执行命运判定  │ ← fateCheck({ actionType, characterId,
│                  │    campaignId, difficulty })
│                  │    计算: rawRate × difficulty → finalRate
│                  │    掷骰: D100 → 成功/失败 + 成功度
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. 注入 LLM 上下文│ ← 将命运判定结果注入系统提示词
│                  │    AI 根据结果生成叙事文本
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. 返回响应      │ ← SSE 流式返回 GM 叙事 + 命运判定结果
│                  │    前端可展示成功率、修正明细
└─────────────────┘
```

---

## 三、命运公式引擎详解

### 3.1 核心函数签名

```typescript
fateCheck({
  actionType: string;      // 行动类型（如 'persuade_neutral'）
  characterId: string;     // 玩家角色 ID
  campaignId?: string;     // 副本 ID
  difficulty?: number;     // 难度系数 (0.3-2.0)
  extraPlayerMod?: number; // 额外玩家修正
  extraWorldMod?: number;  // 额外世界修正
  targetNpcId?: string;    // 涉及的目标 NPC
}): FateCheckResult
```

### 3.2 行动类型 × 基础成功率表

| 行动类型 | 基础成功率 | 说明 |
|----------|-----------|------|
| `persuade_neutral` | 50% | 说服中立 NPC |
| `persuade_hostile` | 20% | 说服敌对 NPC |
| `persuade_friendly` | 70% | 说服友好 NPC |
| `bargain` | 40% | 砍价 |
| `intimidate` | 35% | 威吓 |
| `deceive` | 45% | 欺骗 |
| `combat_attack` | 60% | 战斗攻击 |
| `combat_defend` | 50% | 战斗防御 |
| `combat_critical` | 10% | 暴击 |
| `stealth` | 55% | 潜行 |
| `lockpick` | 40% | 开锁 |
| `search` | 30% | 搜索 |
| `trap_detect` | 45% | 察觉陷阱 |
| `trap_disarm` | 40% | 解除陷阱 |
| `climb` | 50% | 攀爬 |
| `survival` | 45% | 野外生存 |
| `breakthrough_minor` | 70% | 突破小境界 |
| `breakthrough_major` | 10% | 突破大境界 |
| `alchemy` | 40% | 炼丹 |
| `crafting` | 45% | 炼器 |
| `healing` | 55% | 治疗 |
| `knowledge` | 50% | 知识检定 |
| `perception` | 55% | 感知检定 |

### 3.3 玩家修正来源

修正从人物卡的 `card_data` JSON 中提取，路径为 `trpg.dynamic_state`、`trpg.flags`、`trpg.relationships`、`trpg.attributes`：

| 来源 | 计算公式 | 示例 |
|------|---------|------|
| 修为境界 | `realm_value × 2` | 炼气三层 → 3 × 2 = +6 |
| 声望 | `floor(reputation / 10)` | 声望 45 → +4 |
| 属性 | `floor(max_attribute / 4)` | 最高属性 12 → +3 |
| flags.has_master_sword | +10 | 拥有名剑 |
| flags.cursed | `-5 × curse_level` | 诅咒 Lv2 → -10 |
| flags.poisoned | -10 | 中毒 |
| flags.master_revenge_pending | +5 | 复仇执念 |
| relationships[target] | `floor(value / 5)` | 信任 35 → +7 |

### 3.4 世界修正来源

从副本 `world_brief` 中的 `global_variables` 提取：

```json
{
  "global_variables": {
    "empire_power": 85,
    "season": "autumn",
    "region_safety": 25
  }
}
```

通用映射规则：`floor(variable_value / 10) - 5`（将 0-100 映射到 -5 到 +5）。

### 3.5 难度系数

| 情境 | 系数 | 示例 |
|------|------|------|
| 极其简单 | 1.5 | 用火球术点燃干草堆 |
| 简单 | 1.2 | 在集市上买普通商品 |
| 常规 | 1.0 | 说服普通村民帮忙 |
| 困难 | 0.8 | 在战斗中击中敏捷敌人 |
| 极难 | 0.6 | 越两级挑战修为更高的修士 |
| 几乎不可能 | 0.4 | 徒手推开三吨石门 |

### 3.6 成功度分级

| 等级 | 条件 (finalRate - roll) | 叙事建议 |
|------|------------------------|----------|
| 大成功 | ≥ 30 | 额外正面效果（如额外获得物品、声望大增） |
| 成功 | 15 ~ 29 | 标准成功 |
| 勉强成功 | -15 ~ 14 | 成功但有代价（如受伤、消耗额外资源） |
| 失败 | -30 ~ -16 | 标准失败 |
| 大失败 | ≤ -30 | 额外负面效果（如装备损坏、关系恶化） |

---

## 四、已完成的实现（Phase 1）

### 4.1 命运公式引擎

**文件**：`lib/rpg/fate.ts`（~390 行）

核心功能：
- `fateCheck(params)` — 执行完整命运判定
- `getFateModSummary(characterId, campaignId?)` — 获取修正摘要
- `realmToValue(realm)` — 修为境界转换
- `getActionTypes()` — 获取所有行动类型
- `getRealmList()` — 获取所有修为境界
- 导出常量：`ACTION_BASE_RATES`、`REALM_VALUES`、`DIFFICULTY_TABLE`、`DEFAULT_CONFIG`

### 4.2 命运公式 API

**文件**：`app/api/rpg/fate/route.ts`

- `POST /api/rpg/fate` — 执行命运判定
  ```json
  // 请求
  { "actionType": "persuade_neutral", "characterId": "xxx", "difficulty": 0.8 }
  // 响应
  { "success": true, "data": { "success": true, "finalRate": 47, "roll": 30, "degree": "success", ... } }
  ```
- `GET /api/rpg/fate?characterId=xxx&campaignId=xxx` — 获取修正摘要

### 4.3 AI GM 集成

**文件**：`app/api/rpg/campaigns/[id]/route.ts`（已修改）

在 `POST` 处理函数中新增：
1. 接收可选参数 `fateActionType` 和 `fateDifficulty`
2. 执行 `fateCheck()` 获取判定结果
3. 将结果注入 `buildGMPrompt()` 的系统提示词
4. 在 SSE 流式响应的 `done` 事件中返回 `fateResult`
5. 导出 `inferActionType()` 用于自动推断行动类型

### 4.4 人物卡导入

**文件**：`scripts/import-characters.mjs` / `scripts/import-characters-v2.mjs`

- 第一批：43 张角色卡成功导入（古代 12、科幻 8、仙侠 12、影视 11）
- 增强版 (v2)：使用手动代码块追踪替代正则，支持 JSON 修复
- 待导入：约 32 张因 Markdown 格式在 JSON 字符串中解析失败的角色卡

### 4.5 数据库状态

- `rpg_characters` 表：61 条记录（18 条原有 + 43 条导入）
- 所有角色卡包含完整的 `card_data` JSON，内含 `dynamic_state`、`flags`、`relationships`、`attributes`、`skills`、`equipment` 等字段

---

## 五、待实施的升级计划（Phase 2-4）

### Phase 2：前端命运公式集成（预计 2-3 天）

#### 2.1 命运修正面板

在 AI GM 聊天界面增加一个可折叠的"命运修正"面板：

- 显示当前角色的修正明细（修为、声望、属性、flags、关系）
- 显示当前副本的世界修正
- 实时显示总修正值
- 点击行动按钮时自动设置 `fateActionType`

#### 2.2 行动类型快捷按钮

在聊天输入框上方添加常用行动按钮：

```
[⚔️ 攻击] [💬 说服] [🔍 搜索] [🏃 潜行] [🧪 炼丹] [🔓 开锁] ...
```

点击后：
1. 自动设置 `fateActionType`
2. 可选设置 `fateDifficulty`
3. 用户输入具体行动描述
4. 提交时携带命运判定参数

#### 2.3 判定结果可视化

在 AI GM 的回复消息中展示命运判定结果卡片：

```
┌────────────────────────┐
│ 🎲 命运判定             │
│ 行动: 说服中立NPC       │
│ 成功率: 47%            │
│ 掷骰: 30 → ✓ 成功      │
│ 修为+6 声望+4 flag+10  │
│ 世界修正: 帝国强权-3    │
└────────────────────────┘
```

### Phase 3：世界书命运规则系统（预计 3-5 天）

#### 3.1 世界书中定义修正规则

在世界书的条目中增加 `fate_modifiers` 类型：

```json
{
  "id": "fate_merchant_rule",
  "type": "fate_modifier",
  "action": "bargain",
  "condition": "flags.has_merchant_IOU == true",
  "modifier": +15,
  "description": "持有商人的欠条"
}
```

#### 3.2 全局变量管理

在副本中增加 `campaign_state` 表：

```sql
CREATE TABLE rpg_campaign_state (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  variables TEXT NOT NULL DEFAULT '{}',  -- JSON: { "empire_power": 85, "season": "autumn" }
  updated_at TEXT NOT NULL
);
```

支持 AI GM 叙事中自动更新全局变量（如"帝国势力下降了 5"）。

#### 3.3 NPC 对抗判定

当玩家与 NPC 对抗时，双方各自执行命运判定：

```
玩家攻击 NPC:
  玩家 combat_attack(60%) + 玩家修正 → 玩家成功率
  NPC combat_defend(50%) + NPC 修正 → NPC 成功率
  比较成功度 → 确定胜负
```

### Phase 4：高级功能（预计 5-7 天）

#### 4.1 状态自动更新

AI GM 叙事结束后，根据命运判定结果自动更新角色卡状态：

```
大成功 → 声望 +2, 目标好感度 +10
成功 → 声望 +1, 目标好感度 +5
失败 → 声望 -1, 目标好感度 -5
大失败 → 声望 -3, 目标好感度 -15, 可能获得 debuff
```

#### 4.2 Flag 生命周期管理

- Flag 的自动创建：AI GM 叙事中提到的新状态自动创建为 flag
- Flag 的自动过期：某些 flag 在特定条件满足后自动清除
- Flag 的连锁触发：flag A + flag B 触发隐藏事件

#### 4.3 命运公式平衡性分析面板

为世界创作者提供工具：
- 模拟 1000 次相同条件下的命运判定
- 显示成功率分布
- 提示过强或过弱的修正组合
- 建议难度系数调整

#### 4.4 回合制战斗系统

基于命运公式构建完整的回合制战斗：
- 行动队列（按敏捷排序）
- 技能冷却
- 状态效果持续回合
- 战斗日志

---

## 六、技术实现要点

### 6.1 性能考虑

- `fateCheck()` 每次调用约 0.5ms（纯数学计算 + 2 次 SQL 查询）
- 建议前端在用户输入时实时调用 `GET /api/rpg/fate` 获取修正摘要（无状态变更，可缓存）
- 实际判定仅在用户提交行动时执行一次

### 6.2 安全性

- 命运公式只读取角色卡数据，不修改
- 状态更新需要明确的 API 调用，不会自动修改
- 所有修正值有上下限（5%-95%），防止极端情况

### 6.3 扩展性

- 行动类型表（`ACTION_BASE_RATES`）可通过世界书动态扩展
- 修为境界表（`REALM_VALUES`）支持自定义世界观（如魔法等级、科技水平）
- Flag 修正规则可通过世界书配置，无需修改核心代码

### 6.4 向后兼容

- 所有新参数（`fateActionType`、`fateDifficulty`）均为可选
- 不传这些参数时，AI GM 行为与升级前完全一致
- `fateResult` 在响应中为 `null` 时，前端不需要特殊处理

---

## 七、角色卡格式规范（供世界创作者参考）

为了让角色卡充分利用命运公式，建议在 `card_data` 的 `trpg` 扩展中包含以下字段：

```json
{
  "name": "角色名",
  "description": "...",
  "personality": "...",
  "trpg": {
    "system": "xianxia",
    "level": 3,
    "attributes": {
      "力量": 8, "敏捷": 6, "体质": 7,
      "智力": 5, "意志": 6, "魅力": 4
    },
    "skills": {
      "剑术": 10, "炼丹": 6, "潜行": 4
    },
    "equipment": ["玄铁剑", "护身符"],
    "backstory": "...",
    "dynamic_state": {
      "cultivation": { "realm": "炼气三层", "realm_value": 3 },
      "reputation": 15,
      "resources": 40,
      "health": 80
    },
    "flags": {
      "has_master_sword": true,
      "cursed": 2,
      "poisoned": false,
      "master_revenge_pending": true
    },
    "relationships": [
      { "target": "药铺老板", "value": 35 },
      { "target": "官府捕头", "value": -20 }
    ]
  }
}
```

### 关键字段说明

| 字段 | 类型 | 用途 |
|------|------|------|
| `trpg.attributes` | Record<string, number> | 属性值（1-20），取最高者 /4 作为通用修正 |
| `trpg.dynamic_state.cultivation.realm` | string | 修为境界，映射到 REALM_VALUES 表 |
| `trpg.dynamic_state.reputation` | number | 声望值（0-100），/10 作为修正 |
| `trpg.flags` | Record<string, boolean\|number> | 离散状态标记，预定义的 flag 有固定修正值 |
| `trpg.relationships` | Array<{target, value}> | NPC 关系值（-100 到 +100），/5 作为修正 |

---

## 八、部署说明

### 部署文件清单

| 文件 | 状态 |
|------|------|
| `lib/rpg/fate.ts` | ✅ 已部署 |
| `app/api/rpg/fate/route.ts` | ✅ 已部署 |
| `app/api/rpg/campaigns/[id]/route.ts` | 待部署（含命运公式集成） |
| `scripts/import-characters-v2.mjs` | 待上传 |

### 部署步骤

```bash
# 1. 上传新文件
scp -i ~/.ssh/fireseed_key deploy/app/api/rpg/campaigns/\[id\]/route.ts \
  root@43.128.134.77:/root/ai-novel-lite/app/api/rpg/campaigns/\[id\]/route.ts

scp -i ~/.ssh/fireseed_key deploy/import-characters-v2.mjs \
  root@43.128.134.77:/root/ai-novel-lite/scripts/import-characters-v2.mjs

# 2. 构建
cd /root/ai-novel-lite && npm run build

# 3. 重启
pm2 restart ai-novel

# 4. （可选）运行导入脚本导入剩余角色卡
node scripts/import-characters-v2.mjs "path/to/character_cards.md"
```

---

## 九、总结

命运公式系统的核心价值在于**用数学确定性替代记忆模糊性**。通过将 AI 跑团中 90% 的判定场景纳入一个可计算的框架，我们获得了：

- **一致性**：同样的角色状态 → 同样的成功率
- **透明性**：每次判定的修正来源都可追溯
- **低成本**：无需向量数据库，每次判定仅需 ~0.5ms
- **可扩展**：世界创作者可通过世界书自定义修正规则

而剩下的 10%（如复杂的叙事依赖、多步骤谜题），仍然由 LLM 的自然语言能力处理。命运公式 + LLM 叙事的混合架构，是在当前技术条件下实现稳定、沉浸、低成本 AI 跑团体验的最优解。

---

*文档版本 2.0 · 基于命运公式设计思路 v1.0 · QoderWork AI RPG 系统*