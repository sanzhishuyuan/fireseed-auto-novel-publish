/**
 * GET /api/rpg/lorebooks — 列出用户的世界书
 * POST /api/rpg/lorebooks — 创建世界书
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET — 列出用户的世界书
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const lorebooks = db.prepare(`
      SELECT id, name, description, is_public, seed_price, download_count, copy_count,
             avg_rating, rating_count, license_type, created_at, updated_at,
        JSON_ARRAY_LENGTH(entries) as entry_count
      FROM rpg_lorebooks
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(user.userId);

    return NextResponse.json({ success: true, data: lorebooks });
  } catch (error) {
    console.error('List lorebooks error:', error);
    return NextResponse.json({ success: false, error: '获取世界书列表失败' }, { status: 500 });
  }
}

/**
 * POST — 创建世界书
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, entries } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: '请输入世界书名称' }, { status: 400 });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO rpg_lorebooks (id, name, description, user_id, entries, is_public, st_compatible)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, name.trim(), description?.trim() || '', user.userId, JSON.stringify(entries || []), body.is_public ? 1 : 0);

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Create lorebook error:', error);
    return NextResponse.json({ success: false, error: '创建世界书失败' }, { status: 500 });
  }
}
