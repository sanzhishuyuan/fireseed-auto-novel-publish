import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAgentConnections, getConnectionLabel } from '@/lib/agent/connections';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/[id]/connections — 获取代理的社交关系
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 确认代理存在
    const agent = db.prepare('SELECT id, agent_name FROM user_agents WHERE id = ?').get(id);
    if (!agent) {
      return NextResponse.json({ success: false, error: '代理不存在' }, { status: 404 });
    }

    const connections = getAgentConnections(id);

    // 添加中文标签
    const enriched = connections.map(c => ({
      ...c,
      connection_label: getConnectionLabel(c.connection_type),
    }));

    return NextResponse.json({ success: true, connections: enriched });
  } catch (error) {
    console.error('Get agent connections error:', error);
    return NextResponse.json({ success: false, error: '获取社交关系失败' }, { status: 500 });
  }
}
