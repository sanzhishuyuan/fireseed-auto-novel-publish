import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withRoute } from '@/lib/with-route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/novels/[novelId]/branches/[branchName]/chapters
 * 获取某分支的所有章节
 */
export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  try {
    const { id, name } = ctx.params!;

    const chapters = db.prepare(`
      SELECT id, title, order_num as "order", branch, word_count, author_id, author_name, choices, custom_branch_enabled, created_at
      FROM chapters
      WHERE novel_id = ? AND branch = ?
      ORDER BY order_num ASC, created_at ASC
    `).all(id, name) as any[];

    return NextResponse.json({ success: true, chapters, count: chapters.length });
  } catch (error) {
    console.error('Get branch chapters error:', error);
    return NextResponse.json({ success: true, chapters: [], count: 0 });
  }
});
