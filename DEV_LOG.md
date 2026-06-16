# 🔧 Fireseed 开发者日志

> 记录每次变更、问题和解决方案，避免重复踩坑，持续精进。

---

## 2026-06-13

### 🔧 雾隐酒馆 RPG 市场修复

- **购买确认弹窗**：市场购买操作增加二次确认弹窗，防止误购
- **副本经济字段**：副本详情页增加经济相关字段（价格、收益等）
- **角色列表页**：修复角色列表页数据显示与分页问题

### 🚀 副本体系完整实现

- **术语改名**：统一副本相关术语（副本 → Campaign，关卡 → Scene）
- **资产关联**：副本与角色/世界书建立资产关联关系
- **通用角色**：实现通用角色模板，支持跨副本复用
- **世界书市场**：导入 6 部跑团世界书至市场，含定价策略（免费/SEED 定价）

---

## 2026-06-11

### 🚀 雾隐酒馆 × SEED 经济融合

- **RPG 数字资产市场**：完整实现角色/世界书/副本的买卖交易功能
- **交易流程**：上架 → 购买 → 确认 → 资产转移，全链路闭环
- **SEED 经济集成**：市场交易使用 SEED 作为统一货币

### 🚀 雾隐酒馆 AI 跑团平台核心引擎上线（Phase 1）

- **角色系统**：创建、编辑、自定义缓存角色数据
- **世界书系统**：世界观设定、场景描述、NPC 数据管理
- **副本体系**：副本创建、发布、运行全流程
- **基金会**：跑团创作者基金池，支持社区激励
- **创作者中心**：跑团内容创作者管理后台

### 🎨 全站 Obsidian Codex 风格统一

- **覆盖范围**：小说详情页、阅读页、任务市场、众筹广场、后台管理
- **设计元素**：Fraunces 衬线字体 + 金色调 + 纸纹质感背景
- **视觉语言**：暗色羊皮纸风格，统一品牌调性

### 🎨 /chat 页面重设计

- **新名称**：「NEURAL NEXUS · 神经枢纽」AI Agent 社区
- **功能**：多 Agent 对话、角色扮演、社区互动

### 🎨 首页整合星火燎原设计

- **粒子背景**：动态粒子特效背景
- **动画 Hero**：入场动画 + 渐变文字效果
- **特性卡片**：核心功能卡片展示
- **数据展示**：平台实时统计数据

### 🔧 导航栏增加 AI 跑团入口

- 主导航新增「AI 跑团」入口，链接至 /rpg/market

---

## 2026-06-10

### 🔧 84 路由全量迁移 withRoute 封装

- 84 个路由文件统一迁移到 `withRoute` 高阶函数封装
- 统一认证、错误处理、响应格式化逻辑

### 🔧 44 路由 safeParseJSON 替换

- 44 个路由文件中 `raw request.json()` 全量替换为 `safeParseJSON`
- 消除未捕获的 JSON 解析异常导致的 500 错误

### 🔧 统一认证架构

- Admin 与 User-facing 认证架构统一，消除重复代码
- AI 路由认证架构统一

### 🚀 数据库基础设施升级

- 数据库统一路径配置
- 欢迎邮件系统
- 自动备份机制
- 更新通知系统

### 🚀 创作者中心 + 火种基地上线

- 创作者中心页面：内容管理、数据统计、收益查看
- 创作者基金页面：基金申请、发放、管理
- 火种基地聚合页：新人引导 + 资源聚合

### 🐛 apiSuccess 数据解包 BUG 修复

- `apiSuccess` 函数数据解包逻辑错误，影响 11 处调用
- 涉及模块：dashboard / feedback / music / tokens
- 修复后各模块数据正常返回

### 🐛 首页崩溃与 SEED 余额修复

- 修复首页 SSR 渲染崩溃问题
- 修复 SEED 余额显示异常（客户端/服务端不一致）

### 🔧 移除 PWA 支持文件

- 删除 `favicon.svg`、`manifest.json`、`pwa-icon-*.svg`
- 移除未完成的 PWA 相关代码

### 🔧 首页视觉优化

**背景**：简化首页布局，减少信息密度，提升视觉聚焦。

- **公告栏精简**：跑马灯改为单行静态横幅，保留核心招募信息
- **Hero 副标题极简化**：长文案压缩为一句"你的每个选择，都将改写故事结局。"
- **数据模块移除**：删除"部作品/章内容/字累计/位作者"统计模块

---

## 2026-05-04

### 🚀 v2.3 稳定版：章节排序优化 + 技能互动机制 + 管理后台升级

**背景**：从 dev 分支合并到 master 作为稳定版发布，包含多项核心功能升级。

---

### ✅ 章节排序优化
- **AI 创建章节**：不传 `order` 时自动 `MAX(order_num) + 1`，避免插到第1章
- **插入自动后移**：插入新章时自动 `UPDATE ... SET order_num = order_num + 1 WHERE order_num >= ?`
- **技能文档**：`order` 从可选改为必传参数，附带取值规则表

### ✅ 技能心跳与主动互动
- 数据库新增3张表：`skill_activations`, `skill_missions`, `skill_events`
- 新增3个API：`GET /api/ai/skill/ping`（心跳）、`GET /api/ai/skill/feed`（任务推送）、`POST /api/ai/skill/event`（行为上报）
- 种子数据：6条默认任务（新用户引导/热门话题/召回）
- SKILL.md 新增第9节「主动互动机制」

### ✅ 管理后台技能管理
- 新增页面：`/admin/skills`（任务CRUD + 激活监控）
- 新增API：`/api/admin/skills`（GET/POST）、`/api/admin/skills/[id]`（PATCH/DELETE）
- 新增API：`/api/admin/skill-dashboard`（统一数据接口）
- Dashboard 主页内嵌 SkillManager 组件（默认展开），支持折叠

**涉及文件**：`lib/db.ts`, `app/api/ai/novels/[novelId]/chapters/route.ts`, `app/admin/dashboard/page.tsx`, `app/admin/skills/*`, `app/api/admin/skills/*`, `app/api/admin/skill-dashboard/*`, `app/api/ai/skill/*`

---

## 2026-04-30

### 🔒 安全修复：全面安全审计与修复（P0 × 5 + P1 × 3）

**背景**：本次会话通过前后端全面代码审查，发现并修复了多个安全风险。

---

### ✅ P0-1: JWT Secret 硬编码（7处 → 统一导入）

**问题**：JWT Secret 在7个 API 文件中硬编码为 `'ai-novel-secret-key-2024'`，生产环境直接暴露。

**涉及文件**：
- `app/api/auth/login/route.ts`
- `app/api/auth/token/route.ts`
- `app/api/ai/novels/route.ts`
- `app/api/ai/novels/upload-md/route.ts`
- `app/api/ai/novels/[novelId]/chapters/route.ts`
- `app/api/ai/novels/[novelId]/branches/route.ts`
- `app/api/ai/jobs/[jobId]/route.ts`

**修复**：统一改为从 `lib/auth.ts` 导入 `JWT_SECRET`，由环境变量控制。
```typescript
import { JWT_SECRET } from '@/lib/auth';
```

---

### ✅ P0-2: Admin 认证架构重构（明文密码 Cookie → JWT Token）

**问题**：Admin 登录成功后，明文密码存入 `admin_auth` Cookie，且后续所有 API 通过明文密码比较验证。

**涉及文件**：
- `app/api/admin/login/route.ts` — 改为签发 JWT Token
- `app/api/admin/logout/route.ts` — 删除 `admin_token` Cookie
- `app/api/admin/stats/route.ts`、`cleanup/`、`tokens/`、`tokens/[id]/`、`novels/`、`novels/[id]/chapters/` — 全部改用 JWT Token 验证
- `lib/auth.ts` — 新增 `generateAdminToken()` 和 `verifyAdminToken()`

**修复**：
```typescript
// 登录时签发 JWT Token（不再存明文密码）
const adminToken = generateAdminToken(); // 24h 有效
response.cookies.set('admin_token', adminToken, { httpOnly: true, ... });

// 其他路由验证 Token
if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
  return NextResponse.json({ error: '未授权' }, { status: 401 });
}
```

---

### ✅ P0-3: 收藏功能表名错误（novels_meta → novels）

**问题**：`app/api/user/favorites/route.ts` 使用不存在的表名 `novels_meta`，导致用户收藏列表查询失败。

**修复**：`JOIN novels_meta` → `JOIN novels`

---

### ✅ P0-4: API 速率限制缺失（全新）

**问题**：所有 API 路由（登录、注册、Token 获取、AI 发布）完全无速率限制，可被暴力破解或 DoS。

**修复**：

**1. 新建 `lib/rate-limit.ts`**（滑动窗口内存限流器）：
- 敏感操作（登录/注册/Token）：每分钟最多 10 次
- AI 写操作（发布章节/小说）：每分钟最多 30 次
- 读操作：每分钟最多 120 次
- 支持按 IP 追踪，HTTP 429 响应带 `Retry-After` 头

**2. 应用到所有敏感端点**：
- `POST /api/auth/login` — auth tier
- `POST /api/auth/register` — auth tier
- `POST /api/auth/token` — auth tier
- `POST /api/admin/login` — auth tier（更严格）
- `POST /api/ai/novels` — aiWrite tier
- `POST /api/ai/novels/upload-md` — aiWrite tier
- `POST /api/ai/novels/[id]/chapters` — aiWrite tier
- `POST /api/ai/novels/[id]/branches` — aiWrite tier

---

### ✅ P0-5: 错误响应泄露内部信息

**问题**：多处 API 使用 `detail: String(error)` 将完整错误对象暴露给客户端，泄露内部文件路径、变量名等。

**修复**：移除所有 `detail: String(error)` 字段，保留用户友好的错误消息。

---

### ✅ P1-1: AI Token 生成不安全（Math.random() → crypto.randomUUID()）

**问题**：`lib/auth.ts` 的 `generateAIToken()` 使用 `Math.random()`，可被预测。

**修复**：
```typescript
// 修改前
result += chars.charAt(Math.floor(Math.random() * chars.length));

// 修改后（使用 Node.js crypto 模块）
import { randomUUID } from 'crypto';
export function generateAIToken(): string {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}
```

---

### ✅ P1-2: 数据库缺失关键索引

**问题**：`chapters`、`user_progress`、`ai_jobs`、`custom_branches` 等表无索引，高并发时全表扫描导致性能问题。

**修复**：`lib/db.ts` 新增 6 条索引：
```sql
CREATE INDEX IF NOT EXISTS idx_chapters_novel_branch ON chapters(novel_id, branch, order_num);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_novel ON user_progress(user_id, novel_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_token_status ON ai_jobs(token, status);
CREATE INDEX IF NOT EXISTS idx_custom_branches_lookup ON custom_branches(novel_id, chapter_id, user_id);
CREATE INDEX IF NOT EXISTS idx_novels_deleted ON novels(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

---

### ✅ P1-3: AI API 安全工具（新建）

**新建 `lib/api-guard.ts`**：
- `validateContentSize()` — 单章节最大 500KB 校验
- `withTimeout()` — 异步操作超时包装器（默认 10s）

---

### ✅ 附带修复：Token 有效期缩短

- `/api/auth/token` — JWT Token 有效期从 `30d` 缩短至 `7d`（降低 Token 泄露风险）

---

## 2026-04-30（早）

### 🐛 Bug 修复：小说详情页白屏（tags 字段类型不匹配）

**问题表现**
- 访问 `/novels/[id]` 时页面崩溃，报 `Application Error`
- 浏览器控制台：`TypeError: (t.tags || "").split is not a function`

**根因分析**
- 前端代码对 `tags` 字段调用 `.split(',')`，期望它是字符串
- 后端 `/api/novels/[id]` 直接返回 `tags: dbNovel.tags`
- 当数据库中 `tags` 是数组时，前端崩溃

**修复方案**
```typescript
// routes/novels.js 或 app/api/novels/[id]/route.ts
// 修改前
tags: dbNovel.tags,

// 修改后
tags: dbNovel.tags || '',
```

**涉及文件**
- `app/api/novels/[id]/route.ts` - 后端 API
- 前端页面通过 fetch 调用此接口

**经验教训**
- ⚠️ API 返回的字段类型必须与前端期望一致
- ⚠️ 前后端数据契约：要么统一约定 JSON Schema，要么在后端做类型强制转换
- 💡 建议：后续新增 API 时，在注释中明确标注字段类型

---

### ⚠️ 待解决：中文编码乱码

**问题表现**
- 数据库中的中文显示为 `????`
- 可能原因：PowerShell `ConvertTo-Json` 编码问题 / SQLite 字符集问题

**待排查点**
1. OpenClaw/PowerShell 环境下 JSON 序列化编码
2. SQLite 数据库初始化时的字符集设置
3. 上传 API (`/api/ai/novels/upload-md`) 的编码处理

---

### ⚠️ 待解决：构建脚本数据保护

**问题描述**
- `npm run build` 会重新生成 standalone 目录（包含新空 DB）
- 直接重启 PM2 指向新目录会导致所有用户数据丢失
- 已有 `build-and-deploy.sh` 脚本（带数据保护），需确保服务器上使用的是此脚本

---

## 📋 日志格式规范

每次记录应包含：

| 字段 | 说明 |
|------|------|
| 日期 | YYYY-MM-DD |
| 类型 | 🐛 Bug修复 / ✨ 新功能 / ⚠️ 警告 / 📝 文档 |
| 问题 | 简述问题现象 |
| 根因 | 分析为什么会发生 |
| 修复 | 具体修改了什么 |
| 涉及文件 | 关键文件路径 |
| 经验教训 | 如何避免下次踩坑 |

---

## 📌 常见坑位索引（高频问题）

| 标签 | 问题 | 解决方案 | 日期 |
|------|------|----------|------|
| #standalone | CSS 不加载/样式错乱 | 手动复制 `.next/static` 到 standalone 目录 | 2026-04-29 |
| #standalone | 构建后数据库数据丢失 | 使用 `build-and-deploy.sh` 脚本 | 2026-04-30 |
| #api-types | tags 字段类型不一致 | 后端统一转为字符串 | 2026-04-30 |
| #encoding | PowerShell 中文编码 | 使用 UTF-8 BOM 或避开 ConvertTo-Json | 2026-04-28 |
