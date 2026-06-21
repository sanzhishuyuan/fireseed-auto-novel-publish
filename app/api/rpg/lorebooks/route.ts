/**
 * GET/POST /api/rpg/lorebooks — 世界书列表/创建
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rpg/lorebooks — 获取世界书列表
 * 支持 ?search=xxx 搜索公开世界书
 * 支持 ?tab=owned|purchased|all 过滤自有/已购买世界书（默认 all）
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

    let lorebooks;
    if (search) {
      lorebooks = db.prepare(`
        SELECT id, name, description, system, is_public, created_at, updated_at,
               JSON_ARRAY_LENGTH(entries) as entry_count
        FROM rpg_lorebooks
        WHERE is_public = 1 AND name LIKE ?
        ORDER BY created_at DESC
        LIMIT 20
      `).all(`%${search}%`);
    } else {
      // 自有世界书
      const owned = (tab === 'owned' || tab === 'all')
        ? db.prepare(`
            SELECT id, name, description, system, is_public, created_at, updated_at,
                   JSON_ARRAY_LENGTH(entries) as entry_count, user_id
            FROM rpg_lorebooks
            WHERE user_id = ?
            ORDER BY updated_at DESC
          `).all(user.userId) as any[]
        : [];

      // 已购买的世界书
      const purchased = (tab === 'purchased' || tab === 'all')
        ? db.prepare(`
            SELECT l.id, l.name, l.description, l.system, l.is_public,
                   l.created_at, l.updated_at,
                   JSON_ARRAY_LENGTH(l.entries) as entry_count, l.user_id
            FROM rpg_lorebooks l
            INNER JOIN rpg_asset_library al ON al.asset_id = l.id AND al.asset_type = 'lorebook'
            WHERE al.user_id = ? AND al.source IN ('purchased', 'free_claim')
            ORDER BY al.acquired_at DESC
          `).all(user.userId) as any[]
        : [];

      // 合并去重
      const ids = new Set<string>();
      lorebooks = [];
      for (const lb of [...owned, ...purchased]) {
        if (!ids.has(lb.id)) {
          ids.add(lb.id);
          lorebooks.push(lb);
        }
      }
    }

    return NextResponse.json({ success: true, data: lorebooks });
  } catch (error) {
    console.error('Get lorebooks error:', error);
    return NextResponse.json({ success: false, error: '获取世界书列表失败' }, { status: 500 });
  }
}

/**
 * POST /api/rpg/lorebooks — 创建世界书
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, system, entries } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: '请输入世界书名称' }, { status: 400 });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO rpg_lorebooks (id, name, description, system, user_id, entries, is_public, st_compatible)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, name.trim(), description?.trim() || '', system || 'custom', user.userId, JSON.stringify(entries || []), body.is_public ? 1 : 0);

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Create lorebook error:', error);
    return NextResponse.json({ success: false, error: '创建世界书失败' }, { status: 500 });
  }
}
