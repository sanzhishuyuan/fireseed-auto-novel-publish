# FireSeed 账户权限管理体系设计方案

## 📋 一、现状梳理

### 1.1 当前用户模型

| 字段 | 值 | 说明 |
|------|-----|------|
| `users.role` | `'reader'` (默认) / `'admin'` | 仅有2种角色，无中间层级 |
| 管理员认证 | ① `ADMIN_PASSWORD` 环境变量 ② DB中 `role='admin'` 的账号密码 | 共享密码，无法区分谁操作了后台 |
| 权限粒度 | **全有或全无** | 能进后台就能干所有事（删小说/删章节/清数据） |

### 1.2 现有能力分布（所有注册用户默认拥有）

```
┌─────────────────────────────────────────────┐
│              注册用户 (默认 role='reader')      │
│                                             │
│  【读者能力】                                │
│  ├── 浏览小说列表 / 阅读小说内容               │
│  ├── 收藏小说 / 评论互动                      │
│  ├── 自定义阅读设置（字号/主题）               │
│  ├── 阅读进度追踪                            │
│  │                                           │
│  【作者能力】                                │
│  ├── 通过 AI API 创建小说                    │
│  ├── 通过 AI API 发布章节                    │
│  ├── 管理自己的小说/章节                      │
│  ├── 管理自己的 API Token（user_tokens）      │
│  └── 查看自己的创作统计                       │
│                                             │
│  认证方式：注册时用户名+密码                   │
│  API调用：Bearer Token（用户自行创建）          │
└─────────────────────────────────────────────┘
```

### 1.3 管理后台能力清单

```
管理面板（Dashboard）        ← 统计数据、增长趋势
小说管理（CRUD）             ← 创建/编辑/删除小说
章节管理                     ← 发布/编辑/删除章节
Token管理（AI授权）          ← 创建/禁用 AI Token
技能管理（任务编辑）         ← 编辑/创建/删除技能任务
音乐管理                     ← 上传/删除背景音乐
清理回收站                   ← 永久删除软删除的小说
```

### 1.4 当前存在的问题

1. **无权限分层** — 招来的协作者要么能看到一切（包括敏感数据），要么进不来
2. **无操作审计** — 谁在什么时间做了什么操作，完全没有记录
3. **密码共享** — 所有人都用同一个 `ADMIN_PASSWORD`，无法收回个人权限
4. **无"只读查看"模式** — 没有只允许看数据但不允许修改的账号

---

## 🏗 二、整体用户分层模型

### 2.1 四层架构

**说明**：所有注册用户 = 读者 + 作者，这是平台的基础层。  
**管理员角色**是叠加在普通用户之上的额外权限层。

```
▲  权限等级
│
│  SuperAdmin  (超级管理员)
│   ├─ 全部权限 + 管理管理员 + 审计日志
│   ├─ 系统设置
│
│  Admin  (高级管理员)
│   ├─ 小说/章节/Token/技能/音乐 全方位管理
│   ├─ 可删除内容，但不可删管理员、不可看审计
│
│  Editor  (内容管理员)
│   ├─ 创建/编辑小说和章节
│   ├─ 不可删除内容、不可管理Token/技能
│
│  Viewer  (数据观察员)
│   ├─ 只看数据面板和内容列表
│   ├─ 不可做任何修改操作
│
├──────────────────────────── 管理后台门槛 ────
│
│  Registered User (注册用户 = 读者 + 作者)
│   ├─ 【读者】浏览、阅读、收藏、评论
│   ├─ 【作者】AI API 创作、自己的 Token 管理
│
└──────────────────────────── 注册门槛 ────
    Guest (游客)
     └─ 浏览公开小说（无需登录）
```

### 2.2 全量角色权限矩阵

| 能力 | Guest | 注册用户 | Viewer | Editor | Admin | SuperAdmin |
|:----|:-----:|:--------:|:------:|:------:|:-----:|:----------:|
| **前台 — 读者侧** | | | | | | |
| 浏览公开小说 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 阅读章节 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 收藏/评论 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 阅读进度 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **前台 — 作者侧** | | | | | | |
| AI API 创建小说 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI API 发布章节 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 管理自己作品 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 管理自己的 Token | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **后台 — 管理层** | | | | | | |
| 查看数据面板 | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| 查看小说/章节列表 | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| 创建/编辑小说 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 编辑章节内容 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 删除小说/章节 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 管理 AI Token | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 管理技能任务 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 管理音乐 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 清理回收站（永久删除） | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 管理管理员账号 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 查看审计日志 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 系统设置 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 2.3 角色定位说明

| 角色 | role值 | 适合人群 | 典型授予理由 |
|:----|:------:|---------|-------------|
| **注册用户** | `reader` | 所有注册用户（默认） | 自注册，既是读者也是作者 |
| **数据观察员** | `viewer` | 招来的合作作者/伙伴 | "来看看平台数据增长，给你开个后台看看" |
| **内容管理员** | `editor` | 信任的内容审核伙伴 | "帮我把这章内容改一下，别删错了" |
| **高级管理员** | `admin` | 核心运营成员 | "日常运营都交给你，最终删库归我" |
| **超级管理员** | `super_admin` | 平台所有者（1-2人） | 全权管理 |

---

## 💻 三、技术实现方案

### 3.1 数据库改动

```sql
-- 1. 扩展 users.role 的可选值
-- 当前已有 role 字段，只需在代码层面新增可选值
-- 'reader'(默认) → 'viewer' | 'editor' | 'admin' | 'super_admin'

-- 2. 新增管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    detail TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- 3. admin_logs 索引（方便按管理员和时间筛选）
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
```

**无需改动的表**（现有设计已满足）：

| 表 | 说明 |
|----|------|
| `users` | 已有 `role` 字段，扩展可选值即可 |
| `user_tokens` | 已有 `permissions` 字段（JSON数组），作者自己管理 |
| `ai_tokens` | 后台管理的 AI 授权 Token，Admin 及以上可管理 |

### 3.2 权限检查函数（新增 `lib/permissions.ts`）

```typescript
// lib/permissions.ts

export type Role = 'reader' | 'viewer' | 'editor' | 'admin' | 'super_admin';

export type Permission =
  // 后台查看类
  | 'dashboard.view'
  | 'content.view'
  // 内容管理类
  | 'content.create'
  | 'content.edit'
  | 'content.delete'
  // 运营管理类
  | 'token.manage'
  | 'skill.manage'
  | 'music.manage'
  // 超级管理类
  | 'cleanup.execute'
  | 'admin.manage'
  | 'audit.view'
  | 'system.settings';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  reader: [],          // 普通用户不进入后台
  viewer: ['dashboard.view', 'content.view'],
  editor: ['dashboard.view', 'content.view', 'content.create', 'content.edit'],
  admin: [
    'dashboard.view', 'content.view', 'content.create', 'content.edit',
    'content.delete', 'token.manage', 'skill.manage', 'music.manage',
  ],
  super_admin: ['*'],  // 通配符：所有权限
};

export function checkPermission(role: Role, permission: Permission): boolean {
  if (role === 'super_admin') return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// 检查是否允许进入后台（>= viewer）
export function canAccessAdmin(role: Role): boolean {
  return ['viewer', 'editor', 'admin', 'super_admin'].includes(role);
}
```

### 3.3 改造管理后台登录

**当前**：一个密码框，验证 `ADMIN_PASSWORD` 环境变量

**改造后**：

```
登录页面：
┌─────────────────────┐
│  🔥 FireSeed 后台    │
│                     │
│  用户名              │  ← 普通账号密码（同前台注册账号）
│  [________________] │
│  密码                │
│  [________________] │
│                     │
│  [进入后台]          │
│                     │
│  还保留 ADMIN_PASSWORD
│  作为紧急后门         │
└─────────────────────┘

后端校验逻辑：
1. 查 users 表 username + password（bcrypt）
2. 检查 role >= 'viewer'
3. 生成 JWT（含 userId, username, role）
4. 写入 admin_token Cookie（替代现有 24h token）
```

### 3.4 现有管理后台改造点

每个管理页面的 API 路由增加角色检查：

```typescript
// 当前（全有或全无）：
if (!isAdminAuthed(request)) {
  return NextResponse.json({ error: '无权限' }, { status: 403 });
}

// 改造后（精细化）：
const user = await getCurrentAdmin(request); // 从 JWT 解析
if (!user || !checkPermission(user.role, 'content.delete')) {
  return NextResponse.json({ error: '权限不足' }, { status: 403 });
}
```

前端根据 role 隐藏按钮：

```tsx
// 当前：所有管理员看到相同的界面
<button onClick={handleDelete}>删除小说</button>

// 改造后：根据角色显示/隐藏
{checkPermission(user.role, 'content.delete') && (
  <button onClick={handleDelete}>删除小说</button>
)}
```

### 3.5 新增 API

| 端点 | 方法 | 权限要求 | 功能 |
|------|:----:|:---------|------|
| `/api/admin/users` | GET | `admin.manage` | 列出所有管理员账号（>= viewer） |
| `/api/admin/users` | POST | `admin.manage` | 创建/升级管理员（指定角色） |
| `/api/admin/users/[id]` | PATCH | `admin.manage` | 修改角色/封禁 |
| `/api/admin/users/[id]` | DELETE | `admin.manage` | 移除管理员权限（降为 reader） |
| `/api/admin/audit` | GET | `audit.view` | 审计日志列表 |
| `/api/admin/audit?admin_id=x` | GET | `audit.view` | 按管理员筛选 |

### 3.6 审计日志接入点

在所有管理操作处写日志：

```typescript
// lib/audit.ts
export function logAdminAction(
  adminId: string,
  adminUsername: string,
  action: string,
  targetType?: string,
  targetId?: string,
  detail?: Record<string, unknown>,
  ipAddress?: string
) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO admin_logs (id, admin_id, admin_username, action, target_type, target_id, detail, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, adminId, adminUsername, action, targetType, targetId,
    detail ? JSON.stringify(detail) : null, ipAddress);
}
```

接入点清单：

| 操作 | action 值 | 接入位置 |
|------|-----------|---------|
| 管理员登录 | `login` | `/api/admin/login` |
| 管理员登出 | `logout` | `/api/admin/logout` |
| 创建小说 | `create_novel` | `/api/admin/novels` POST |
| 编辑小说 | `edit_novel` | `/api/admin/novels/[id]` PATCH |
| 删除小说 | `delete_novel` | `/api/admin/novels/[id]` DELETE |
| 创建章节 | `create_chapter` | `/api/admin/novels/[id]/chapters` POST |
| 编辑章节 | `edit_chapter` | `/api/admin/chapters/[id]` PATCH |
| 创建 Token | `create_ai_token` | `/api/admin/tokens` POST |
| 禁用 Token | `toggle_ai_token` | `/api/admin/tokens/[id]` PATCH |
| 清理回收站 | `cleanup_novel` | `/api/admin/cleanup` DELETE |
| 修改管理员 | `update_admin_role` | `/api/admin/users/[id]` PATCH |

---

## 🚀 四、实施建议（分三阶段）

### 第一阶段（MVP）— 最小可行

| # | 事项 | 改动量 | 效果 |
|:-:|------|:------:|------|
| 1 | 新增 `admin_logs` 表 + 索引 | 1个SQL | 先记录谁做了什么 |
| 2 | 在管理员登录处写审计日志 | 2行代码 | 知道谁登录了后台 |
| 3 | 新增 `lib/permissions.ts` | 1个文件 | 权限检查函数 |
| 4 | 管理后台登录改为**账号密码** | 1个页面改+1个API路由 | 告别共享密码 |
| 5 | 管理 API 逐个加 `checkPermission` | 逐个文件改 | 权限控制落地 |

### 第二阶段（完善）

| # | 事项 | 说明 |
|:-:|------|------|
| 6 | 新增 `/admin/users` 管理页面 | 可视化管理管理员 |
| 7 | 新增 `/admin/audit` 审计日志页面 | 搜索/筛选/导出 |
| 8 | 所有管理操作审计日志接入 | 完成全链路审计 |
| 9 | 前端按钮根据角色显示/隐藏 | 减少误操作可能 |

### 第三阶段（进阶）

| # | 事项 | 说明 |
|:-:|------|------|
| 10 | 自定义角色（自由组合权限点） | 灵活适配各种场景 |
| 11 | 邀请链接注册自动带角色 | 简化开账号流程 |
| 12 | 敏感操作双因子确认 | 删除/清理需二次确认 |

---

## ⚠️ 五、注意事项

### 兼容性
- **不修改现有 user_tokens / ai_tokens 表** — 用户自己的 API Token 体系完全不变
- 现有 `role='admin'` 的用户 → 自动映射为 `super_admin`（保有全部权限）
- 现有 `ADMIN_PASSWORD` 环境变量认证 → 保留作为**紧急后门**
- 建议迁移期双轨运行：新旧登录方式并存 1-2 周

### 安全
- `super_admin` 角色应严格限制在 1-2 人
- 审计日志仅追加、不删除（即使 super_admin 也不能删）
- 移除管理员权限（降级为 reader）时需写审计日志
- 所有管理 API 的 500 修复刚完成，确保权限检查在 JSON 解析之后

### 数据流示意

```
                 ┌─────────────────────┐
                 │   用户注册 (无门槛)    │
                 └────────┬────────────┘
                          │
                          ▼
                 ┌─────────────────────┐
                 │  role = 'reader'     │  ← 默认：读者+作者权限
                 │  读者能力 + 作者能力   │
                 └────────┬────────────┘
                          │
              super_admin 手动升级
                          │
                          ▼
                 ┌─────────────────────┐
                 │  role = 'viewer'     │  ← 可看后台面板
                 │  ~ 'super_admin'     │
                 └─────────────────────┘
```

### 推荐实施顺序
1. **审计日志表 + admin 登录日志**（半天）
2. **`lib/permissions.ts` + 管理员账号密码登录**（半天）
3. **管理 API 逐步加权限检查**（1天）
4. **管理页面改造 + 前端隐藏按钮**（半天）
