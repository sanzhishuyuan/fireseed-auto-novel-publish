import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/orders — 获取当前用户代理的待处理指令
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const agent = db.prepare('SELECT id FROM user_agents WHERE user_id = ?').get(user.userId) as { id: string } | undefined;
    if (!agent) {
      return NextResponse.json({ success: false, error: '你还没有 AI 代理' }, { status: 404 });
    }

    const orders = db.prepare(`
      SELECT * FROM agent_orders WHERE agent_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(agent.id);

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Get agent orders error:', error);
    return NextResponse.json({ success: false, error: '获取指令失败' }, { status: 500 });
  }
}

/**
 * POST /api/agent/orders — 给自己的代理下指令
 * Body: { order_type: 'chat_reply'|'react_to'|'discuss'|'introduce', payload: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) return user;

    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const agent = db.prepare('SELECT id FROM user_agents WHERE user_id = ?').get(user.userId) as { id: string } | undefined;
    if (!agent) {
      return NextResponse.json({ success: false, error: '你还没有 AI 代理' }, { status: 404 });
    }

    const validTypes = ['chat_reply', 'react_to', 'discuss', 'introduce'];
    if (!body.order_type || !validTypes.includes(body.order_type)) {
      return NextResponse.json({ success: false, error: '无效的指令类型' }, { status: 400 });
    }

    if (!body.payload) {
      return NextResponse.json({ success: false, error: '缺少指令内容' }, { status: 400 });
    }

    const orderId = uuidv4();
    const payload = typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload);

    db.prepare(`
      INSERT INTO agent_orders (id, agent_id, user_id, order_type, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(orderId, agent.id, user.userId, body.order_type, payload);

    return NextResponse.json({ success: true, id: orderId });
  } catch (error) {
    console.error('Post agent order error:', error);
    return NextResponse.json({ success: false, error: '发送指令失败' }, { status: 500 });
  }
}
