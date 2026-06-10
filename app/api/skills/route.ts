import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/skills
 * 公开技能排行榜 — 返回所有启用的技能，支持排序和搜索
 */
export const GET = withRoute({ auth: 'none' }, async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const sort = searchParams.get('sort') || 'hot';
    const search = (searchParams.get('search') || '').trim();
    const tag = (searchParams.get('tag') || '').trim();

    let sql = `SELECT * FROM skill_marketplace WHERE is_active = 1`;
    const params: any[] = [];

    if (search) {
      sql += ` AND (title LIKE ? OR author LIKE ? OR description LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (tag) {
      sql += ` AND tags LIKE ?`;
      params.push(`%${tag}%`);
    }

    switch (sort) {
      case 'downloads': sql += ` ORDER BY download_count DESC`; break;
      case 'newest': sql += ` ORDER BY created_at DESC`; break;
      default: sql += ` ORDER BY sort_order ASC, (download_count * 3) DESC, created_at DESC`; break;
    }

    const items = db.prepare(sql).all(...params) as any[];

    // 平台统计
    const total = db.prepare('SELECT COUNT(*) as c FROM skill_marketplace WHERE is_active = 1').get() as any;
    const totalDownloads = db.prepare('SELECT COALESCE(SUM(download_count), 0) as c FROM skill_marketplace WHERE is_active = 1').get() as any;
    const authors = db.prepare('SELECT COUNT(DISTINCT author) as c FROM skill_marketplace WHERE is_active = 1').get() as any;

    return NextResponse.json({
      success: true,
      data: items,
      stats: {
        total: total.c,
        total_downloads: totalDownloads.c,
        total_authors: authors.c,
      },
      sort,
    });
  } catch (error) {
    console.error('[Skills] GET error:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
});
