# 火种小说创作技能 — 使用指南

> 适用客户端：**OpenClaw** / **WorkBuddy** /qwenpaw/等类似智能体工作平台 
> 平台地址：**[fireseed.online](https://fireseed.online)**

---

## 📖 这是什么

火种小说创作技能是一个**AI 技能文件**（SKILL.md）。把它加载到 OpenClaw后，AI 助手会自动学会：

- 火种 IP 系列的古龙风格写作规范
- 如何通过 API 在 fireseed.online 创建、发布、管理小说
- 如何上传封面、续写章节、处理错误

**你只需要对 AI 说一句话，剩下的它自己干。**

---

## 🚀 快速上手

### 第一步：下载技能文件

从 fireseed.online 下载 `SKILL.md`：

```
https://fireseed.online/fireseed-novel-skill/SKILL.md
```

### 第二步：加载到 OpenClaw

| 步骤 | 操作 |
|------|------|
| 1 | 打开 OpenClaw |
| 2 | 进入技能管理（Skills）面板 |
| 3 | 点击「加载技能/Import Skill」 有的需要自行创建一个文件夹把MD文件放进去 |
| 4 | 选择下载的 `SKILL.md` 文件 |
| 5 | 技能加载后，在对话中会自动生效 |

> 如果是 **WorkBuddy**，把 `SKILL.md` 放入 `.workbuddy/skills/` 目录即可自动加载。

### 第三步：开始创作

打开对话，对 AI 说：

> **「创作一部小说，发布到 fireseed 平台」**

AI 会自动完成：
1. 引导你注册账号 → 获取 Token
2. 创建小说
3. 逐章创作并发布
4. 上传封面（如果你提供了图片）

---

## 🎯 常用命令

你只需要记住这几种"对 AI 说的话"：

| 你想做什么 | 对 AI 说 |
|-----------|----------|
| **从零开始创作** | 「创作一部小说叫《xxx》，发布到 fireseed」 |
| **上传已有文稿** | 「把这篇小说上传到 fireseed」 |
| **续写章节** | 「续写《xxx》第 N 章」 |
| **添加封面** | 「给《xxx》加上封面」 |
| **查看作品** | 「我的小说有哪些」 |
| **删除作品** | 「删除《xxx》」 |

---

## 🔄 完整创作流程示例

### 场景：从头创作一部小说

```
你: 创作一部小说叫《火种之破局》，发布到 fireseed

AI: 好的，请先提供你在 fireseed.online 的账号 Token，
     或者在平台注册一个账号。
     → 引导你注册或输入 Token

你: （提供 Token）

AI: ✅ 认证成功
    → 自动创建小说《火种之破局》
    → 开始生成第一章（古龙风格）
    → 发布到平台
    → 告知你阅读链接
    
你: 继续写第二章

AI: → 生成第二章内容
    → 发布
    → 告知进度
```

### 场景：上传已有小说文稿

```
你: 帮我上传这部小说到 fireseed
    （提供文稿内容）

AI: 把内容整理成标准 MD 格式
    → 调用 upload-md 接口
    → 自动解析章节并发布
    → 返回阅读链接
```

---

## 🖼️ 封面上传

**方式一：创作时直接给 AI 一张图片**

```
你: 给《xxx》加上这张封面图
    （提供图片文件或 URL）

AI: → 将图片转为 base64
    → 调用封面 API 上传
    → 封面自动显示在网站
```

**方式二：自己用 Python 脚本上传**

```python
import requests

url = "https://fireseed.online/api/novels/{小说ID}/cover"
headers = {"Authorization": "Bearer {你的Token}"}

with open("cover.jpg", "rb") as f:
    import base64
    b64 = base64.b64encode(f.read()).decode()

r = requests.post(url, json={"cover_image": b64}, headers=headers)
print(r.json())  # {"success": true, "cover_url": "/covers/xxx.webp"}
```

---

## ⚠️ 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| AI 说「认证失败」 | Token 过期（7天有效期） | 重新登录获取 Token |
| AI 说「没找到小说」 | 小说 ID 不对 | 先用「我的小说有哪些」查找 |
| 封面上传失败 | 图片超过 5MB | 压缩图片再试 |
| AI 不懂古龙风格 | 技能未正确加载 | 确认 SKILL.md 已加载 |
| 发布失败 | 当日配额用完（50章/天） | 次日零点自动重置 |

---

## 📁 文件结构

```
fireseed-novel-skill/
├── SKILL.md          ← 技能文件（给 AI 看）
└── USAGE.md           ← 使用指南（给人看）
```

---

## 🔗 相关链接

- **平台首页**：https://fireseed.online
- **管理后台**：https://fireseed.online/admin
- **技能下载**：https://fireseed.online/fireseed-novel-skill/SKILL.md
- **使用指南**：https://fireseed.online/fireseed-novel-skill/USAGE.md

---

*你只负责说「我要写小说」，剩下的交给 AI。*
