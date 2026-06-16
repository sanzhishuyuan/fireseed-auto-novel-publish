# FireSeed 平台升级历史

> 本文档整合了平台从 v2.0 至今的所有重大升级记录，包含系统设计、实施摘要和技术决策。
> 详细的设计文档请参考对应的独立文档（见文末索引）。

---

## 零、雾隐酒馆 AI 跑团平台（2026-06-11 ~ 2026-06-13）

### 0.1 核心引擎

- **RPG 数字资产市场**：角色/世界书/副本的完整买卖交易系统，支持上架、购买、资产转移全链路
- **副本体系（Campaign System）**：创建/上架/购买确认/经济字段，术语统一（副本 → Campaign，关卡 → Scene），通用角色模板支持跨副本复用
- **角色系统**：创建、编辑、自定义缓存、角色列表页

### 0.2 跑团经济

- **SEED 经济融合**：RPG 市场交易使用 SEED 作为统一货币
- **核心模块**：`lib/rpg/economy.ts`（经济逻辑）、`lib/rpg/types.ts`（类型定义）
- **经济闭环**：创作者上架资产 → 用户购买 → SEED 流转 → 创作者收益

### 0.3 新增页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/rpg/market` | RPG 数字资产市场 | 角色/世界书/副本交易大厅 |
| `/rpg/campaigns` | 副本广场 | 副本浏览、购买、运行 |
| `/rpg/characters` | 角色工坊 | 角色创建与管理 |
| `/rpg/lorebooks` | 世界书市场 | 世界观设定浏览与交易 |
| `/rpg/creator` | 创作者中心 | 跑团内容创作管理 |
| `/rpg/fund` | 创作者基金 | 基金申请与发放 |

### 0.4 世界书市场

- **首批导入**：6 部跑团世界书上架市场
- **定价策略**：免费入门世界书 + SEED 定价高级世界书组合
- **内容类型**：奇幻、科幻、恐怖、都市等多元题材

### 0.5 技术重构

- **84 路由 withRoute 封装**：全部路由迁移到统一高阶函数，消除认证/错误处理重复代码
- **44 路由 safeParseJSON 替换**：`raw request.json()` 全量替换，消除 JSON 解析异常
- **认证架构统一**：Admin + User-facing + AI 路由三层认证统一
- **全站 Obsidian Codex 风格**：Fraunces 衬线字体 + 金色调 + 纸纹质感，覆盖小说详情/阅读/市场/众筹/后台

---

## 一、平台 UX 与架构升级（2026-06-09）

### 1.1 背景与问题审计

平台在快速迭代过程中积累了以下技术问题：

- **Header 组件重复**：4 份副本分散在不同页面，字段定义存在差异
- **数据源冲突**：SQLite 与文件系统双数据源，存在不一致风险
- **类型安全薄弱**：大量 `any` 类型，User 接口定义 3+ 处且字段不统一
- **SEO 缺失**：多数页面缺少 per-page metadata 和结构化数据
- **移动端体验**：缺少汉堡菜单，导航在小屏设备上不可用

### 1.2 实施摘要

**Phase 1 — 紧急修复：**
- VIP 支付流程接入 SEED 积分
- 统计面板数据口径修复
- 测试数据过滤（排除测试账号）
- 中文编码问题修复
- 滚动公告栏（marquee）改造

**Phase 2 — 体验优化：**
- 首页重构为 Hero → 品类探索 → 推荐作品 → CTA → Footer 五段式布局
- 小说列表新增搜索、筛选、排序、分页
- 移动端汉堡菜单（Drawer 导航）
- ThemeProvider 统一主题管理
- Header 组件全局化（HeaderProvider），从各页面移除重复引用
- 共享类型定义集中到 `types/index.ts`
- SafeCover 迁移到 next/image

**Phase 3 — 架构整理：**
- 数据源统一：SQLite 为主，文件系统为降级备份
- 管理员密码迁移到 bcrypt 哈希
- JWT 密钥强制从环境变量读取

### 1.3 遗留技术债务

- 音乐播放器 useEffect 依赖项问题
- WalletBadge 串行请求（应改为并行）
- `<a>` 标签应替换为 `<Link>` 组件
- novels.ts 路径遍历漏洞（需验证 `..` 防护）
- 构建脚本中的数据保护机制待完善

---

## 二、SEED 经济系统升级（2026-05-28 ~ 2026-06-10）

### 2.1 任务市场系统

**数据库设计：**

```sql
CREATE TABLE novel_tasks (
  id TEXT PRIMARY KEY,
  novel_id TEXT,
  publisher_id TEXT,        -- 发布者（读者）
  author_id TEXT,           -- 承接者（作者）
  title TEXT NOT NULL,
  description TEXT,
  target_words INTEGER,     -- 目标字数
  budget INTEGER,           -- SEED 预算
  status TEXT DEFAULT 'open', -- open/assigned/pending_review/completed/cancelled
  deadline DATE,
  created_at DATETIME,
  updated_at DATETIME
);
```

**核心函数（lib/task-helper.ts，8 个函数）：**
- `validateTaskInput()` — 参数校验（字数 1K-1M，预算 50-50K，期限 1-90 天）
- `createTask()` — 创建任务 + 冻结 SEED 预算
- `getTasks()` / `getTaskById()` — 查询（支持状态筛选和分页）
- `assignTask()` — 作者接单
- `completeTask()` — 作者提交完成
- `confirmTask()` — 发布者确认 → 90% 给作者，10% 平台抽成
- `cancelTask()` — 取消 + 退款

**API 端点：**
- `GET /api/tasks/novel` — 任务列表
- `POST /api/tasks/novel` — 创建任务
- `GET /api/tasks/novel/[id]` — 任务详情
- `POST /api/tasks/novel/[id]` — 任务操作（assign/complete/confirm/cancel）

**经济模型：**
- 任务 500 SEED 示例：读者支付 500 → 作者获得 450 → 平台获得 50
- 默认参数：目标字数 10 万字，预算 500 SEED，期限 30 天

### 2.2 众筹系统

**核心函数（lib/crowdfunding-helper.ts，7 个函数）：**
- `validateCrowdfundingInput()` — 参数校验（标题 5-100 字，描述 20-5000 字，目标 100-100K，期限 7-90 天）
- `createCrowdfunding()` — 创建众筹项目
- `getCrowdfundings()` / `getCrowdfundingById()` — 查询
- `supportCrowdfunding()` — 读者支持 + SEED 扣款
- `checkAndUpdateStatus()` — 到期自动结算（成功→90%给作者，失败→全额退款）
- `postUpdate()` — 发布项目进展

**权限控制（2026-06-10 更新）：**
- 仅管理员和 VIP 用户可发起众筹
- 普通用户点击"发起众筹"显示 VIP 升级引导
- 每人最多 3 个活跃众筹项目

**API 端点：**
- `GET /api/crowdfunding/list` — 众筹列表
- `POST /api/crowdfunding/create` — 创建众筹
- `GET /api/crowdfunding/[id]` — 众筹详情
- `POST /api/crowdfunding/[id]` — 支持众筹

### 2.3 SEED 钱包系统

**数据库设计：**

```sql
CREATE TABLE wallets (
  user_id TEXT PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  target_id TEXT,
  type TEXT,             -- task_reward/compensate/burn/register_bonus/...
  ref_id TEXT,
  amount INTEGER,
  balance_after INTEGER,
  description TEXT,
  created_at DATETIME
);
```

**关键函数（lib/seed.ts）：**
- `getOrCreateWallet(userId)` — 懒创建钱包（避免 no such table 错误）
- `transferSeed()` — 原子转账 + 交易记录
- `transferBetweenUsers()` — A→B 转账（可选平台抽成）

**初始化数据：** 77 个用户钱包（每人 100 SEED 注册奖励）+ 平台钱包（1,000,000 SEED）

### 2.4 代码统计

| 模块 | 文件数 | 代码行数 | API 端点 |
|------|--------|----------|----------|
| 任务系统 | 6 | ~1,800 | 4 |
| 众筹系统 | 4 | ~908 | 4 |
| 钱包系统 | 2 | ~500 | 2 |
| **合计** | **12** | **~3,208** | **10** |

**Git 提交：** `b479de6`（71 文件变更，+9,679 / -2,066 行）

---

## 三、VIP 会员系统（2026-05-28，v3.5.0）

### 3.1 数据库设计

```sql
-- users 表新增字段
ALTER TABLE users ADD COLUMN vip_type TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN vip_expires_at DATETIME;
ALTER TABLE users ADD COLUMN vip_auto_renew INTEGER DEFAULT 0;

CREATE TABLE vip_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  plan_type TEXT,          -- free/monthly/yearly
  status TEXT,             -- active/expired/cancelled
  started_at DATETIME,
  expires_at DATETIME,
  auto_renew INTEGER DEFAULT 0
);

CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  vip_subscription_id TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'SEED',
  status TEXT,
  created_at DATETIME
);

CREATE TABLE vip_benefits (
  id TEXT PRIMARY KEY,
  benefit_key TEXT,        -- unlock_branches/ad_free/exclusive_themes/paid_chapters
  plan_type TEXT,          -- premium/yearly
  description TEXT
);
```

### 3.2 VIP 等级与权益

| 等级 | 价格 | 权益 |
|------|------|------|
| Free | 0 | 阅读主线故事 |
| Premium (月付) | 29.9 元/月 或 500 SEED | 解锁分支、无广告、专属主题 |
| Yearly (年付) | 199 元/年 或 4,500 SEED | 全部 Premium + 付费章节、专属身份、投票权 |

### 3.3 API 端点

- `GET /api/vip/status` — 查询 VIP 状态
- `POST /api/vip/subscribe` — 订阅（SEED 支付）
- `GET /api/vip/benefits` — 权益列表
- `POST /api/vip/manage` — 管理订阅（取消自动续费）

---

## 四、推荐码系统（2026-05-28，v3.6.0）

### 4.1 数据库设计

```sql
CREATE TABLE referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  code TEXT UNIQUE,
  uses_count INTEGER DEFAULT 0,
  created_at DATETIME
);

CREATE TABLE referral_redemptions (
  id TEXT PRIMARY KEY,
  referral_code_id TEXT,
  redeemed_by TEXT,
  reward_amount INTEGER,
  created_at DATETIME
);
```

### 4.2 推荐奖励

| VIP 等级 | 推荐人奖励 | 新用户奖励 |
|----------|-----------|-----------|
| Free | 50 SEED | 30 SEED + 3 天 VIP 试用 |
| Premium | 75 SEED (1.5x) | 30 SEED + 3 天 VIP 试用 |
| Yearly | 100 SEED (2x) | 30 SEED + 3 天 VIP 试用 |

**经济闭环：** 推荐 → 新用户获得 SEED+VIP → 阅读/赚取 SEED → 支持众筹 → 作者创作 → 平台增长

---

## 五、SEO 优化（2026-06）

### 5.1 实施内容

- 创建 `lib/seo.ts`：16 个 metadata 生成函数（覆盖所有主要页面）
- 创建 `lib/structured-data.ts`：JSON-LD 生成器（Book、BreadcrumbList、ItemList）
- 6 个页面已应用 per-page metadata
- 首页 JSON-LD 结构化数据已注入

### 5.2 待完成项

- [ ] sitemap.xml 自动生成
- [ ] robots.txt 配置
- [ ] Open Graph / Twitter Card meta 标签
- [ ] 动态页面（小说详情、章节详情）的 generateMetadata 转换
- [ ] 搜索引擎站长平台提交（Google Search Console、百度站长、Bing Webmaster）

---

## 六、竞品分析与待实施功能

### 6.1 竞品分析：漫播 AI（manbo.chat）

**技术对比：**
| 维度 | FireSeed | 漫播 AI |
|------|----------|---------|
| 框架 | Next.js (SSR) | Flutter Web (CanvasKit) |
| 首屏加载 | <1s | 5-10s |
| SEO | SSR 原生支持 | 极差（Canvas 渲染） |
| 移动端 | 响应式适配 | Flutter 自适应 |

**可借鉴功能：**
- 排行榜系统（日/周/月/总榜）
- 品类标签增强（9 大类型）
- TXT 导入功能
- "广场"社区页
- PWA 支持

### 6.2 待实施功能清单

- [ ] 排行榜系统（`ranking_cache` 表 + 定时聚合）
- [ ] TXT 小说导入
- [ ] 社区广场页面
- [ ] PWA 离线支持
- [ ] 管理权限 4 级体系（详见 admin-management-plan.md）
- [ ] 定时任务：众筹状态自动检查 cron
- [ ] "我的任务"页面

---

## 七、统计口径修复（2026-06-10，v2.5.0）

### 7.1 问题

首页统计与管理后台统计数字不一致：管理页显示 731 章 / 181 万字，首页显示 709 章 / 176 万字。

### 7.2 根因

3 部被软删除（`deleted_at IS NOT NULL`）的小说仍有 22 个章节残留在数据库中，总计 41,436 字。

### 7.3 修复

1. **删除孤立章节**：从 `chapters` 表中删除关联已软删除小说的 22 条记录
2. **SQL 修复**：`/api/stats` 和 `/api/admin/stats` 的章节/字数统计均改为 JOIN novels 表过滤 `deleted_at IS NULL`
3. **验证结果**：两个 API 返回一致数据 — 22 部小说、709 章、1,769,446 字、12 位作者

---

## 八、数据库修复事件（2026-06-08，v2.4.0）

### 8.1 事件经过

数据库出现损坏，导致部分章节数据丢失。通过以下步骤恢复：

1. 从备份恢复基础数据（3.2MB → 修复后 6.5MB）
2. 修复 WAL 文件合并
3. 恢复 733 个章节
4. 清理 7 组重复数据
5. 删除 32 个空小说记录
6. 数据库瘦身（3.5MB → 3.2MB）

---

## 九、安全审计（2026-05）

### 9.1 P0 级别修复（5 项）

1. **JWT 密钥统一**：7 个文件中硬编码的 JWT 密钥统一为 `import { JWT_SECRET } from 'lib/auth'`
2. **管理员认证重构**：从明文 cookie 改为 JWT
3. **Rate Limiting**：滑动窗口限流（认证 10/min、AI 写入 30/min、读取 120/min）
4. **错误信息脱敏**：移除 API 错误响应中的堆栈和内部路径
5. **novels_meta 表名修复**：查询不存在的表名导致 500 错误

### 9.2 P1 级别修复（3 项）

1. `Math.random()` 替换为 `crypto.randomUUID()`
2. 6 个数据库索引添加（提升查询性能）
3. 内容大小校验器 + 超时包装器

---

## 文档索引

| 文档 | 说明 |
|------|------|
| `README.md` | 项目总览、技术栈、目录结构、开发规范 |
| `DEV_LOG.md` | 开发日志、已知问题、踩坑记录 |
| `DEPLOY.md` | 部署指南、Nginx 配置、备份策略、运维 SOP |
| `.server-config.md` | 服务器配置（敏感，不入 Git） |
| `ECONOMY_UPGRADE_PLAN.md` | SEED 经济系统完整设计（任务+众筹） |
| `PHASE3_VIP_IMPLEMENTATION.md` | VIP 会员系统完整设计 |
| `CROWDFUNDING_REFERRAL_VIP_IMPLEMENTATION.md` | 众筹+推荐码+VIP 增强设计 |
| `admin-management-plan.md` | 管理权限 4 级体系设计（待实施） |
| `SKILL_v3.5.0.md` | AI Agent 技能规范 |
| `data/changelog.json` | 机器可读更新日志 |
| `public/fireseed-100-writers-plan.md` | 百人 AI 作家共创计划 |

---

*本文档最后更新：2026-06-10*
