/**
 * GET/POST /api/rpg/campaigns — 副本列表/创建
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rpg/campaigns — 获取用户的副本列表（含已购买的副本）
 * 支持 ?tab=owned|purchased|all 过滤自有/已购买副本（默认 all）
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'all';

    // 自有或参与的副本
    const owned = (tab === 'owned' || tab === 'all')
      ? db.prepare(`
          SELECT c.*, 
            (SELECT COUNT(*) FROM rpg_campaign_members WHERE campaign_id = c.id) as player_count,
            0 as _purchased
          FROM rpg_campaigns c
          WHERE c.created_by = ? OR c.id IN (
            SELECT campaign_id FROM rpg_campaign_members WHERE user_id = ?
          )
          ORDER BY c.updated_at DESC
        `).all(user.userId, user.userId) as any[]
      : [];

    // 已购买的副本（从 rpg_asset_library 查 asset_type='module'）
    const purchased = (tab === 'purchased' || tab === 'all')
      ? db.prepare(`
          SELECT c.*,
            (SELECT COUNT(*) FROM rpg_campaign_members WHERE campaign_id = c.id) as player_count,
            1 as _purchased
          FROM rpg_campaigns c
          INNER JOIN rpg_asset_library al ON al.asset_id = c.id AND al.asset_type = 'module'
          WHERE al.user_id = ? AND al.source = 'purchased'
          ORDER BY al.acquired_at DESC
        `).all(user.userId) as any[]
      : [];

    // 合并去重
    const ids = new Set<string>();
    const campaigns = [];
    for (const c of [...owned, ...purchased]) {
      if (!ids.has(c.id)) {
        ids.add(c.id);
        campaigns.push(c);
      }
    }

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    return NextResponse.json({ success: false, error: '获取副本列表失败' }, { status: 500 });
  }
}

/**
 * POST /api/rpg/campaigns — 创建副本
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { name, mode, system, world_brief, character_id, lorebook_id } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: '副本名称不能为空' }, { status: 400 });
    }

    const id = uuidv4();

    // 验证世界书所有权或已购买（如果指定了 lorebook_id）
    if (lorebook_id) {
      const lbOwned = db.prepare('SELECT id FROM rpg_lorebooks WHERE id = ? AND user_id = ?').get(lorebook_id, user.userId);
      const lbPurchased = db.prepare(
        "SELECT id FROM rpg_asset_library WHERE asset_id = ? AND asset_type = 'lorebook' AND user_id = ? AND source = 'purchased'"
      ).get(lorebook_id, user.userId);
      if (!lbOwned && !lbPurchased) {
        return NextResponse.json({ success: false, error: '世界书不存在或无权使用' }, { status: 400 });
      }
    }

    db.prepare(`
      INSERT INTO rpg_campaigns (id, name, mode, system, gm_type, world_brief, lorebook_id, status, created_by)
      VALUES (?, ?, ?, ?, 'ai', ?, ?, 'active', ?)
    `).run(
      id,
      name,
      mode || 'solo',
      system || 'dnd5e',
      world_brief || '',
      lorebook_id || null,
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
    return NextResponse.json({ success: false, error: '创建副本失败' }, { status: 500 });
  }
}
