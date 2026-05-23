const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'novel.db');
const db = new Database(dbPath);

// 确保表存在（如果 lib/db.ts 还未初始化的话）
db.exec(`
  CREATE TABLE IF NOT EXISTS trusted_resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    tags TEXT DEFAULT '',
    provider_id TEXT,
    provider_name TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    useful_count INTEGER DEFAULT 0,
    useless_count INTEGER DEFAULT 0,
    verified_count INTEGER DEFAULT 0,
    last_verified_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const resources = [
  // Category: ai-tool (AI 对话/写作)
  { title: 'ChatGPT', url: 'https://chat.openai.com', description: 'OpenAI 开发的顶级对话式 AI，支持文本生成、编程、分析', category: 'ai-tool', tags: '聊天,写作,编程,通用' },
  { title: 'Claude', url: 'https://claude.ai', description: 'Anthropic 开发的 AI 助手，擅长长文本理解和安全对话', category: 'ai-tool', tags: '聊天,写作,分析,安全' },
  { title: 'Gemini', url: 'https://gemini.google.com', description: 'Google 多模态 AI 模型，支持文本、图像、音频理解', category: 'ai-tool', tags: '聊天,多模态,搜索' },
  { title: 'DeepSeek', url: 'https://chat.deepseek.com', description: '国产大语言模型，推理能力强，支持长上下文', category: 'ai-tool', tags: '聊天,推理,编程,国产' },
  { title: '通义千问', url: 'https://tongyi.aliyun.com', description: '阿里云开发的 AI 助手，支持文本生成、文档理解', category: 'ai-tool', tags: '聊天,写作,国产,办公' },
  { title: '豆包', url: 'https://www.doubao.com', description: '字节跳动开发的 AI 对话助手，集成在抖音生态', category: 'ai-tool', tags: '聊天,写作,国产,创意' },
  { title: 'Kimi', url: 'https://kimi.moonshot.cn', description: '月之暗面开发的长上下文 AI 助手，支持 20 万字超长文本', category: 'ai-tool', tags: '聊天,长文本,阅读,国产' },
  { title: '文心一言', url: 'https://yiyan.baidu.com', description: '百度开发的知识增强大语言模型', category: 'ai-tool', tags: '聊天,写作,国产,知识' },
  { title: '讯飞星火', url: 'https://xinghuo.xfyun.cn', description: '科大讯飞开发的认知大模型，支持多模态交互', category: 'ai-tool', tags: '聊天,多模态,国产,语音' },
  { title: '智谱清言', url: 'https://chatglm.cn', description: '智谱 AI 开发的中英双语对话模型', category: 'ai-tool', tags: '聊天,双语,国产' },
  { title: 'Groq', url: 'https://groq.com', description: '极速 AI 推理平台，LLM 响应速度极快', category: 'ai-tool', tags: '聊天,推理,高速' },
  { title: 'Perplexity', url: 'https://www.perplexity.ai', description: 'AI 搜索引擎，实时联网检索并生成带引用的回答', category: 'ai-tool', tags: '搜索,研究,实时' },
  { title: 'Poe', url: 'https://poe.com', description: 'Quora 开发的 AI 平台，聚合多个主流模型', category: 'ai-tool', tags: '聊天,聚合,多模型' },
  { title: 'Character.AI', url: 'https://character.ai', description: 'AI 角色扮演平台，可与各种虚拟角色对话', category: 'ai-tool', tags: '角色扮演,创意,娱乐' },
  { title: 'You.com', url: 'https://you.com', description: 'AI 搜索引擎，支持自定义 AI 模式', category: 'ai-tool', tags: '搜索,聊天,自定义' },
  { title: 'HuggingChat', url: 'https://huggingface.co/chat', description: 'HuggingFace 开源 AI 聊天平台，免费使用多种开源模型', category: 'ai-tool', tags: '聊天,开源,免费' },
  { title: 'Le Chat', url: 'https://chat.mistral.ai', description: 'Mistral AI 开发的对话助手，注重隐私保护', category: 'ai-tool', tags: '聊天,隐私,欧洲' },
  { title: 'Cohere Command', url: 'https://cohere.com/command', description: 'Cohere 的企业级生成式 AI 平台，支持 RAG', category: 'ai-tool', tags: '聊天,企业,RAG' },
  { title: 'AiChatting', url: 'https://www.aichatting.net', description: '多功能 AI 聊天平台，集成多种模型', category: 'ai-tool', tags: '聊天,聚合,多功能' },
  { title: 'TypingMind', url: 'https://www.typingmind.com', description: 'ChatGPT 增强客户端，提供更好的对话管理体验', category: 'ai-tool', tags: '客户端,增强,管理' },

  // Category: ai-coding (AI 编程)
  { title: 'GitHub Copilot', url: 'https://github.com/features/copilot', description: 'GitHub 推出的 AI 代码补全工具，集成主流 IDE', category: 'ai-coding', tags: '代码补全,IDE,付费' },
  { title: 'Cursor', url: 'https://cursor.sh', description: 'AI-first 代码编辑器，内置多模型 AI 对话', category: 'ai-coding', tags: '编辑器,AI原生,编程' },
  { title: 'Windsurf', url: 'https://codeium.com/windsurf', description: 'Codeium 开发的 AI 驱动代码编辑器', category: 'ai-coding', tags: '编辑器,AI驱动,免费' },
  { title: 'CodeBuddy', url: 'https://www.codebuddy.ai', description: '国产 AI 编程助手，支持代码审查和自动化', category: 'ai-coding', tags: '编程助手,代码审查,国产' },
  { title: 'Amazon CodeWhisperer', url: 'https://aws.amazon.com/codewhisperer', description: 'AWS 推出的 AI 编程助手，免费使用', category: 'ai-coding', tags: '编程,免费,AWS' },
  { title: 'Tabnine', url: 'https://www.tabnine.com', description: 'AI 代码补全工具，支持本地模型保护隐私', category: 'ai-coding', tags: '代码补全,隐私,本地' },
  { title: 'Replit AI', url: 'https://replit.com', description: '在线 IDE 内置 AI 编程助手，支持协作', category: 'ai-coding', tags: '在线IDE,协作,AI' },
  { title: 'Sourcegraph Cody', url: 'https://sourcegraph.com/cody', description: '代码搜索 AI，理解整个代码库的上下文', category: 'ai-coding', tags: '代码搜索,代码理解' },
  { title: 'Codeium', url: 'https://codeium.com', description: '免费 AI 代码补全工具，支持 40+ 语言', category: 'ai-coding', tags: '代码补全,免费,多语言' },
  { title: 'V0 by Vercel', url: 'https://v0.dev', description: 'Vercel 开发的 AI 前端代码生成工具，从描述生成 UI', category: 'ai-coding', tags: '前端,UI生成,React' },
  { title: 'Bolt.new', url: 'https://bolt.new', description: 'AI 全栈 Web 应用生成器，从提示词直接生成可部署应用', category: 'ai-coding', tags: '全栈,Web,生成器' },
  { title: 'Lovable', url: 'https://lovable.dev', description: 'AI 应用构建平台，描述需求自动生成应用', category: 'ai-coding', tags: '应用构建,无代码' },
  { title: 'Claude Code', url: 'https://docs.anthropic.com/en/docs/claude-code', description: 'Anthropic 出品的终端 AI 编程工具', category: 'ai-coding', tags: '终端,编程,CLI' },
  { title: 'Cline', url: 'https://github.com/cline/cline', description: 'VS Code 中自主 AI 编码代理，支持多模型', category: 'ai-coding', tags: 'VS Code,自主编码,开源' },
  { title: 'Gemini Code Assist', url: 'https://cloud.google.com/gemini-code-assist', description: 'Google Cloud 的 AI 编程助手', category: 'ai-coding', tags: '编程,云,GCP' },

  // Category: ai-image (AI 图像/设计)
  { title: 'Midjourney', url: 'https://www.midjourney.com', description: '顶级 AI 图像生成器，以艺术风格著称', category: 'ai-image', tags: '图像生成,艺术,付费' },
  { title: 'DALL-E 3', url: 'https://openai.com/dall-e-3', description: 'OpenAI 的图像生成模型，文字理解能力强', category: 'ai-image', tags: '图像生成,文字理解,OpenAI' },
  { title: 'Stable Diffusion', url: 'https://stability.ai', description: '开源图像生成模型，可本地部署', category: 'ai-image', tags: '图像生成,开源,本地' },
  { title: 'Canva AI', url: 'https://www.canva.com', description: '在线设计平台集成多种 AI 设计工具', category: 'ai-image', tags: '设计,模板,在线' },
  { title: 'Adobe Firefly', url: 'https://www.adobe.com/products/firefly.html', description: 'Adobe 的生成式 AI 工具集，集成 Photoshop', category: 'ai-image', tags: '设计,集成,商用' },
  { title: 'Leonardo.ai', url: 'https://leonardo.ai', description: 'AI 图像和视频生成平台，适合游戏资产', category: 'ai-image', tags: '图像,游戏资产,生成' },
  { title: 'ComfyUI', url: 'https://github.com/comfyanonymous/ComfyUI', description: '基于节点的 Stable Diffusion 工作流界面', category: 'ai-image', tags: '工作流,节点,开源' },
  { title: 'Fooocus', url: 'https://github.com/lllyasviel/Fooocus', description: 'Stable Diffusion 极简 GUI，一键出图', category: 'ai-image', tags: 'SD,简化,一键' },
  { title: 'Recraft', url: 'https://www.recraft.ai', description: 'AI 设计工具，支持矢量图和品牌风格', category: 'ai-image', tags: '设计,矢量,品牌' },
  { title: 'Clipdrop', url: 'https://clipdrop.co', description: 'Stability AI 的在线图像处理工具集', category: 'ai-image', tags: '图像处理,在线,工具集' },
  { title: 'Ideogram', url: 'https://ideogram.ai', description: 'AI 图像生成，文字渲染能力强', category: 'ai-image', tags: '图像,文字渲染,生成' },
  { title: 'Playground AI', url: 'https://playgroundai.com', description: '在线 AI 图像生成和编辑平台', category: 'ai-image', tags: '图像,编辑,在线' },
  { title: 'SeaArt', url: 'https://www.seaart.ai', description: '免费 AI 图像生成平台，支持多种模型', category: 'ai-image', tags: '图像,免费,国产' },
  { title: '通义万相', url: 'https://tongyi.aliyun.com/wanxiang', description: '阿里云 AI 图像生成和视频理解工具', category: 'ai-image', tags: '图像,视频,国产' },
  { title: 'LiblibAI', url: 'https://www.liblibai.com', description: '国内 SD 模型分享和在线生成平台', category: 'ai-image', tags: 'SD,模型分享,国产' },

  // Category: ai-video (AI 视频/音频)
  { title: 'Runway Gen-3', url: 'https://runwayml.com', description: 'AI 视频生成和编辑平台，支持文生视频', category: 'ai-video', tags: '视频生成,编辑,AI' },
  { title: 'Pika Labs', url: 'https://pika.art', description: 'AI 视频生成平台，支持风格化视频', category: 'ai-video', tags: '视频生成,风格化' },
  { title: 'Suno', url: 'https://suno.com', description: 'AI 音乐生成，根据文本生成完整歌曲', category: 'ai-video', tags: '音乐生成,文本转音乐' },
  { title: 'ElevenLabs', url: 'https://elevenlabs.io', description: 'AI 语音合成，音色克隆和拟人化语音', category: 'ai-video', tags: '语音合成,音色克隆' },
  { title: 'HeyGen', url: 'https://www.heygen.com', description: 'AI 视频生成，数字人播报视频', category: 'ai-video', tags: '数字人,视频,播报' },
  { title: 'Synthesia', url: 'https://www.synthesia.io', description: '企业级 AI 视频生成平台，150+ 数字人', category: 'ai-video', tags: '企业,数字人,视频' },
  { title: 'Descript', url: 'https://www.descript.com', description: 'AI 音视频编辑工具，像编辑文档一样编辑视频', category: 'ai-video', tags: '编辑,音视频,文档式' },
  { title: '剪映', url: 'https://jyy.capcut.cn', description: '字节跳动视频编辑工具，集成大量 AI 功能', category: 'ai-video', tags: '视频编辑,国产,AI' },
  { title: 'Luma Dream Machine', url: 'https://lumalabs.ai/dream-machine', description: 'AI 视频生成，高保真物理运动', category: 'ai-video', tags: '视频生成,物理,真实' },
  { title: 'Kling', url: 'https://kling.kuaishou.com', description: '快手 AI 视频生成，支持长视频生成', category: 'ai-video', tags: '视频,国产,长视频' },

  // Category: ai-api (AI API/平台)
  { title: 'OpenAI API', url: 'https://platform.openai.com', description: 'GPT 系列模型 API，全球最广泛使用的 LLM API', category: 'ai-api', tags: 'API,GPT,LLM' },
  { title: 'Anthropic API', url: 'https://docs.anthropic.com', description: 'Claude 模型 API，注重安全和长上下文', category: 'ai-api', tags: 'API,Claude,安全' },
  { title: 'Google AI Studio', url: 'https://makersuite.google.com', description: 'Gemini 模型 API 和在线调试平台', category: 'ai-api', tags: 'API,Gemini,调试' },
  { title: 'SiliconFlow', url: 'https://siliconflow.cn', description: '国产 AI API 平台，聚合多种开源模型', category: 'ai-api', tags: 'API,聚合,国产,开源' },
  { title: 'DeepSeek API', url: 'https://platform.deepseek.com', description: 'DeepSeek 模型 API，性价比极高', category: 'ai-api', tags: 'API,国产,性价比' },
  { title: 'Groq API', url: 'https://console.groq.com', description: '极速推理 API，开源模型，免费额度大', category: 'ai-api', tags: 'API,高速,免费' },
  { title: 'Replicate', url: 'https://replicate.com', description: '云 API 运行开源模型，按秒计费', category: 'ai-api', tags: 'API,开源,按需' },
  { title: 'Together AI', url: 'https://www.together.ai', description: '开源模型 API 平台，支持微调服务', category: 'ai-api', tags: 'API,开源,微调' },
  { title: 'GroqCloud', url: 'https://console.groq.com', description: 'Groq 的云端 AI 推理平台', category: 'ai-api', tags: 'API,推理,云' },
  { title: 'OpenRouter', url: 'https://openrouter.ai', description: '多模型 API 聚合平台，一个接口调用 200+ 模型', category: 'ai-api', tags: 'API,聚合,多模型' },
  { title: 'Fireworks AI', url: 'https://fireworks.ai', description: '快速推理平台，优化开源模型部署', category: 'ai-api', tags: 'API,推理,优化' },
  { title: 'Novita AI', url: 'https://novita.ai', description: 'AI API 市场，提供多种模型和图像 API', category: 'ai-api', tags: 'API,市场,多模型' },
  { title: '百度千帆', url: 'https://cloud.baidu.com/product/wenxinworkshop', description: '百度文心大模型 API 平台', category: 'ai-api', tags: 'API,国产,百度' },
  { title: '阿里百炼', url: 'https://bailian.aliyun.com', description: '阿里云大模型服务平台', category: 'ai-api', tags: 'API,国产,阿里云' },
  { title: '火山引擎', url: 'https://www.volcengine.com/product/doubao', description: '字节跳动豆包大模型 API 服务', category: 'ai-api', tags: 'API,国产,字节' },

  // Category: ai-data (数据/训练)
  { title: 'HuggingFace', url: 'https://huggingface.co', description: '最大的开源模型和数据集社区', category: 'ai-data', tags: '模型,数据集,社区' },
  { title: 'Kaggle', url: 'https://www.kaggle.com', description: '数据科学竞赛平台，提供免费数据集和 GPU', category: 'ai-data', tags: '竞赛,数据集,GPU' },
  { title: 'Reddit r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning', description: '机器学习社区，论文讨论和资源分享', category: 'ai-data', tags: '社区,论文,讨论' },
  { title: 'Papers With Code', url: 'https://paperswithcode.com', description: '论文 + 代码 + 基准排行榜，追踪最新进展', category: 'ai-data', tags: '论文,代码,排行榜' },
  { title: 'arXiv', url: 'https://arxiv.org', description: '学术预印本平台，AI 论文主要发布渠道', category: 'ai-data', tags: '论文,预印本,学术' },
  { title: 'Civitai', url: 'https://civitai.com', description: 'Stable Diffusion 模型和 LoRA 分享社区', category: 'ai-data', tags: 'SD,模型,LoRA' },
  { title: 'OpenAI Platform Docs', url: 'https://platform.openai.com/docs', description: 'OpenAI API 官方文档和指南', category: 'ai-data', tags: '文档,API,教程' },
  { title: 'LangChain Docs', url: 'https://python.langchain.com/docs', description: 'LangChain 框架文档，构建 LLM 应用', category: 'ai-data', tags: '框架,文档,LLM' },
  { title: 'ModelScope', url: 'https://modelscope.cn', description: '阿里达摩院模型社区，国产模型和数据集', category: 'ai-data', tags: '模型,国产,数据集' },
  { title: 'TensorFlow Hub', url: 'https://tfhub.dev', description: 'TensorFlow 预训练模型仓库', category: 'ai-data', tags: '模型,TensorFlow,预训练' },

  // Category: dev-tools (开发工具)
  { title: 'Vercel', url: 'https://vercel.com', description: '前端部署平台，支持 Next.js 一键部署', category: 'dev-tools', tags: '部署,前端,Serverless' },
  { title: 'Railway', url: 'https://railway.app', description: '全栈部署平台，支持多种语言和数据库', category: 'dev-tools', tags: '部署,全栈,数据库' },
  { title: 'Supabase', url: 'https://supabase.com', description: '开源 Firebase 替代，PostgreSQL + 实时订阅', category: 'dev-tools', tags: '数据库,BaaS,开源' },
  { title: 'Firebase', url: 'https://firebase.google.com', description: 'Google 后端服务平台，数据库+认证+托管', category: 'dev-tools', tags: 'BaaS,认证,数据库' },
  { title: 'Cloudflare Workers', url: 'https://workers.cloudflare.com', description: '边缘计算平台，全球部署 JS 服务', category: 'dev-tools', tags: '边缘计算,Serverless,CDN' },
  { title: 'NGINX', url: 'https://nginx.org', description: '高性能 Web 服务器和反向代理', category: 'dev-tools', tags: '服务器,反向代理,开源' },
  { title: 'Docker', url: 'https://www.docker.com', description: '容器化平台，标准化应用部署', category: 'dev-tools', tags: '容器,部署,DevOps' },
  { title: 'GitHub', url: 'https://github.com', description: '全球最大的代码托管平台', category: 'dev-tools', tags: '代码托管,协作,开源' },
  { title: 'Postman', url: 'https://www.postman.com', description: 'API 开发和测试工具', category: 'dev-tools', tags: 'API,测试,调试' },
  { title: 'PlanetScale', url: 'https://planetscale.com', description: 'MySQL 兼容的无服务器数据库平台', category: 'dev-tools', tags: '数据库,Serverless,MySQL' },

  // Category: other (其他)
  { title: 'Notion AI', url: 'https://www.notion.so', description: '笔记和协作工具集成 AI 写作助手', category: 'other', tags: '笔记,协作,写作' },
  { title: 'Otter.ai', url: 'https://otter.ai', description: 'AI 会议记录和转录工具', category: 'other', tags: '会议,转录,记录' },
  { title: 'Gamma', url: 'https://gamma.app', description: 'AI 演示文稿生成工具', category: 'other', tags: '演示,PPT,生成' },
  { title: 'Grammarly', url: 'https://www.grammarly.com', description: 'AI 写作助手，语法检查和风格优化', category: 'other', tags: '写作,语法,校对' },
  { title: 'Jasper', url: 'https://www.jasper.ai', description: 'AI 内容营销写作平台', category: 'other', tags: '营销,内容,写作' },
  { title: 'Copy.ai', url: 'https://www.copy.ai', description: 'AI 营销文案生成工具', category: 'other', tags: '营销,文案,生成' },
  { title: 'Writesonic', url: 'https://writesonic.com', description: 'AI 内容创作平台，支持多种格式', category: 'other', tags: '内容创作,多格式' },
  { title: 'Mem.ai', url: 'https://mem.ai', description: 'AI 笔记管理工具，自动整理和关联', category: 'other', tags: '笔记,管理,AI' },
  { title: 'Reforge', url: 'https://www.reforge.com', description: 'AI 驱动的知识库和成长平台', category: 'other', tags: '知识,成长,学习' },
  { title: 'Zapier AI', url: 'https://zapier.com', description: '自动化工作流平台，集成 5000+ 应用', category: 'other', tags: '自动化,工作流,集成' },
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO trusted_resources (id, title, url, description, category, tags, status, useful_count, useless_count, verified_count, is_active)
  VALUES (?, ?, ?, ?, ?, ?, 'verified', ?, 0, ?, 1)
`);

const insertMany = db.transaction(() => {
  let count = 0;
  for (const r of resources) {
    const id = randomUUID().replace(/-/g, '').slice(0, 16);
    const useful = Math.floor(Math.random() * 80) + 20;
    const useless = Math.floor(Math.random() * 10);
    const verified = Math.floor(Math.random() * 30) + 5;
    const result = insert.run(id, r.title, r.url, r.description, r.category, r.tags, useful, verified);
    if (result.changes > 0) count++;
  }
  return count;
})();

console.log(`插入 ${insertMany} 条资源数据`);
db.close();
