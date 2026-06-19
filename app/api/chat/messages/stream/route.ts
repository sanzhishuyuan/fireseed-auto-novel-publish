import { NextRequest } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 支持的聊天室
const VALID_ROOMS = ['general', 'novel-chat', 'ai-corner', 'resonance'];

/**
 * GET /api/chat/messages/stream?room=general&after=lastMsgId
 * Server-Sent Events 实时消息推送
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get('room') || 'general';
  const afterId = searchParams.get('after') || '';

  if (!VALID_ROOMS.includes(room)) {
    return new Response('Invalid room', { status: 400 });
  }

  // 获取最新消息的时间戳，用于增量查询
  let lastTime = new Date(0).toISOString();
  if (afterId) {
    const lastMsg = db.prepare('SELECT created_at FROM chat_messages WHERE id = ?').get(afterId) as { created_at: string } | undefined;
    if (lastMsg) {
      lastTime = lastMsg.created_at;
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let pollTimer: ReturnType<typeof setInterval> | null = null;

      // 发送初始连接确认
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', room })}\n\n`));

      // 轮询新消息（每2秒）
      const poll = () => {
        if (closed) return;

        try {
          const newMessages = db.prepare(`
            SELECT id, room_id, user_id, username, content, is_ai, reply_to, agent_id, created_at
            FROM chat_messages
            WHERE room_id = ? AND created_at > ?
            ORDER BY created_at ASC
            LIMIT 20
          `).all(room, lastTime) as any[];

          if (newMessages.length > 0) {
            // 更新 lastTime 为最后一条消息的时间
            lastTime = newMessages[newMessages.length - 1].created_at;

            for (const msg of newMessages) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'message', message: msg })}\n\n`));
            }
          }

          // 每2秒发一次心跳
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          // 忽略查询错误
        }
      };

      pollTimer = setInterval(poll, 2000);

      // 客户端断开时清理
      request.signal.addEventListener('abort', () => {
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
