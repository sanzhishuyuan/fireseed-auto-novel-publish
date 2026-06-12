/**
 * POST /api/rpg/bridge/import — 导入 SillyTavern 角色卡 / 世界书
 * GET /api/rpg/bridge/export?type=character&id=xxx — 导出为 SillyTavern V2 格式
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import type { CharacterCard, CharacterCardData, LorebookEntry } from '@/lib/rpg/types';

export const dynamic = 'force-dynamic';

/**
 * POST — 导入 SillyTavern 角色卡或世界书
 * Body: { type: 'character' | 'lorebook', data: object }
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ success: false, error: '缺少 type 或 data 参数' }, { status: 400 });
    }

    // ===== 导入角色卡 =====
    if (type === 'character') {
      const card: CharacterCard = data;

      // 验证 SillyTavern V2 格式
      if (card.spec !== 'chara_card_v2') {
        // 尝试兼容 V1 格式
        if (card.data?.name) {
          // 当作 V1 或简化格式处理
        } else {
          return NextResponse.json({ success: false, error: '不支持的角色卡格式，请使用 SillyTavern V2 (chara_card_v2)' }, { status: 400 });
        }
      }

      const cardData: CharacterCardData = card.data;
      const id = uuidv4();
      const system = cardData.trpg?.system || 'custom';

      db.prepare(`
        INSERT INTO rpg_characters (id, user_id, name, system, card_data, spec_version, is_public)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).run(id, user.userId, cardData.name || '未命名角色', system, JSON.stringify(cardData), '2.0');

      return NextResponse.json({
        success: true,
        data: { id, name: cardData.name, message: `角色「${cardData.name}」导入成功` },
      });
    }

    // ===== 导入世界书 =====
    if (type === 'lorebook') {
      // 支持 SillyTavern lorebook 格式
      let entries: LorebookEntry[] = [];
      let lorebookName = data.name || '导入的世界书';
      let lorebookDesc = data.description || '从 SillyTavern 导入';

      if (Array.isArray(data.entries)) {
        entries = data.entries.map((e: any, i: number) => ({
          id: e.uid || e.id || uuidv4(),
          keys: Array.isArray(e.key) ? e.key : (typeof e.key === 'string' ? e.key.split(',').map((k: string) => k.trim()) : []),
          content: e.content || e.text || '',
          enabled: e.enabled !== false,
          selective: e.selective || false,
          priority: e.priority ?? e.insertion_order ?? 10,
          secondary_keys: e.secondary_keys || [],
          constant: e.constant || false,
        }));
      }

      const id = uuidv4();
      db.prepare(`
        INSERT INTO rpg_lorebooks (id, name, description, user_id, entries, is_public, st_compatible)
        VALUES (?, ?, ?, ?, ?, 0, 1)
      `).run(id, lorebookName, lorebookDesc, user.userId, JSON.stringify(entries));

      return NextResponse.json({
        success: true,
        data: { id, name: lorebookName, entryCount: entries.length, message: `世界书「${lorebookName}」导入成功，共 ${entries.length} 条目` },
      });
    }

    return NextResponse.json({ success: false, error: `不支持的导入类型: ${type}` }, { status: 400 });
  } catch (error) {
    console.error('Bridge import error:', error);
    return NextResponse.json({ success: false, error: '导入失败' }, { status: 500 });
  }
}

/**
 * GET — 导出角色卡或世界书为 SillyTavern V2 格式
 * Query: type=character|lorebook&id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ success: false, error: '缺少 type 或 id 参数' }, { status: 400 });
    }

    // ===== 导出角色卡 =====
    if (type === 'character') {
      const row = db.prepare('SELECT * FROM rpg_characters WHERE id = ? AND user_id = ?').get(id, user.userId) as any;
      if (!row) {
        return NextResponse.json({ success: false, error: '角色不存在或无权导出' }, { status: 404 });
      }

      let cardData: CharacterCardData;
      try {
        cardData = JSON.parse(row.card_data);
      } catch {
        return NextResponse.json({ success: false, error: '角色卡数据损坏' }, { status: 500 });
      }

      // 确保完整的 SillyTavern V2 格式
      const card: CharacterCard = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: cardData,
      };

      return new NextResponse(JSON.stringify(card, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(cardData.name || 'character')}.json"`,
        },
      });
    }

    // ===== 导出世界书 =====
    if (type === 'lorebook') {
      const row = db.prepare('SELECT * FROM rpg_lorebooks WHERE id = ? AND user_id = ?').get(id, user.userId) as any;
      if (!row) {
        return NextResponse.json({ success: false, error: '世界书不存在或无权导出' }, { status: 404 });
      }

      let entries: LorebookEntry[] = [];
      try { entries = JSON.parse(row.entries || '[]'); } catch {}

      // 转换为 SillyTavern lorebook 格式
      const stLorebook = {
        uid: row.id,
        name: row.name,
        description: row.description,
        entries: entries.map((e, i) => ({
          uid: e.id,
          key: e.keys.join(', '),
          keysecondary: (e.secondary_keys || []).join(', '),
          comment: '',
          content: e.content,
          constant: e.constant || false,
          selective: e.selective || false,
          insertion_order: e.priority,
          enabled: e.enabled,
          position: 'before_char',
          extensions: { position: 0, depth: 4, probability: 100, useProbability: false },
        })),
      };

      return new NextResponse(JSON.stringify(stLorebook, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(row.name || 'lorebook')}.json"`,
        },
      });
    }

    return NextResponse.json({ success: false, error: `不支持的导出类型: ${type}` }, { status: 400 });
  } catch (error) {
    console.error('Bridge export error:', error);
    return NextResponse.json({ success: false, error: '导出失败' }, { status: 500 });
  }
}
