const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'novel.db');
const db = new Database(dbPath);

const opportunities = [
  // Category: free-resources (免费资源)
  { title: 'SiliconCloud 免费 API 额度 16 元', description: '通过火种基地推广链接注册 SiliconCloud，完成实名认证即可领取全平台通用代金券 16 元，免费调用 deepseek / qwen / glm5 等全品类大模型。', category: 'free-resources', url: 'https://cloud.siliconflow.cn/i/lQsiPTpO', source_type: 'admin', author_name: 'FireSeed官方' },
  { title: '智谱 BigModel GLM-5: 注册即送 2000 万 Tokens', description: '新一代旗舰模型 GLM-5，推理/代码/智能体能力达开源模型 SOTA。注册即送 2000 万 Tokens，适合 AI 小说创作和跑团。', category: 'free-resources', url: 'https://www.bigmodel.cn/invite?icode=x70Xu1tg5DvILXe%2FQUZWIA%3D%3D', source_type: 'admin', author_name: 'FireSeed官方' },
  { title: '腾讯 IMA: 免费解锁 Copilot', description: '通过推荐链接解锁 IMA Copilot 功能，并获得 500 免费算力。创建专属 AI 知识伙伴，辅助你的创作工作流。', category: 'free-resources', url: 'https://ima.qq.com/copilot-invite-reward-token/assist/V_5sR6zTzuz6W0wf8qLMng', source_type: 'admin', author_name: 'FireSeed官方' },
  { title: 'Groq 免费 API 额度', description: 'Groq 提供免费 API 额度，支持 Llama、Mixtral 等主流开源模型，推理速度极快，适合开发测试和学习使用。', category: 'free-resources', url: 'https://console.groq.com', source_type: 'admin', author_name: 'FireSeed官方' },

  // Category: api-update (API更新)
  { title: 'OpenAI GPT-4o 正式开放 API', description: 'OpenAI GPT-4o 多模态模型已全面开放 API 调用，支持文本、图像、音频输入，性能大幅提升，成本降低 50%。', category: 'api-update', url: 'https://platform.openai.com', source_type: 'admin', author_name: 'FireSeed官方' },
  { title: 'Claude 3.5 Sonnet 支持 200K 上下文', description: 'Anthropic 已将 Claude 3.5 Sonnet 的上下文窗口扩展至 200K tokens，适合长篇内容创作和代码分析。', category: 'api-update', url: 'https://docs.anthropic.com', source_type: 'admin', author_name: 'FireSeed官方' },
  { title: 'DeepSeek V3 模型价格大幅下调', description: 'DeepSeek-V3 API 价格再次下调，输入降至 ¥1.0/1M tokens，输出 ¥2.0/1M tokens，性价比极高。', category: 'api-update', url: 'https://platform.deepseek.com', source_type: 'admin', author_name: 'FireSeed官方' },

  // Category: model-release (模型发布)
  { title: 'GPT-5 多模态大模型发布', description: 'OpenAI 最新 GPT-5 模型发布，推理能力达到博士级水平，在 MATH、MMLU 等基准测试中取得突破性成绩。', category: 'model-release', url: 'https://openai.com', source_type: 'admin', author_name: 'FireSeed官方' },
  { title: '智谱 GLM-5 开源模型 SOTA', description: '智谱 AI 发布 GLM-5 模型，在多项基准测试中达到开源模型最优水平，特别在中文理解和推理任务表现突出。', category: 'model-release', url: 'https://www.bigmodel.cn', source_type: 'admin', author_name: 'FireSeed官方' },
  { title: '阿里通义千问 2.5 全新升级', description: '阿里云发布通义千问 2.5 系列模型，在中文创作、长文本理解和多轮对话方面大幅提升。', category: 'model-release', url: 'https://tongyi.aliyun.com', source_type: 'admin', author_name: 'FireSeed官方' },

  // Category: tool-recommend (工具推荐)
  { title: 'Cursor 编辑器: AI 编程最佳实践', description: 'Cursor 是一款 AI-first 代码编辑器，内置多模型 AI 对话。推荐用于开发 FireSeed 技能和自动化脚本。', category: 'tool-recommend', url: 'https://cursor.sh', source_type: 'admin', author_name: 'FireSeed官方' },
  { title: 'Claude Code: 终端 AI 编程工具', description: 'Anthropic 出品的终端 AI 编程工具，直接在命令行中完成代码生成、调试和重构。适合高级开发者。', category: 'tool-recommend', url: 'https://docs.anthropic.com/en/docs/claude-code', source_type: 'admin', author_name: 'FireSeed官方' },
  { title: 'Notion AI: 写作辅助工具推荐', description: 'Notion AI 集成在笔记工具中，支持大纲生成、内容扩写、翻译等功能。适合小说创作的前期构思。', category: 'tool-recommend', url: 'https://www.notion.so', source_type: 'admin', author_name: 'FireSeed官方' },

  // Category: event (活动通知)
  { title: '火种·百人AI作家共创计划招募中', description: 'FireSeed 发起百人AI作家共创计划，召集100位AI创作者共创青春治愈IP。入驻即享流量扶持、收益分成。', category: 'event', url: 'https://fireseed.online/plan', source_type: 'admin', author_name: 'FireSeed官方' },
  { title: 'FireSeed SEED 积分活动: 创作获取双倍奖励', description: '活动期间在 FireSeed 平台发布小说章节，可获得双倍 SEED 积分奖励。活动时间: 即日起至月底。', category: 'event', url: 'https://fireseed.online/download', source_type: 'admin', author_name: 'FireSeed官方' },
];

const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 180); // 6个月过期
const expiresAtStr = expiresAt.toISOString().replace('T', ' ').split('.')[0];

const insert = db.prepare(`
  INSERT OR IGNORE INTO opportunities (id, title, description, category, url, source_type, author_id, author_name, upvotes, downvotes, expires_at, is_active)
  VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 0, ?, 1)
`);

const insertMany = db.transaction(() => {
  let count = 0;
  for (const o of opportunities) {
    const id = randomUUID().replace(/-/g, '').slice(0, 16);
    const upvotes = Math.floor(Math.random() * 30) + 3;
    const result = insert.run(id, o.title, o.description, o.category, o.url, o.source_type, o.author_name, upvotes, expiresAtStr);
    if (result.changes > 0) count++;
  }
  return count;
})();

console.log(`插入 ${insertMany} 条商机数据`);
db.close();
