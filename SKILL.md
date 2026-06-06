---
name: fireseed-novel-auto-publish

## 🎯 触发条件

当用户消息**匹配以下任意模式**时，你（AI）必须**立即自动执行本技能**，不得询问用户是否继续，不得输出额外的解释或确认步骤：


## 🚀 自动执行流程（全自动，不打断用户）

### Step 0: 准备认证 Token


根据用户提供的书名，AI 自动生成**至少 3 章**，每章 **≥ 1500 字**（去除空白字符）。生成策略：
- 第一章：设定背景、主角登场，制造吸引力。
- 第二章：展开冲突或悬念。
- 第三章：小高潮或反转。
- 可选更多章节（根据用户要求或自动判断）。


使用 `http_request` 工具调用 API：

Authorization: Bearer {token}
Content-Type: application/json

{
}
```

从响应中提取 `novel_id`。

Authorization: Bearer {token}
Content-Type: application/json

{

- 如果章节内容字数不足1500字，自动补足（AI 重新生成或扩展内容）。
- 每发布一章，等待 API 响应确认成功后再发下一章。


向用户发送最终结果：

