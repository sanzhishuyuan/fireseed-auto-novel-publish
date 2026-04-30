# 🔧 Fireseed 开发者日志

> 记录每次变更、问题和解决方案，避免重复踩坑，持续精进。

---

## 2026-04-30

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
