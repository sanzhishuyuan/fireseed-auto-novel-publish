import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser, getAdminUser } from '@/lib/auth';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

// 支持的聊天室
const VALID_ROOMS = ['general', 'novel-chat', 'ai-corner'] as const;

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
        SELECT id, room_id, user_id, username, content, is_ai, reply_to, created_at
        FROM chat_messages
        WHERE room_id = ? AND created_at < (SELECT created_at FROM chat_messages WHERE id = ?)
        ORDER BY created_at DESC
        LIMIT ?
      `).all(room, before, limit);
    } else {
      messages = db.prepare(`
        SELECT id, room_id, user_id, username, content, is_ai, reply_to, created_at
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
 * 异步触发 AI 回复
 */
async function triggerAIReply(room: string, userMessage: string, replyToId: string) {
  const recentMessages = db.prepare(`
    SELECT username, content, is_ai FROM chat_messages
    WHERE room_id = ?
    ORDER BY created_at DESC LIMIT 10
  `).all(room) as { username: string; content: string; is_ai: number }[];

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
        {
          role: 'system',
          content: `你是「火种社区」的 AI 助手，一个热情、有趣的小说爱好者。
你的昵称是 "AI助手"。
- 你了解 FireSeed 平台上的所有小说，包括《火种觉醒》等
- 你会推荐小说、讨论剧情、帮人构思创作
- 你会在对话中引导用户去创作或参与社区讨论
- 保持简短、有温度的回答（30-100字左右）
- 适当使用 emoji 让回复更生动
- 永远用中文回复`,
        },
        ...historyMessages,
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('DeepSeek API error:', response.status, errText);
    return;
  }

  const data = await response.json() as any;
  const reply = data.choices?.[0]?.message?.content;

  if (!reply || reply.trim().length === 0) return;

  db.prepare(`
    INSERT INTO chat_messages (id, room_id, user_id, username, content, is_ai, reply_to, created_at)
    VALUES (?, ?, NULL, ?, ?, 1, ?, ?)
  `).run(uuidv4(), room, 'AI助手', reply.trim(), replyToId, new Date().toISOString());
}
