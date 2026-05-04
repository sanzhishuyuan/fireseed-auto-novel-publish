import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/novels/[novelId]/branches
 * 获取小说的所有分支列表
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 检查小说是否存在
    const novel = db.prepare('SELECT id, deleted_at FROM novels WHERE id = ?').get(id) as any;
    if (!novel || novel.deleted_at) {
      return NextResponse.json({ success: false, branches: [] }, { status: 404 });
    }

    // 查询所有分支（排除主线 main）
    const branches = db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM chapters WHERE novel_id = ? AND branch = b.branch_name) as actual_chapter_count
      FROM branches b
      WHERE b.novel_id = ? AND b.status = 'active'
      ORDER BY b.created_at DESC
    `).all(id, id) as any[];

    // 同时查找 chapters 中有但 branches 表中可能没有的分支记录（兼容旧数据）
    const orphanBranches = db.prepare(`
      SELECT DISTINCT branch FROM chapters
      WHERE novel_id = ? AND branch != 'main' AND branch NOT IN (
        SELECT branch_name FROM branches WHERE novel_id = ?
      )
    `).all(id, id) as { branch: string }[];

    // 为每个 orphan branch 自动创建元数据
    for (const ob of orphanBranches) {
      const firstChapter = db.prepare(`
        SELECT id, title, author_id, author_name, created_at FROM chapters
        WHERE novel_id = ? AND branch = ? ORDER BY created_at ASC LIMIT 1
      `).get(id, ob.branch) as any;

      if (firstChapter) {
        const branchId = uuidv4();
        db.prepare(`
          INSERT OR IGNORE INTO branches (id, novel_id, branch_name, title, author_id, author_name, chapter_count, total_words, created_at)
          VALUES (?, ?, ?, ?, ?, ?,
            (SELECT COUNT(*) FROM chapters WHERE novel_id = ? AND branch = ?),
            (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE novel_id = ? AND branch = ?),
            ?)
        `).run(branchId, id, ob.branch, ob.branch, firstChapter.author_id, firstChapter.author_name, id, ob.branch, id, ob.branch, firstChapter.created_at);

        // 重新查
        const newBranch = db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId) as any;
        if (newBranch) branches.push(newBranch);
      }
    }

    return NextResponse.json({ success: true, branches });
  } catch (error) {
    console.error('Get branches error:', error);
    return NextResponse.json({ success: true, branches: [] });
  }
}

// uuid helpers
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
