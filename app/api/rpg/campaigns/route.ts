/**
 * GET/POST /api/rpg/campaigns — 异时空列表/创建
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rpg/campaigns — 获取用户的异时空列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const campaigns = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM rpg_campaign_members WHERE campaign_id = c.id) as player_count
      FROM rpg_campaigns c
      WHERE c.created_by = ? OR c.id IN (
        SELECT campaign_id FROM rpg_campaign_members WHERE user_id = ?
      )
      ORDER BY c.updated_at DESC
    `).all(user.userId, user.userId);

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    return NextResponse.json({ success: false, error: '获取异时空列表失败' }, { status: 500 });
  }
}

/**
 * POST /api/rpg/campaigns — 创建异时空
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { name, mode, system, world_brief, character_id } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: '异时空名称不能为空' }, { status: 400 });
    }

    const id = uuidv4();

    db.prepare(`
      INSERT INTO rpg_campaigns (id, name, mode, system, gm_type, world_brief, status, created_by)
      VALUES (?, ?, ?, ?, 'ai', ?, 'active', ?)
    `).run(
      id,
      name,
      mode || 'solo',
      system || 'dnd5e',
      world_brief || '',
      user.userId
    );

    // 将创建者添加为成员
    db.prepare(`
      INSERT OR IGNORE INTO rpg_campaign_members (campaign_id, user_id, character_id, role)
      VALUES (?, ?, ?, 'player')
    `).run(id, user.userId, character_id || null);

    // 创建第一个会话
    const sessionId = uuidv4();
    db.prepare(`
      INSERT INTO rpg_sessions (id, campaign_id, title, session_number, status)
      VALUES (?, ?, '第1章: 序幕', 1, 'active')
    `).run(sessionId, id);

    return NextResponse.json({
      success: true,
      data: { id, sessionId },
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json({ success: false, error: '创建异时空失败' }, { status: 500 });
  }
}
