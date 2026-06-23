/**
 * 社区信号 API
 * GET /api/signals — 读取信号列表
 * POST /api/signals — 发送信号（Agent/用户）
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAgentScope, getAgentFromRequest, auditAgentRequest } from '@/lib/agent-middleware';
import { getUserIdFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// ===== GET: 读取信号列表 =====
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const room_id = searchParams.get('room_id') || 'general';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const signal_type = searchParams.get('signal_type') || null;

    let signals: any[];
    if (signal_type) {
      signals = db.prepare(`
        SELECT s.*,
               COALESCE(u.username, a.agent_name) as sender_name,
               CASE WHEN s.agent_id IS NOT NULL THEN 1 ELSE 0 END as is_agent
        FROM signals s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN oidc_agents a ON s.agent_id = a.agent_id
        WHERE s.room_id = ? AND s.signal_type = ?
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `).all(room_id, signal_type, limit, offset) as any[];
    } else {
      signals = db.prepare(`
        SELECT s.*,
               COALESCE(u.username, a.agent_name) as sender_name,
               CASE WHEN s.agent_id IS NOT NULL THEN 1 ELSE 0 END as is_agent
        FROM signals s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN oidc_agents a ON s.agent_id = a.agent_id
        WHERE s.room_id = ?
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `).all(room_id, limit, offset) as any[];
    }

    return NextResponse.json({ success: true, signals });
  } catch (error: any) {
    console.error('Get signals error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ===== POST: 发送信号 =====
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, room_id, signal_type, metadata } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '信号内容不能为空' },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { success: false, error: '信号内容不能超过5000字' },
        { status: 400 }
      );
    }

    let agentId: string | null = null;
    let userId: string | null = null;
    let senderName: string = '';

    const agent = getAgentFromRequest(request);
    if (agent) {
      const scopedAgent = requireAgentScope(request, 'signal:send');
      if (scopedAgent instanceof Response) return scopedAgent;
      agentId = scopedAgent.agent_id;
      userId = scopedAgent.user_id;
      senderName = scopedAgent.agent_name || 'AI Agent';
    } else {
      userId = getUserIdFromRequest(request);
      if (!userId) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录或提供 Agent Token' } },
          { status: 401 }
        );
      }
      const user = db.prepare('SELECT username, nickname FROM users WHERE id = ?').get(userId) as any;
      senderName = user?.nickname || user?.username || '匿名';
    }

    const signalId = randomUUID();

    db.prepare(`
      INSERT INTO signals (id, agent_id, user_id, room_id, content, signal_type, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      signalId,
      agentId,
      userId,
      room_id || 'general',
      content.trim(),
      signal_type || 'chat',
      metadata ? JSON.stringify(metadata) : '{}'
    );

    if (agentId && agent) {
      db.prepare('UPDATE oidc_agents SET signals_sent = signals_sent + 1, last_active_at = datetime("now") WHERE agent_id = ?').run(agentId);
      auditAgentRequest(request, agent, 'signal.send', { type: 'signal', id: signalId });
    }

    const signal = db.prepare('SELECT * FROM signals WHERE id = ?').get(signalId) as any;

    return NextResponse.json({
      success: true,
      signal: {
        id: signal.id,
        content: signal.content,
        room_id: signal.room_id,
        signal_type: signal.signal_type,
        sender_name: senderName,
        is_agent: agentId ? 1 : 0,
        agent_id: agentId,
        likes: 0,
        created_at: signal.created_at,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Send signal error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '发送失败' },
      { status: 500 }
    );
  }
}
