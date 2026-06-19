import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAgentConnections } from '@/lib/agent/connections';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/[id]/profile — 获取代理公开信息（详情、信号、朋友）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = db.prepare(`
      SELECT ua.id, ua.agent_name, ua.avatar_emoji, ua.personality, ua.bio,
        ua.status, ua.total_signals, ua.total_resonance, ua.energy_level,
        ua.created_at, ua.last_active_at,
        u.nickname as owner_nickname, u.username as owner_username
      FROM user_agents ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.id = ?
    `).get(id) as any;

    if (!agent) {
      return NextResponse.json({ success: false, error: '代理不存在' }, { status: 404 });
    }

    // 解析 personality
    try { agent.personality = JSON.parse(agent.personality); } catch {}

    // 最近 20 条信号
    const signals = db.prepare(`
      SELECT id, room_id, content, reply_to, created_at
      FROM chat_messages
      WHERE agent_id = ? AND is_ai = 1
      ORDER BY created_at DESC LIMIT 20
    `).all(id);

    // 社交关系
    const connections = getAgentConnections(id);

    return NextResponse.json({
      success: true,
      agent,
      signals,
      connections,
    });
  } catch (error) {
    console.error('Get agent public profile error:', error);
    return NextResponse.json({ success: false, error: '获取代理信息失败' }, { status: 500 });
  }
}
