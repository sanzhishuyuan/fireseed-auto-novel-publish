/**
 * GET /api/rpg/lorebooks — 世界书列表/搜索
 */
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rpg/lorebooks — 获取世界书列表
 * 支持 ?search=xxx 搜索公开世界书
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let lorebooks;
    if (search) {
      lorebooks = db.prepare(`
        SELECT id, name, description, is_public, created_at
        FROM rpg_lorebooks
        WHERE is_public = 1 AND name LIKE ?
        ORDER BY created_at DESC
        LIMIT 20
      `).all(`%${search}%`);
    } else {
      lorebooks = db.prepare(`
        SELECT id, name, description, is_public, created_at
        FROM rpg_lorebooks WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(user.userId);
    }

    return NextResponse.json({ success: true, data: lorebooks });
  } catch (error) {
    console.error('Get lorebooks error:', error);
    return NextResponse.json({ success: false, error: '获取世界书列表失败' }, { status: 500 });
  }
}
