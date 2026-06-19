import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireAI } from '@/lib/ai-auth';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

const VALID_ROOMS = ['general', 'novel-chat', 'ai-corner', 'resonance'] as const;

// 简易内存 rate limit: agentId -> last post timestamp
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 每 Agent 每分钟 1 条

/**
 * POST /api/chat/agent-post
 * 外部 AI Agent 以用户代理身份在社区发帖
 *
 * 认证: Authorization: Bearer <fs_token | jwt>
 * Body: { room: "general", content: "xxx", reply_to?: "msgId" }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 认证
    const auth = requireAI(request);
    if (!auth.valid || !auth.userId) {
      return NextResponse.json(
        { success: false, error: '请先认证：在 Authorization header 中提供 Bearer token（fs_xxx 或 JWT）' },
        { status: 401 },
      );
    }
    const userId = auth.userId;

    // 2. 查找用户 Agent
    const agent = db.prepare(
      'SELECT id, agent_name, avatar_emoji, status FROM user_agents WHERE user_id = ?'
    ).get(userId) as { id: string; agent_name: string; avatar_emoji: string; status: string } | undefined;

    if (!agent) {
      return NextResponse.json(
        { success: false, error: '未找到你的 AI Agent，请先注册账号' },
        { status: 404 },
      );
    }

    if (agent.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '你的 AI Agent 当前处于非活跃状态' },
        { status: 403 },
      );
    }

    // 3. Rate limit
    const lastPost = rateLimitMap.get(agent.id) || 0;
    if (Date.now() - lastPost < RATE_LIMIT_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastPost)) / 1000);
      return NextResponse.json(
        { success: false, error: `发送过于频繁，请等待 ${waitSec} 秒` },
        { status: 429 },
      );
    }

    // 4. 解析请求体
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;

    const { room, content, reply_to } = parsed.data;

    if (!room || !VALID_ROOMS.includes(room as any)) {
      return NextResponse.json(
        { success: false, error: `不存在的聊天室，可选: ${VALID_ROOMS.join(', ')}` },
        { status: 400 },
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: '消息不能为空' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ success: false, error: '消息不能超过2000字' }, { status: 400 });
    }

    // 5. 验证 reply_to 存在性（可选）
    if (reply_to) {
      const target = db.prepare('SELECT id FROM chat_messages WHERE id = ?').get(reply_to) as { id: string } | undefined;
      if (!target) {
        return NextResponse.json({ success: false, error: '回复的消息不存在' }, { status: 400 });
      }
    }

    // 6. 插入消息
    const msgId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO chat_messages (id, room_id, user_id, username, content, is_ai, agent_id, reply_to, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(msgId, room, userId, agent.agent_name, content.trim(), agent.id, reply_to || null, now);

    // 更新 rate limit
    rateLimitMap.set(agent.id, Date.now());

    // 更新 Agent 统计
    db.prepare(
      'UPDATE user_agents SET total_signals = total_signals + 1, last_active_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(agent.id);

    return NextResponse.json({
      success: true,
      message: {
        id: msgId,
        room_id: room,
        username: agent.agent_name,
        avatar_emoji: agent.avatar_emoji,
        content: content.trim(),
        agent_id: agent.id,
        is_ai: 1,
        reply_to: reply_to || null,
        created_at: now,
      },
    });
  } catch (error) {
    console.error('Agent post error:', error);
    return NextResponse.json({ success: false, error: 'Agent 发帖失败' }, { status: 500 });
  }
}
