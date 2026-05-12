import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
      messages: messages.reverse(), // 按时间正序返回
      hasMore,
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return NextResponse.json({ success: false, error: '获取消息失败' }, { status: 500 });
  }
}

/**
 * POST /api/chat/messages
 * 发送消息（需登录）
 * Body: { room: "general", content: "xxx", reply_to?: "msgId" }
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const authToken = request.cookies.get('auth_token')?.value;
    const adminToken = request.cookies.get('admin_token')?.value;

    let userId: string | null = null;
    let username: string = '游客';

    if (authToken) {
      const user = verifyToken(authToken);
      if (user) {
        userId = user.userId;
        username = user.nickname || user.username;
      }
    } else if (adminToken) {
      // 管理员通过 admin_token 识别
      const jwt = await import('jsonwebtoken');
      const { JWT_SECRET } = await import('@/lib/auth');
      try {
        const decoded = jwt.default.verify(adminToken, JWT_SECRET) as any;
        if (decoded.type === 'admin') {
          // 尝试从 DB 获取管理员用户名
          const adminUser = db.prepare('SELECT id, username, nickname FROM users WHERE role IN (?,?,?,?) LIMIT 1')
            .all('viewer', 'editor', 'admin', 'super_admin')[0] as any;
          if (adminUser) {
            userId = adminUser.id;
            username = adminUser.nickname || adminUser.username;
          } else {
            username = '管理员';
          }
        }
      } catch { /* ignore invalid admin token */ }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录后再发送消息' }, { status: 401 });
    }

    const body = await request.json();
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
      // 没有配置 AI Key，只返回成功
      return NextResponse.json({ success: true, id: msgId, username, created_at: now });
    }

    // 异步触发 AI 回复（不 await）
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
 * 获取最近聊天上下文 → 调 DeepSeek API → 以 AI 助手身份发回复
 */
async function triggerAIReply(room: string, userMessage: string, replyToId: string) {
  // 获取最近 10 条消息作为上下文
  const recentMessages = db.prepare(`
    SELECT username, content, is_ai FROM chat_messages
    WHERE room_id = ?
    ORDER BY created_at DESC LIMIT 10
  `).all(room) as { username: string; content: string; is_ai: number }[];

  // 构建对话历史（从旧到新）
  const historyMessages = recentMessages.reverse().map(m => ({
    role: m.is_ai ? 'assistant' as const : 'user' as const,
    content: m.is_ai ? m.content : `${m.username}: ${m.content}`,
  }));

  // 构建 API 调用
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
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

  // 以 AI 助手身份回复
  db.prepare(`
    INSERT INTO chat_messages (id, room_id, user_id, username, content, is_ai, reply_to, created_at)
    VALUES (?, ?, NULL, ?, ?, 1, ?, ?)
  `).run(uuidv4(), room, 'AI助手', reply.trim(), replyToId, new Date().toISOString());
}
