/**
 * GET/POST /api/rpg/characters — 角色卡列表/创建
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rpg/characters — 获取角色列表
 * 支持 ?search=xxx 搜索公开的通用角色（用于资产关联）
 * 支持 ?tab=owned|purchased|all 过滤自有/已购买角色（默认 all）
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tab = searchParams.get('tab') || 'all';

    let characters;
    if (search) {
      // 搜索公开的通用角色（用于资产关联）
      characters = db.prepare(`
        SELECT id, name, system, avatar_url, spec_version, is_public, download_count,
               seed_price, char_type, created_at, updated_at,
               user_id, 0 as _purchased
        FROM rpg_characters
        WHERE (is_public = 1 OR user_id = ?)
          AND char_type = 'universal'
          AND name LIKE ?
        ORDER BY download_count DESC
        LIMIT 20
      `).all(user.userId, `%${search}%`);
    } else {
      // 自有角色（tab=owned 或 all）
      const owned = (tab === 'owned' || tab === 'all')
        ? db.prepare(`
            SELECT id, name, system, avatar_url, spec_version, is_public, download_count,
                   seed_price, char_type, created_at, updated_at,
                   user_id, 0 as _purchased
            FROM rpg_characters
            WHERE user_id = ?
            ORDER BY updated_at DESC
          `).all(user.userId) as any[]
        : [];

      // 已购买的角色（tab=purchased 或 all）
      const purchased = (tab === 'purchased' || tab === 'all')
        ? db.prepare(`
            SELECT c.id, c.name, c.system, c.avatar_url, c.spec_version, c.is_public,
                   c.download_count, c.seed_price, c.char_type, c.created_at, c.updated_at,
                   c.user_id, 1 as _purchased
            FROM rpg_characters c
            INNER JOIN rpg_asset_library al ON al.asset_id = c.id AND al.asset_type = 'character'
            WHERE al.user_id = ? AND al.source IN ('purchased', 'free_claim')
            ORDER BY al.acquired_at DESC
          `).all(user.userId) as any[]
        : [];

      // 合并去重
      const ids = new Set<string>();
      characters = [];
      for (const c of [...owned, ...purchased]) {
        if (!ids.has(c.id)) {
          ids.add(c.id);
          characters.push(c);
        }
      }
    }

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
    const { name, system, description, personality, scenario, first_mes, trpg, char_type } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: '角色名不能为空' }, { status: 400 });
    }

    if (char_type && !['universal', 'dedicated'].includes(char_type)) {
      return NextResponse.json({ success: false, error: 'char_type 必须为 universal 或 dedicated' }, { status: 400 });
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
      INSERT INTO rpg_characters (id, user_id, name, spec_version, card_data, system, is_public, seed_price, char_type)
      VALUES (?, ?, ?, '2.0', ?, ?, ?, ?, ?)
    `).run(
      id, user.userId, name,
      cardJson,
      system || 'custom',
      body.is_public ? 1 : 0,
      body.seed_price || 0,
      char_type || 'dedicated'
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
