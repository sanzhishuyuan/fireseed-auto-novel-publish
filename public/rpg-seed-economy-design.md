# 雾隐酒馆 × SEED 经济 — 融合设计方案

> 版本：v1.0 | 日期：2026-06-12
> 核心命题：人物卡 / 世界书 / 战役模组 作为可交易数字资产，融入 FireSeed SEED 经济体系

---

## 一、设计总纲：三層资产体系

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RPG 数字资产三层体系                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  第一层：个人资产（免费 · 自用）                              │    │
│  │                                                             │    │
│  │  · 任何人可创建，无限额度                                   │    │
│  │  · 仅自己可见，不可交易                                     │    │
│  │  · 不消耗SEED，不计入经济系统                               │    │
│  │  · 能力：完整编辑、导出、用于个人战役                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  第二层：共享资产（免费 · 社区共用）                              │    │
│  │                                                             │    │
│  │  · 用户将自建资产标记为「公开」                               │    │
│  │  · 所有人可查看、复制到自己的个人库                           │    │
│  │  · 免费使用，原作者获得「社区贡献积分」                       │    │
│  │  · 积分影响作者信誉等级，解锁高级创作工具                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  第三层：专业资产（付费 · 市场流通）                              │    │
│  │                                                             │    │
│  │  · 创作者为资产定价（SEED），买家付费购买                     │    │
│  │  · 购买后进入买家个人库，可自用不能再售（或可设定转售分成）    │    │
│  │  · 平台抽成 10%，创作者获得 85%，创作者基金池 5%             │    │
│  │  · 专业资产需要创作者达到一定信誉等级才能发布                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 核心设计原则

1. **不剥夺免费体验**：个人创作、私人使用完全免费，SEED 只在「获得他人的专业创作」时介入
2. **创作者阶梯**：从个人 → 共享 → 专业，逐步升级，每一步都有明确的价值信号
3. **SEED 是价值媒介，不是门槛**：消费 SEED 获得的是他人时间和专业技能的结晶，不是"解锁功能"
4. **通缩与通胀平衡**：平台抽成的 50% 销毁，50% 注入创作者基金池

---

## 二、资产类型与定价模型

### 2.1 人物卡（Character Card）

| 属性 | 个人层 | 共享层 | 专业层 |
|------|--------|--------|--------|
| 创建 | ✅ 免费无限 | ✅ 免费 | ✅ 需要信誉等级 ≥ L2 |
| 可见性 | 仅自己 | 全平台 | 全平台（付费解锁完整卡面） |
| 他人使用 | ❌ | 免费复制到个人库 | 需购买（永久拥有） |
| 编辑权限 | 完全 | 仅复制的副本 | 仅复制的副本 |
| 下载（PNG导出） | ✅ 免费 | ✅ 免费 | ✅ 购买后免费 |
| 定价 | - | - | 创作者自定（10-500 SEED） |
| 平台抽成 | - | - | 10% |
| 推荐定价区间 | - | - | 简单角色卡：10-30 SEED |
| | | | 精製角色卡（含立绘/背景故事）：50-150 SEED |
| | | | 传奇角色卡（含专属世界书/多形态）：200-500 SEED |

**角色卡交易流程**：
```
买家浏览市场 → 看到专业角色卡（有免费缩略预览）→ 支付 SEED 购买
→ 角色卡解锁到买家个人库 → 买家可导入战役使用 / 导出 PNG
→ 平台记录交易：买家扣款，创作者收款（扣除平台抽成）
→ 交易双方获得评价机会
```

### 2.2 世界书 / 设定集（Lorebook / World Bible）

世界书比人物卡更复杂——它本质上是**结构化的知识图谱**。定价需要反映其深度和广度。

| 属性 | 个人层 | 共享层 | 专业层 |
|------|--------|--------|--------|
| 创建 | ✅ 免费无限 | ✅ 免费 | ✅ 需要信誉等级 ≥ L2 |
| 条目上限 | 无限 | 50 条以内可免费分享 | 不限 |
| 他人使用 | ❌ | 浏览全文但不能复制 | 购买后可复制到个人库 |
| 引用方式 | 个人战役直接引用 | 仅可查看学习 | 可复制编辑 + 战役引用 |
| 定价 | - | - | 创作者自定（20-2000 SEED） |
| 推荐定价区间 | - | - | 微型（5-10 条目）：20-50 SEED |
| | | | 标准（20-50 条目）：50-200 SEED |
| | | | 史诗（100+ 条目，含地图/时间线/NPC表）：300-2000 SEED |

**世界书特有的「引用许可」机制**：
```
┌──────────────────────────────────────────────────────────────────┐
│ 世界书的三种使用模式                                              │
│                                                                  │
│  1. 浏览模式（免费）                                              │
│     在市场中看到世界书的目录、简介、前 3 条条目样本                │
│     可点赞、收藏、评论                                            │
│                                                                  │
│  2. 引用模式（购买后可用）                                        │
│     将世界书关联到自己的战役，AI GM 自动读取设定                   │
│     不可编辑条目内容（只读引用）                                  │
│     定价: 原价的 60%（因为不创建副本）                            │
│                                                                  │
│  3. 复制模式（购买后可用）                                        │
│     将世界书完整复制到自己的个人库                                │
│     可编辑、扩展、派生新的世界书                                  │
│     定价: 原价的 100%                                            │
│     派生作品自动标注「基于 xxx 的世界书」                        │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 战役模组（Campaign Module）

战役模组是最复杂的资产——它是一个**完整的冒险剧本**，包含预设角色、世界书、剧情分支、遭遇战设计。

| 属性 | 个人层 | 共享层 | 专业层 |
|------|--------|--------|--------|
| 创建 | ✅ 免费无限 | ✅ 免费 | ✅ 需要信誉等级 ≥ L3 |
| 内容 | 个人战役 | 战役摘要 + 评价 | 完整模组（含世界书/角色卡/NPC/地图描述/剧情分支） |
| 他人游玩 | ❌ | 可加入战役体验 | 购买后创建私人战役实例 |
| 定价 | - | - | 创作者自定（50-5000 SEED） |
| 平台抽成 | - | - | 15%（因含更多平台资源消耗） |
| 推荐定价 | - | - | 短篇（1-2 次游玩）：50-200 SEED |
| | | | 中篇（3-6 次游玩）：200-800 SEED |
| | | | 长篇（10+ 次游玩 + 完整设定）：800-5000 SEED |

### 2.4 AI GM 交互消耗（按次计费）

这是一个独立的 SEED 消耗场景——每次 AI GM 调用消耗少量 SEED，用于 offset LLM API 成本。

```
┌──────────────────────────────────────────────────────────────────┐
│ AI GM 调用计费                                                   │
│                                                                  │
│  每次 AI GM 响应（即每次玩家行动后 GM 的叙事输出）:               │
│  → 单人战役：1 SEED / 次响应                                     │
│  → 多人战役：0.5 SEED / 人 / 次响应                              │
│  → 骰子检定：免费（不计费）                                      │
│  → 世界书引用：免费（已包含在 GM 调用中）                        │
│                                                                  │
│  月预算参考：                                                    │
│  单人玩家每天玩 10 轮 → 300 SEED/月                              │
│  这 ≈ 一杯奶茶的价格，可持续    │
│                                                                  │
│  对比：直接调用 DeepSeek API 的成本约为 0.5 SEED/次              │
│  平台收取 1 SEED/次，其中 0.5 用于覆盖 API 成本，0.5 为平台收入  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、市场机制设计

### 3.1 统一 RPG 市场

在现有 `/tasks`（任务市场）和 `/skills`（技能中心）之外，新增 **`/rpg/market` 跑团市场**，统一展示三类可交易资产。

```
┌──────────────────────────────────────────────────────────────────┐
│  /rpg/market  跑团市场                                           │
│                                                                  │
│  ┌──────┬──────┬──────┬──────┬──────┬──────────┐               │
│  │ 推荐  │ 人物卡 │ 世界书 │ 模组  │ 创作任务 │ 筛选/排序   │               │
│  └──────┴──────┴──────┴──────┴──────┴──────────┘               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  精选推荐（编辑推荐 / 热门 / 新品）                       │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                      │   │
│  │  │角色A │ │世界X │ │模组Y │ │角色B │                      │   │
│  │  │⭐⭐⭐⭐⭐│ │⭐⭐⭐⭐│ │⭐⭐⭐⭐⭐│ │⭐⭐⭐ │                      │   │
│  │  │ 120🌱│ │ 350🌱│ │800🌱 │ │ 45🌱 │                      │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  免费共享区                                               │   │
│  │  人物卡(237) · 世界书(89) · 模组(12)                     │   │
│  │  全部免费复制使用，为创作者带来社区积分                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  创作任务                                                 │   │
│  │  我需要一个赛博朋克风格的角色卡 · 预算 80 SEED · 3 人竞标 │   │
│  │  求克苏鲁风格微型世界书（15+条目） · 预算 150 SEED       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 交易流程（含争议处理）

```
买家发现商品 → 查看完整预览（付费前的缩略展示）
  │
  ├── 免费资产 → 一键复制到个人库 → 完成
  │
  └── 付费资产 → 点击购买
        │
        ├── 检查买家 SEED 余额
        ├── 不足 → 提示充值/获取 SEED 的方式
        │
        └── 充足 → 扣款 SEED → 冻结到平台托管账户
              │
              ├── 数字资产（角色卡/世界书）:
              │    即时交付 → 买家确认收货
              │    → 平台解冻 SEED → 转入创作者钱包（扣除抽成）
              │    → 双方互评
              │
              └── 创作任务（需人工交付）:
                    发布任务 → 创作者接单 → 交付作品
                    → 买家审核（72小时自动确认）
                    → 确认 → 释放 SEED 给创作者
                    → 驳回 → 进入修改流程（最多 3 轮）
                    → 仍不满意 → 争议处理
```

### 3.3 争议处理机制

```
争议触发条件：
· 买家认为交付物不符合描述
· 创作者认为买家无理拒收
· 超过 7 天未完成交付

争议流程：
1. 双方各自提交证据（聊天记录、需求文档、交付物截图）
2. 平台仲裁委员会（由信誉等级 L3+ 创作者轮流担任）投票
3. 72 小时内出结果
4. 结论：全额退款 / 部分退款（如 50%）/ 全额放款

仲裁激励：
· 每次参与仲裁获得 5 SEED + 1 信誉积分
· 仲裁结果与多数一致额外 +3 信誉积分
· 恶意仲裁（多次与最终结果相悖）扣除信誉积分
```

### 3.4 信誉等级系统

```
信誉等级通过以下维度综合计算：
· 发布共享资产数量 × 权重
· 专业资产销售量 × 权重
· 买家评价（1-5 星）平均分
· 社区贡献积分（他人复制免费资产的次数）
· 争议处理历史（胜诉加分，败诉减分）

等级阶梯：
┌──────┬────────────┬──────────────────────────────────────┐
│ 等级  │ 所需积分    │ 解锁能力                              │
├──────┼────────────┼──────────────────────────────────────┤
│ L0   │ 0          │ 个人资产 · 加入战役                    │
│ L1   │ 50         │ 共享资产 · 评价他人 · 发起创作任务      │
│ L2   │ 200        │ 发布专业资产 · 定价上限 500 SEED       │
│ L3   │ 800        │ 发布战役模组 · 定价无上限 · 参与仲裁    │
│ L4   │ 3000       │ 创作者基金投票权 · 优先推荐位          │
│ L5   │ 10000      │ 平台创作者顾问 · 定制分成比例(可谈)    │
└──────┴────────────┴──────────────────────────────────────┘
```

---

## 四、SEED 经济循环设计

### 4.1 新增 SEED 流转路径

```
                    ┌──────────────────────────────────┐
                    │         SEED 经济循环             │
                    └──────────────────────────────────┘

输入（获取 SEED）:
  ├── 注册赠送 100 SEED（已有）
  ├── 发布小说/章节奖励（已有）
  ├── 创作任务完成（新：角色卡/世界书/模组创作）
  ├── 专业资产销售（新：他人购买你的创作）
  ├── 社区贡献积分兑换（新：共享资产被复制时积累）
  └── 每日签到/活跃奖励（已有）

流通（消耗 SEED）:
  ├── 购买专业角色卡（新）
  ├── 购买专业世界书 - 引用模式 / 复制模式（新）
  ├── 购买战役模组（新）
  ├── 发布创作任务（新：发布任务时冻结预算）
  ├── AI GM 交互消耗（新：每次 GM 响应）
  ├── 支持众筹（已有）
  └── VIP 订阅（已有）

输出（SEED 回收/通缩）:
  ├── 平台交易抽成 10%
  │     ├── 50% 销毁（通缩）
  │     └── 50% 进入创作者基金
  ├── AI GM 交互收入
  │     ├── 50% 覆盖 LLM API 成本
  │     └── 50% 平台收入 → 销毁 50%
  └── 创作者基金
        ├── 社区活动奖励
        ├── 创作大赛奖金
        └── 新创作者扶持计划
```

### 4.2 经济模型预估

**假设 DAU 500 的跑团用户**：

```
日均 AI GM 调用：
  500 用户 × 日均 10 次交互 × 1 SEED = 5,000 SEED/日
  月消耗：150,000 SEED

专业资产交易：
  日均 50 笔交易 × 均价 100 SEED = 5,000 SEED/日
  月流通：150,000 SEED

创作任务：
  日均 20 个新任务 × 均价 200 SEED = 4,000 SEED/日
  月流通：120,000 SEED

总计月新增流通：420,000 SEED

平台月收入：
  AI GM 利润：150,000 × 0.5 = 75,000 SEED（覆盖API成本后的毛利）
  交易抽成：150,000 × 10% = 15,000 SEED
  任务抽成：120,000 × 10% = 12,000 SEED
  月总收入：102,000 SEED
  月销毁（50%）：51,000 SEED
  月基金注入：51,000 SEED

创作者月收入：
  专业资产销售：150,000 × 85% = 127,500 SEED（≈ 42 名创作者的月收入）
  创作任务：120,000 × 90% = 108,000 SEED（≈ 36 名创作者的月收入）
  平均每人月收入：(127,500 + 108,000) / 60 = 3,925 SEED
```

### 4.3 创作者基金

```
创作者基金来源：
· 每次专业资产交易的 5%（平台抽成外的额外部分）
· 平台 AI GM 利润的 10%

基金用途：
┌──────────────────────────────────────────────────────────────────┐
│ 基金分配（每月）                                                 │
│                                                                  │
│  40% 创作大赛奖金                                                │
│   ├── 最佳角色卡大赛（月度）: 第1名 2000, 第2名 1000, 第3名 500  │
│   └── 最佳世界书大赛（月度）: 第1名 3000, 第2名 1500, 第3名 800  │
│                                                                  │
│  30% 新创作者扶持                                                │
│   ├── L1→L2 升级奖励：达到 L2 时一次性奖励 200 SEED             │
│   └── 首笔交易奖励：完成第一笔专业资产销售时奖励 100 SEED       │
│                                                                  │
│  20% L4/L5 创作者顾问委员会运营                                  │
│   └── 顾问月度津贴：L4 500 SEED/月, L5 1500 SEED/月            │
│                                                                  │
│  10% 突发储备                                                    │
│   └── 争议退款垫付、Bug 补偿等                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 五、数据库设计（增量）

### 5.1 新增表 + 修改表

#### 修改 `rpg_lorebooks` — 增加定价和统计字段

```sql
-- 新增字段
ALTER TABLE rpg_lorebooks ADD COLUMN seed_price INTEGER DEFAULT 0;
ALTER TABLE rpg_lorebooks ADD COLUMN download_count INTEGER DEFAULT 0;
ALTER TABLE rpg_lorebooks ADD COLUMN copy_count INTEGER DEFAULT 0;   -- 被引用/复制次数
ALTER TABLE rpg_lorebooks ADD COLUMN avg_rating REAL DEFAULT 0;
ALTER TABLE rpg_lorebooks ADD COLUMN rating_count INTEGER DEFAULT 0;
ALTER TABLE rpg_lorebooks ADD COLUMN license_type TEXT DEFAULT 'personal';
-- personal / public_free / public_reference / public_full
```

#### 修改 `rpg_characters` — 增加评价和信誉字段

```sql
ALTER TABLE rpg_characters ADD COLUMN avg_rating REAL DEFAULT 0;
ALTER TABLE rpg_characters ADD COLUMN rating_count INTEGER DEFAULT 0;
ALTER TABLE rpg_characters ADD COLUMN copy_count INTEGER DEFAULT 0;
ALTER TABLE rpg_characters ADD COLUMN license_type TEXT DEFAULT 'personal';
```

#### 新增 `rpg_market_listings` — 市场挂牌表

```sql
CREATE TABLE rpg_market_listings (
  id TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL,          -- 'character' / 'lorebook' / 'module'
  asset_id TEXT NOT NULL,            -- 对应 rpg_characters.id / rpg_lorebooks.id / ...
  seller_id TEXT NOT NULL,           -- 卖家
  price INTEGER NOT NULL,            -- SEED 价格
  license_mode TEXT NOT NULL,        -- 'full_copy' / 'reference_only'
  status TEXT DEFAULT 'active',      -- active / sold / cancelled
  platform_fee INTEGER DEFAULT 0,    -- 平台抽成
  creator_share INTEGER DEFAULT 0,   -- 创作者到手
  buyer_id TEXT,                     -- 买家
  sold_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);
CREATE INDEX idx_market_type ON rpg_market_listings(asset_type, status);
CREATE INDEX idx_market_seller ON rpg_market_listings(seller_id);
```

#### 新增 `rpg_asset_library` — 用户资产库（购买的资产记录）

```sql
CREATE TABLE rpg_asset_library (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,          -- 'character' / 'lorebook' / 'module'
  asset_id TEXT NOT NULL,            -- 原始资产 ID
  license_mode TEXT NOT NULL,        -- 'full_copy' / 'reference_only'
  source TEXT NOT NULL,              -- 'self_created' / 'public_free' / 'purchased'
  source_listing_id TEXT,            -- 如果是从市场购买，关联 listing
  acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_library_user ON rpg_asset_library(user_id, asset_type);
```

#### 新增 `rpg_creator_ratings` — 创作者评价表

```sql
CREATE TABLE rpg_creator_ratings (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,           -- 关联市场挂牌
  rater_id TEXT NOT NULL,            -- 评价者（买家）
  ratee_id TEXT NOT NULL,            -- 被评价者（创作者）
  rating INTEGER NOT NULL,           -- 1-5 星
  review TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES rpg_market_listings(id),
  FOREIGN KEY (rater_id) REFERENCES users(id),
  FOREIGN KEY (ratee_id) REFERENCES users(id)
);
CREATE INDEX idx_ratings_ratee ON rpg_creator_ratings(ratee_id);
```

#### 新增 `rpg_commission_tasks` — 创作任务表

```sql
CREATE TABLE rpg_commission_tasks (
  id TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL,          -- 'character' / 'lorebook' / 'module'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requester_id TEXT NOT NULL,        -- 发布者
  budget INTEGER NOT NULL,           -- SEED 预算
  deadline DATETIME,
  status TEXT DEFAULT 'open',        -- open / assigned / submitted / completed / cancelled / disputed
  assignee_id TEXT,
  submitted_at DATETIME,
  completed_at DATETIME,
  delivery_asset_id TEXT,            -- 交付的资产 ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id)
);
CREATE INDEX idx_commission_status ON rpg_commission_tasks(status);
CREATE INDEX idx_commission_requester ON rpg_commission_tasks(requester_id);
```

#### 修改 `transactions` — 增加 RPG 相关交易类型

```typescript
type TransactionType = 
  | ... // 已有类型
  // RPG 新增
  | 'rpg_purchase'       // 购买专业 RPG 资产
  | 'rpg_commission_pub' // 发布创作任务（冻结预算）
  | 'rpg_commission_pay' // 创作任务完成付款
  | 'rpg_commission_refund' // 创作任务退款
  | 'rpg_gm_interact'    // AI GM 交互消耗
  | 'rpg_royalty'        // 创作者资产销售收入
  | 'rpg_community_bonus' // 社区贡献积分兑换
  | 'rpg_fund_reward'    // 创作者基金奖励
```

### 5.2 新增用户信誉分表

```sql
-- 创作者信誉积分
ALTER TABLE users ADD COLUMN creator_score INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN creator_level INTEGER DEFAULT 0;  -- L0-L5
ALTER TABLE users ADD COLUMN total_public_contributions INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_sales_volume INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_rating_sum INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_rating_count INTEGER DEFAULT 0;
```

---

## 六、API 设计

### 6.1 市场 API

```
┌──────────────────────────────────────────────────────────────────┐
│  GET  /api/rpg/market                   市场首页（推荐/热门/新品） │
│  GET  /api/rpg/market/items            浏览资产（筛选/排序/分页） │
│  GET  /api/rpg/market/items/:id        资产详情（含预览内容）    │
│  POST /api/rpg/market/items/:id/buy    购买资产                  │
│  POST /api/rpg/market/listings         挂牌出售（从个人库上架）   │
│  PATCH /api/rpg/market/listings/:id    修改挂牌（价格/下架）     │
│  DELETE /api/rpg/market/listings/:id    下架                     │
│                                                                  │
│  GET  /api/rpg/market/my-listings      我挂出的资产              │
│  GET  /api/rpg/market/my-purchases     我购买的资产              │
│                                                                  │
│  POST /api/rpg/market/listings/:id/rate 评价交易                 │
│  GET  /api/rpg/market/ratings/:userId  查看创作者评价            │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 创作任务 API

```
┌──────────────────────────────────────────────────────────────────┐
│  POST   /api/rpg/commissions             发布创作任务             │
│  GET    /api/rpg/commissions             浏览任务市场             │
│  GET    /api/rpg/commissions/:id         任务详情                 │
│  POST   /api/rpg/commissions/:id/bid     竞标接单                 │
│  POST   /api/rpg/commissions/:id/assign  指定接单（发布者）       │
│  POST   /api/rpg/commissions/:id/submit  提交交付物（创作者）     │
│  POST   /api/rpg/commissions/:id/approve 确认完成（发布者）       │
│  POST   /api/rpg/commissions/:id/dispute 发起争议                 │
│  POST   /api/rpg/commissions/:id/cancel  取消任务                 │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 AI GM 计费 API

```
┌──────────────────────────────────────────────────────────────────┐
│  POST /api/rpg/gm/action       AI GM 行动（含 SEED 扣费）       │
│  GET  /api/rpg/gm/balance      查看当前战役的 SEED 余额          │
│  POST /api/rpg/gm/topup        为战役充值 SEED                   │
│  GET  /api/rpg/gm/usage        查看 AI GM 使用统计              │
└──────────────────────────────────────────────────────────────────┘
```

### 6.4 创作者基金 API

```
┌──────────────────────────────────────────────────────────────────┐
│  GET  /api/rpg/fund/overview      基金概况（总额/分配记录）      │
│  GET  /api/rpg/fund/contests      创作大赛列表                   │
│  POST /api/rpg/fund/contests/:id/apply  申请参赛                 │
│  GET  /api/rpg/fund/grants        扶持计划/奖励记录              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 七、用户流程全景

### 场景一：小林想跑团但没有角色卡

```
1. 打开 fireseed.online → 点击「AI 跑团」
2. 看到「角色工坊」入口
3. 不想自己写 → 点击「跑团市场」
4. 在人物卡分类浏览 → 免费共享区看到一个喜欢的精灵游侠卡
5. 点击「复制到我的角色库」→ 免费获得
6. 创建战役 → 选择这张角色卡 → 开始跑团
7. 每次 AI GM 响应消耗 1 SEED → 小林有注册赠送的 100 SEED
8. 玩了 50 轮后 SEED 用完 → 看到提示「获取更多 SEED」
9. 小林发布了一部自己的小说 → 获得 100 SEED 奖励
10. 继续跑团之旅 🎲
```

### 场景二：创作者阿花制作专业世界书

```
1. 阿花是一位 TRPG 资深玩家，花了两周制作了一个赛博朋克世界书
2. 包含 85 个条目（势力/地点/NPC/装备/事件表）
3. 她在个人库中创作完成 → 选择「挂牌出售」
4. 定价 350 SEED → 选择「引用模式 210 SEED / 复制模式 350 SEED」
5. 系统提示：需要 L2 以上信誉才能发布专业资产
6. 阿花之前分享了 3 个免费世界书，获得了 120 社区积分 → 刚好达到 L2
7. 世界书上架 → 被编辑推荐到精选位
8. 一周内被 12 人引用购买（210 SEED × 12 = 2,520 SEED）
9. 平台抽成 10%（252 SEED）
10. 阿花到手 2,268 SEED
11. 扣除 AI GM 使用成本约 300 SEED/月
12. 阿花月净收入 ≈ 1,968 SEED（约 ¥100 等价）
13. 随着信誉提升到 L3，阿花开始制作战役模组（定价 800 SEED）
```

### 场景三：团长老张发布创作任务

```
1. 老张想为他的 D&D 战役找一个特殊的 NPC 角色卡
2. 具体要求：半龙人术士，带有龙脉背景故事，包含 3 个专属法术
3. 老张发布创作任务 → 预算 80 SEED → 描述详细需求
4. 3 位创作者竞标 → 老张查看了他们的作品集
5. 选择了信誉 L2 的创作者小李
6. 小李 2 天后交付 → 老张审核通过
7. 80 SEED 扣除平台抽成 10% → 小李到手 72 SEED
8. 双方互相好评 → 小李获得信誉积分
9. 这张角色卡可以免费共享 → 为小李带来更多社区积分
```

---

## 八、「天才」机制亮点

### 8.1 引用模式（Reference Mode）

这是本方案最独特的设计。传统数字资产市场只有「买/不买」二分法，而引用模式创造了一个**中间层**：

```
买断（复制模式）: 适合深度创作者，需要修改世界书内容
引用模式:        适合普通玩家，只需要在战役中使用

对创作者的好处：
· 同一份作品可以卖两次——低价的引用给普通玩家，高价的复制给创作者
· 引用模式下作品仍归创作者所有，不会被二次转售

对买家的好处：
· 只需 60% 的价格即可使用世界书
· 不需要维护世界书的完整性

对平台的好处：
· 增加交易频次（更多人买得起）
· 保护创作者权益（减少盗版转售）
```

### 8.2 免费共享 × 信誉积分联乘

这是**冷启动的核武器**：

```
免费不是没有价值，而是另一种价值交换：

创作者发布免费共享资产 → 获得社区贡献积分
→ 积分累积提升信誉等级
→ 信誉等级解锁专业资产发布权
→ 专业资产带来 SEED 收入
→ SEED 收入再投资于创作更多免费资产
→ 正向飞轮 🌀

这样设计解决了平台冷启动的核心问题：
· 没有专业资产时，免费资产填充市场
· 免费资产培养创作者的创作习惯和品牌
· 创作者为了解锁专业发布权而有动力贡献免费资产
· 等创作者达到 L2 时，他们已经熟悉平台且有粉丝基础了
```

### 8.3 AI GM 计费 × 通缩模型

AI GM 是跑团平台的核心价值，也是天然的 SEED 消耗场景：

```
每轮 AI GM 响应（无论单人/多人）:
· 消耗 0.5-1 SEED
· 平台覆盖 LLM 成本后仍有 0.25-0.5 SEED 利润
· 利润的 50% 销毁 → 通缩
· 利润的 50% 注入创作者基金 → 反哺生态

这个设计让「玩跑团」本身就在为生态做贡献——
你玩的每一轮，都在帮助 SEED 通缩保值，
同时为创作者基金增加一份奖励池 💰
```

### 8.4 二级市场与版税（Future）

这是 v2.0 可以扩展的能力，但值得现在设计好架构：

```
初级市场：创作者 → 买家（本方案设计）
二级市场：买家 → 其他玩家（未来扩展）

版税机制：
· 当专业资产在二级市场转售时
· 原始创作者获得转售价的 5% 版税
· 平台获得 5%
· 转售者获得 90%

这样设计让优质创作者可以通过早期作品获得持续收入，
鼓励他们持续创作高质量的世界书和角色卡。
```

---

## 九、实施建议

### 实施路径（3 个 Sprint）

```
Sprint 1（第 1-2 周）：基础设施
├── 数据库迁移（新增表/字段）
├── 信誉等级系统（users 表扩展）
├── 市场挂牌 API（rpg_market_listings CRUD）
├── 资产库 API（rpg_asset_library CRUD）
└── 交易类型扩展（transactions 增加 RPG 类型）

Sprint 2（第 3-4 周）：核心交易流
├── 购买/出售/交付完整流程
├── 引用模式 vs 复制模式实现
├── 创作任务系统（rpg_commission_tasks）
├── AI GM 计费集成
├── 免费资产共享 + 社区积分
└── 前端：/rpg/market 页面

Sprint 3（第 5-6 周）：生态运营
├── 创作者评价系统
├── 争议处理流程
├── 创作者基金分配逻辑
├── 信誉等级前端展示
├── 经济仪表盘（创作者看自己的收入/资产数据）
└── 冷启动：官方制作 10-15 个高质量世界书/角色卡作为种子资产
```

### 已有代码复用

| 已有模块 | 复用方式 |
|---------|---------|
| `lib/seed.ts` | 直接复用 `transferSeed()`、`transferBetweenUsers()` |
| `lib/db.ts` | 复用数据库连接和迁移模式 |
| `novel_tasks` 系统 | 复用任务发布/接单/交付/争议流程模式 |
| `crowdfunding` 系统 | 复用资金托管/释放/退款逻辑 |
| `wallets` + `transactions` | 直接复用，仅扩展 TransactionType |
| `rpg_characters.is_public/seed_price/download_count` | 字段已存在，直接使用 |
| `rpg_lorebooks.is_public` | 复用，增加 seed_price 等字段 |

---

*本方案设计日期：2026-06-12 | 版本 v1.0*
