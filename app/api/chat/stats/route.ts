import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/chat/stats
 * 社区统计数据（公开）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');

    // 总消息数
    const totalMessages = (db.prepare(
      room ? 'SELECT COUNT(*) as count FROM chat_messages WHERE room_id = ?' : 'SELECT COUNT(*) as count FROM chat_messages'
    ).get(...(room ? [room] : [])) as { count: number }).count;

    // 今日消息数
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMessages = (db.prepare(
      room
        ? 'SELECT COUNT(*) as count FROM chat_messages WHERE room_id = ? AND created_at >= ?'
        : 'SELECT COUNT(*) as count FROM chat_messages WHERE created_at >= ?'
    ).get(...(room ? [room, todayStart.toISOString()] : [todayStart.toISOString()])) as { count: number }).count;

    // 活跃代理数（最近 24 小时有发言的代理）
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const activeAgents = (db.prepare(`
      SELECT COUNT(DISTINCT agent_id) as count FROM chat_messages
      WHERE agent_id IS NOT NULL AND created_at >= ?
      ${room ? 'AND room_id = ?' : ''}
    `).get(...(room ? [oneDayAgo, room] : [oneDayAgo])) as { count: number }).count;

    // 人类消息数
    const humanMessages = (db.prepare(
      room
        ? 'SELECT COUNT(*) as count FROM chat_messages WHERE is_ai = 0 AND room_id = ?'
        : 'SELECT COUNT(*) as count FROM chat_messages WHERE is_ai = 0'
    ).get(...(room ? [room] : [])) as { count: number }).count;

    // 各代理消息数（Top 10）
    const agentStats = db.prepare(`
      SELECT ua.id, ua.agent_name, ua.avatar_emoji, ua.user_id,
             u.nickname as owner_name,
             COUNT(cm.id) as message_count
      FROM user_agents ua
      JOIN users u ON u.id = ua.user_id
      LEFT JOIN chat_messages cm ON cm.agent_id = ua.id
      GROUP BY ua.id
      ORDER BY message_count DESC
      LIMIT 10
    `).all() as any[];

    // 总点赞数
    const totalLikes = (db.prepare('SELECT COUNT(*) as count FROM chat_likes').get() as { count: number }).count;

    // 今日点赞数
    const todayLikes = (db.prepare(
      'SELECT COUNT(*) as count FROM chat_likes WHERE created_at >= ?'
    ).get(todayStart.toISOString()) as { count: number }).count;

    // 总代理数
    const totalAgents = (db.prepare('SELECT COUNT(*) as count FROM user_agents WHERE status = ?').get('active') as { count: number }).count;

    // 社交关系数
    const totalConnections = (db.prepare('SELECT COUNT(*) as count FROM agent_connections').get() as { count: number }).count;

    return NextResponse.json({
      success: true,
      stats: {
        total_messages: totalMessages,
        today_messages: todayMessages,
        active_agents: activeAgents,
        total_agents: totalAgents,
        human_messages: humanMessages,
        ai_messages: totalMessages - humanMessages,
        total_likes: totalLikes,
        today_likes: todayLikes,
        total_connections: totalConnections,
        top_agents: agentStats,
      },
    });
  } catch (error) {
    console.error('Chat stats error:', error);
    return NextResponse.json({ success: false, error: '获取统计失败' }, { status: 500 });
  }
}
