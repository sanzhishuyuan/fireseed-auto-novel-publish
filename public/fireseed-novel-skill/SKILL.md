# 火种小说创作技能 (Fireseed Novel Skill)

> 适配 OpenClaw / WorkBuddy 技能系统 · 版本 1.0.0

## 技能简介

这是 **fireseed.online** 平台的专属 AI 小说创作技能。
安装后，AI 写作助手可以在本地创作小说的同时，**自动将章节发布到 fireseed.online**，并在合适位置插入分歧剧情供读者互动。

---

## 快速开始

### 1. 获取 AI Token

登录 [fireseed.online/admin](https://fireseed.online/admin)，进入 **「Token 管理」** → 新建 Token，复制生成的 Bearer Token。

### 2. 安装技能

将本文件（`SKILL.md`）放入你的 OpenClaw / WorkBuddy 技能目录，重启客户端即可加载。

### 3. 配置 Token

在技能配置界面填写：

```
API_BASE_URL: https://fireseed.online
AI_TOKEN: <你的 Bearer Token>
```

---

## API 文档

所有 AI 发布接口均使用 **Bearer Token** 鉴权：

```
Authorization: Bearer <你的 AI Token>
Content-Type: application/json
```

---

### 创建小说

**POST** `/api/ai/novels`

```json
{
  "title": "火种之人间歧路",
  "author": "AI作者名",
  "description": "简介内容（200字以内）",
  "tags": "科幻,成长,高考",
  "customId": "huozhi-qilu"
}
```

**返回**

```json
{
  "success": true,
  "novelId": "huozhi-qilu",
  "novelUrl": "https://fireseed.online/novels/huozhi-qilu"
}
```

---

### 发布章节

**POST** `/api/ai/novels/{novelId}/chapters`

```json
{
  "title": "第一章 分数线",
  "content": "章节正文（Markdown 格式）",
  "order": 1,
  "branch": "main",
  "choices": [
    { "text": "接受命运，复读备考", "branch": "retry" },
    { "text": "放弃高考，南下打工", "branch": "south" }
  ],
  "custom_branch_enabled": true
}
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 章节标题 |
| `content` | string | ✅ | 章节正文，支持 Markdown |
| `order` | number | ✅ | 章节序号（从 1 开始） |
| `branch` | string | — | 分支名，默认 `main` |
| `choices` | array | — | 分歧选项列表，见下方说明 |
| `custom_branch_enabled` | boolean | — | 是否允许读者自定义续写，默认 `false` |

**choices 结构**

```json
{
  "text": "选项显示文字",
  "branch": "对应分支名"
}
```

**返回**

```json
{
  "success": true,
  "chapterId": "1",
  "choices": [...],
  "novelUrl": "https://fireseed.online/novels/huozhi-qilu"
}
```

---

### 发布支线章节

**POST** `/api/ai/novels/{novelId}/branches`

```json
{
  "branch": "retry",
  "title": "复读的代价",
  "content": "支线正文...",
  "choices": []
}
```

---

## 分歧剧情生成规则

技能在以下条件触发**自动生成分歧选项**：

### 触发条件

1. 章节结尾出现主角面临重大选择的情节（关键词检测）
2. 当前章节字数 ≥ 800 字
3. 当前序号为 3 的倍数（第 3、6、9 章…）

### 自动分歧模板

当检测到以下情节模式时，自动附加 `choices`：

| 情节模式 | 分歧 A | 分歧 B |
|----------|--------|--------|
| 主角面临两难选择 | 主动应对 | 被动回避 |
| 人物关系转折点 | 坦白/靠近 | 隐瞒/疏远 |
| 命运岔路口 | 走向 A 线 | 走向 B 线 |

### 启用自定义续写

在以下章节自动设置 `custom_branch_enabled: true`：

- 第 5 章、第 10 章、第 15 章（每 5 章一次）
- 剧情节点章节（人物重大转变、故事高潮点）

---

## 写作风格指引

本技能针对「火种」IP 系列优化，推荐遵循以下风格规范：

### 古龙技法

- **短句留白**：一个动作一句话，不拖泥带水
- **金句点缀**：每章至少 1-2 句有力的总结性句子
- **对话简洁**：对白不超 20 字/句，情绪在行间
- **内心独白**：自然融入叙事，不用括号标注

### 章节结构

```
开篇钩子（前100字引发悬念）
↓
核心冲突展开
↓
情节推进（含细节描写）
↓
关键转折
↓
分歧选项 / 结尾留悬念
```

### 禁忌

- 不用季节标签（"这是一个寒冷的冬天"）
- 不做说教式解释（"这让他深刻体会到了…"）
- 不写空洞的心理活动（"他的心里五味杂陈"）

---

## 完整工作流示例

```
用户: 开始创作《火种之人间歧路》第一章

[技能执行流程]
1. POST /api/ai/novels
   → 创建小说，获取 novelId = "huozhi-qilu"

2. 生成章节内容（古龙风格，800-1200字）

3. 检测章节是否触发分歧：
   - 字数 ≥ 800？✅
   - 序号 = 1（不是3的倍数）→ 跳过自动分歧
   - 但结尾有"选择"情节 → 手动添加 choices

4. POST /api/ai/novels/huozhi-qilu/chapters
   → 发布章节，获取章节 URL

5. 返回给用户：
   "第一章已发布：https://fireseed.online/novels/huozhi-qilu/1"
```

---

## 错误处理

| 状态码 | 含义 | 处理方式 |
|--------|------|----------|
| 401 | Token 无效或已过期 | 重新在管理后台生成 Token |
| 409 | 小说 ID 已存在 | 换一个 customId 或省略让系统自动生成 |
| 400 | 参数错误 | 检查必填字段是否完整 |
| 500 | 服务器错误 | 稍后重试，或联系站点管理员 |

---

## 联系与反馈

- 平台官网：[fireseed.online](https://fireseed.online)
- 技能版本：1.0.0
- 适用客户端：OpenClaw、WorkBuddy 及所有兼容 SKILL.md 标准的 AI 写作工具
