/**
 * GET/POST /api/rpg/characters — 角色卡列表/创建
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rpg/characters — 获取当前用户角色列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const characters = db.prepare(`
      SELECT id, name, system, avatar_url, spec_version, is_public, download_count,
             seed_price, avg_rating, rating_count, copy_count, license_type, created_at, updated_at
      FROM rpg_characters WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(user.userId);

    return NextResponse.json({ success: true, data: characters });
  } catch (error) {
    console.error('Get characters error:', error);
    return NextResponse.json({ success: false, error: '获取角色列表失败' }, { status: 500 });
  }
}

/**
 * POST /api/rpg/characters — 创建角色卡
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { name, system, description, personality, scenario, first_mes, trpg } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: '角色名不能为空' }, { status: 400 });
    }

    const id = uuidv4();

    // 构建 SillyTavern V2 兼容的角色卡
    const cardData = {
      name,
      description: description || '',
      personality: personality || '',
      scenario: scenario || '',
      first_mes: first_mes || '',
      mes_example: '',
      system_prompt: '',
      post_history_instructions: '',
      tags: body.tags || [],
      creator: user.username || user.userId,
      character_version: '1.0',
      trpg: trpg || null,
    };

    const cardJson = JSON.stringify(cardData);

    db.prepare(`
      INSERT INTO rpg_characters (id, user_id, name, spec_version, card_data, system, is_public, seed_price)
      VALUES (?, ?, ?, '2.0', ?, ?, ?, ?)
    `).run(
      id, user.userId, name,
      cardJson,
      system || 'custom',
      body.is_public ? 1 : 0,
      body.seed_price || 0
    );

    return NextResponse.json({
      success: true,
      data: { id, name, system: system || 'custom' },
    });
  } catch (error) {
    console.error('Create character error:', error);
    return NextResponse.json({ success: false, error: '创建角色失败' }, { status: 500 });
  }
}
