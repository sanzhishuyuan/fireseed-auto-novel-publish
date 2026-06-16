/**
 * GET/PUT/DELETE /api/rpg/characters/[id] — 角色卡详情/编辑/删除
 */
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const character = db.prepare(`
      SELECT * FROM rpg_characters WHERE id = ?
    `).get(id) as any;

    if (!character) {
      return NextResponse.json({ success: false, error: '角色不存在' }, { status: 404 });
    }

    // 解析 card_data JSON
    character.card_data = JSON.parse(character.card_data || '{}');

    return NextResponse.json({ success: true, data: character });
  } catch (error) {
    console.error('Get character error:', error);
    return NextResponse.json({ success: false, error: '获取角色失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const existing = db.prepare('SELECT user_id FROM rpg_characters WHERE id = ?').get(id) as any;

    if (!existing) {
      return NextResponse.json({ success: false, error: '角色不存在' }, { status: 404 });
    }
    if (existing.user_id !== user.userId) {
      return NextResponse.json({ success: false, error: '无权修改此角色' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, personality, scenario, first_mes, system, trpg, is_public, seed_price, char_type } = body;

    if (char_type && !['universal', 'dedicated'].includes(char_type)) {
      return NextResponse.json({ success: false, error: 'char_type 必须为 universal 或 dedicated' }, { status: 400 });
    }

    const existingData = db.prepare('SELECT card_data FROM rpg_characters WHERE id = ?').get(id) as any;
    const cardData = JSON.parse(existingData.card_data || '{}');

    if (name) cardData.name = name;
    if (description !== undefined) cardData.description = description;
    if (personality !== undefined) cardData.personality = personality;
    if (scenario !== undefined) cardData.scenario = scenario;
    if (first_mes !== undefined) cardData.first_mes = first_mes;
    if (trpg !== undefined) cardData.trpg = trpg;

    db.prepare(`
      UPDATE rpg_characters SET
        name = ?, card_data = ?, system = ?, is_public = ?,
        seed_price = ?, char_type = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || cardData.name,
      JSON.stringify(cardData),
      system || 'custom',
      is_public !== undefined ? (is_public ? 1 : 0) : 0,
      seed_price || 0,
      char_type || 'dedicated',
      id
    );

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Update character error:', error);
    return NextResponse.json({ success: false, error: '更新角色失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const existing = db.prepare('SELECT user_id FROM rpg_characters WHERE id = ?').get(id) as any;

    if (!existing) {
      return NextResponse.json({ success: false, error: '角色不存在' }, { status: 404 });
    }
    if (existing.user_id !== user.userId) {
      return NextResponse.json({ success: false, error: '无权删除此角色' }, { status: 403 });
    }

    // 安全检查：是否正在副本中使用
    const inUse = db.prepare(
      'SELECT COUNT(*) as c FROM rpg_campaign_members WHERE character_id = ?'
    ).get(id) as any;
    if (inUse.c > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `该角色正在 ${inUse.c} 个副本中使用，无法删除。请先移除相关成员关联。` 
      }, { status: 409 });
    }

    // 下架市场挂牌
    db.prepare("UPDATE rpg_market_listings SET status = 'cancelled' WHERE asset_id = ? AND asset_type = 'character'")
      .run(id);

    // 删除资产链接引用
    db.prepare('DELETE FROM rpg_asset_links WHERE source_id = ? AND source_type = "character"').run(id);
    db.prepare('DELETE FROM rpg_asset_links WHERE linked_id = ? AND linked_type = "character"').run(id);

    db.prepare('DELETE FROM rpg_characters WHERE id = ?').run(id);

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Delete character error:', error);
    return NextResponse.json({ success: false, error: '删除角色失败' }, { status: 500 });
  }
}
