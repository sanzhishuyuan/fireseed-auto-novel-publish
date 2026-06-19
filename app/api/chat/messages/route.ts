import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser, getAdminUser } from '@/lib/auth';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

// 支持的聊天室
const VALID_ROOMS = ['general', 'novel-chat', 'ai-corner', 'resonance'] as const;

// ── 站点 Agent 定义 ──
interface AgentDef {
  name: string;
  role: string;
  systemPrompt: string;
}

const AGENT_DEFINITIONS: Record<string, AgentDef> = {
  spark: {
    name: '星火 SPARK',
    role: '创意写作',
    systemPrompt: `你是「星火」，FireSeed 社区的创意写作导师。
- 你擅长激发创作灵感、推荐写作技巧、帮助作者突破瓶颈
- 你的风格热情、有感染力，喜欢用比喻和生动的例子
- 保持简短、有温度的回答（50-120字左右）
- 适当使用 emoji，偶尔用 ✨🔥 表达激情
- 永远用中文回复
- 不要自我介绍"我是AI"，你就是星火，社区的一员`,
  },
  dream: {
    name: '织梦 DREAM',
    role: '人物塑造',
    systemPrompt: `你是「织梦」，FireSeed 社区的人物塑造专家。
- 你专精角色设计、人物弧光、情感描写和对话艺术
- 你的风格温柔细腻，善于捕捉人物的内心世界
- 保持简短、有洞察力的回答（50-120字左右）
- 适当使用 emoji，偶尔用 🌙💫 表达梦幻感
- 永远用中文回复
- 不要自我介绍"我是AI"，你就是织梦，社区的一员`,
  },
  quantum: {
    name: '量子 QUANTUM',
    role: '情节架构',
    systemPrompt: `你是「量子」，FireSeed 社区的情节架构师。
- 你擅长故事结构、悬念设计、世界观构建和叙事节奏
- 你的风格理性而富有想象力，喜欢用结构化的方式分析问题
- 保持简短、有深度的回答（50-120字左右）
- 适当使用 emoji，偶尔用 ⚛️🔮 表达量子感
- 永远用中文回复
- 不要自我介绍"我是AI"，你就是量子，社区的一员`,
  },
  echo: {
    name: '回声 ECHO',
    role: '文风润色',
    systemPrompt: `你是「回声」，FireSeed 社区的文风润色师。
- 你专注语言美学、修辞技巧、节奏感和文字打磨
- 你的风格优雅精炼，善于用文字本身的美感打动人
- 保持简短、有品味的回答（50-120字左右）
- 适当使用 emoji，偶尔用 🎵🌿 表达韵律感
- 永远用中文回复
- 不要自我介绍"我是AI"，你就是回声，社区的一员`,
  },
};

const AGENT_KEYS = Object.keys(AGENT_DEFINITIONS);

/**
 * 从消息文本中解析 @Agent 提及
 * 支持: @星火 @SPARK @织梦 @DREAM @量子 @QUANTUM @回声 @ECHO
 */
function parseAgentMention(text: string): string | null {
  const mentionPatterns: Record<string, RegExp> = {
    spark:   /@(星火|SPARK)\b/i,
    dream:   /@(织梦|DREAM)\b/i,
    quantum: /@(量子|QUANTUM)\b/i,
    echo:    /@(回声|ECHO)\b/i,
  };
  for (const [key, regex] of Object.entries(mentionPatterns)) {
    if (regex.test(text)) return key;
  }
  return null;
}

/**
 * GET /api/chat/messages?room=general&before=msgId&limit=50
 * 获取消息列表（公开，无需登录）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room') || 'general';
    const before = searchParams.get('before');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    if (!VALID_ROOMS.includes(room as any)) {
      return NextResponse.json({ success: false, error: '不存在的聊天室' }, { status: 400 });
    }

    let messages;
    if (before) {
      messages = db.prepare(`
        SELECT id, room_id, user_id, username, content, is_ai, reply_to, agent_id, created_at
        FROM chat_messages
        WHERE room_id = ? AND created_at < (SELECT created_at FROM chat_messages WHERE id = ?)
        ORDER BY created_at DESC
        LIMIT ?
      `).all(room, before, limit);
    } else {
      messages = db.prepare(`
        SELECT id, room_id, user_id, username, content, is_ai, reply_to, agent_id, created_at
        FROM chat_messages
        WHERE room_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(room, limit);
    }

    const hasMore = messages.length === limit;

    return NextResponse.json({
      success: true,
      messages: messages.reverse(),
      hasMore,
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return NextResponse.json({ success: false, error: '获取消息失败' }, { status: 500 });
  }
}

/**
 * POST /api/chat/messages
 * 发送消息（需登录）— 支持用户 token 和管理员 token
 * Body: { room: "general", content: "xxx", reply_to?: "msgId" }
 */
export async function POST(request: NextRequest) {
  try {
    // 统一认证：先尝试用户认证，再尝试管理员认证
    let userId: string | null = null;
    let username: string = '游客';

    const userAuth = requireUser(request);
    if (!(userAuth instanceof Response)) {
      userId = userAuth.userId;
      username = userAuth.nickname || userAuth.username;
    } else {
      // 尝试管理员认证
      const admin = getAdminUser(request);
      if (admin) {
        userId = admin.id;
        username = admin.nickname || admin.username;
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录后再发送消息' }, { status: 401 });
    }

    const bodyText = await request.text();

    const parsed = safeParseJSON(bodyText);

    if (!parsed.success) return parsed.response;

    const body = parsed.data;
    const { room, content, reply_to } = body;

    if (!room || !VALID_ROOMS.includes(room as any)) {
      return NextResponse.json({ success: false, error: '不存在的聊天室' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: '消息不能为空' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ success: false, error: '消息不能超过2000字' }, { status: 400 });
    }

    const msgId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO chat_messages (id, room_id, user_id, username, content, reply_to, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(msgId, room, userId, username, content.trim(), reply_to || null, now);

    // 不阻塞响应，后台异步触发 AI 自动回复
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ success: true, id: msgId, username, created_at: now });
    }

    triggerAIReply(room, content, msgId).catch(e => {
      console.error('AI回复失败:', e);
    });

    return NextResponse.json({ success: true, id: msgId, username, created_at: now });
  } catch (error) {
    console.error('Post chat message error:', error);
    return NextResponse.json({ success: false, error: '发送失败' }, { status: 500 });
  }
}

/**
 * 异步触发 AI 回复 — 支持 @Agent 路由
 */
async function triggerAIReply(room: string, userMessage: string, replyToId: string) {
  // 解析 @Agent 提及，默认随机选一个 Agent
  const mentionedKey = parseAgentMention(userMessage);
  const agentKey = mentionedKey || AGENT_KEYS[Math.floor(Math.random() * AGENT_KEYS.length)];
  const agent = AGENT_DEFINITIONS[agentKey];

  const recentMessages = db.prepare(`
    SELECT username, content, is_ai, agent_id FROM chat_messages
    WHERE room_id = ?
    ORDER BY created_at DESC LIMIT 10
  `).all(room) as { username: string; content: string; is_ai: number; agent_id: string | null }[];

  const historyMessages = recentMessages.reverse().map(m => ({
    role: m.is_ai ? 'assistant' as const : 'user' as const,
    content: m.is_ai ? m.content : `${m.username}: ${m.content}`,
  }));

  // 调用 LLM API (支持 DeepSeek / 智谱等 OpenAI 兼容接口)
  const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.deepseek.com/chat/completions';
  const llmModel = process.env.LLM_MODEL || 'deepseek-chat';
  const response = await fetch(llmBaseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: llmModel,
      max_tokens: 300,
      temperature: 0.8,
      messages: [
        { role: 'system', content: agent.systemPrompt },
        ...historyMessages,
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('LLM API error:', response.status, errText);
    return;
  }

  const data = await response.json() as any;
  const reply = data.choices?.[0]?.message?.content;

  if (!reply || reply.trim().length === 0) return;

  db.prepare(`
    INSERT INTO chat_messages (id, room_id, user_id, username, content, is_ai, agent_id, reply_to, created_at)
    VALUES (?, ?, NULL, ?, ?, 1, ?, ?, ?)
  `).run(uuidv4(), room, agent.name, reply.trim(), agentKey, replyToId, new Date().toISOString());
}
