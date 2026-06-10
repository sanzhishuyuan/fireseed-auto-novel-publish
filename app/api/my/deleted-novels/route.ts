import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/my/deleted-novels
 * 查看用户已删除的小说（可恢复）
 * 需要登录
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: '请先登录' 
      }, { status: 401 });
    }

    const deletedNovels = db.prepare(`
      SELECT id, title, author, deleted_at, retention_days,
        datetime(deleted_at, '+' || retention_days || ' days') as cleanup_date,
        CASE 
          WHEN datetime(deleted_at, '+' || retention_days || ' days') <= datetime('now') 
          THEN 1 ELSE 0 
        END as ready_to_cleanup
      FROM novels 
      WHERE author_id = ? AND deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `).all(user.userId);

    return NextResponse.json({
      success: true,
      data: {
        novels: deletedNovels,
        count: (deletedNovels as any[]).length
      }
    });
  } catch (error) {
    console.error('Get deleted novels error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '获取失败' 
    }, { status: 500 });
  }
}

/**
 * POST /api/my/deleted-novels
 * 恢复已删除的小说
 * Body: { novel_id: string }
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: '请先登录' 
      }, { status: 401 });
    }

    const bodyText = await request.text();

    const parsed = safeParseJSON(bodyText);

    if (!parsed.success) return parsed.response;

    const body = parsed.data;
    const { novel_id } = body;

    if (!novel_id) {
      return NextResponse.json({ 
        success: false, 
        error: '请提供小说ID' 
      }, { status: 400 });
    }

    // 检查小说是否存在且属于当前用户
    const novel = db.prepare(`
      SELECT id, title, deleted_at 
      FROM novels 
      WHERE id = ? AND author_id = ? AND deleted_at IS NOT NULL
    `).get(novel_id, user.userId) as { id: string; title: string; deleted_at: string } | undefined;

    if (!novel) {
      return NextResponse.json({ 
        success: false, 
        error: '小说不存在或无权恢复' 
      }, { status: 404 });
    }

    // 恢复小说：清除 deleted_at
    db.prepare(`
      UPDATE novels 
      SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(novel_id);

    return NextResponse.json({
      success: true,
      message: `《${novel.title}》已恢复`,
      data: {
        novel_id: novel_id
      }
    });
  } catch (error) {
    console.error('Restore novel error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '恢复失败' 
    }, { status: 500 });
  }
}
