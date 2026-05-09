import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/skills-market/[id] — 编辑技能
 * DELETE /api/admin/skills-market/[id] — 删除技能
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request, 'skill.manage');
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    const existing = db.prepare('SELECT * FROM skill_marketplace WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ success: false, error: '技能不存在' }, { status: 404 });
    }

    const body = await request.json();
    const allowed = ['name', 'title', 'description', 'author', 'icon_emoji', 'tags', 'repo_url', 'repo_type', 'skill_version', 'download_count', 'star_count', 'is_active', 'sort_order'];

    const updates: string[] = [];
    const paramsList: any[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`);
        paramsList.push(body[key]);
      }
    }
    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: '没有需要更新的字段' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    paramsList.push(new Date().toISOString());
    paramsList.push(id);

    db.prepare(`UPDATE skill_marketplace SET ${updates.join(', ')} WHERE id = ?`).run(...paramsList);

    const updated = db.prepare('SELECT * FROM skill_marketplace WHERE id = ?').get(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Admin SkillsMarket] PATCH error:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request, 'skill.manage');
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    const existing = db.prepare('SELECT * FROM skill_marketplace WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ success: false, error: '技能不存在' }, { status: 404 });
    }

    db.prepare('DELETE FROM skill_marketplace WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: '已删除' });
  } catch (error) {
    console.error('[Admin SkillsMarket] DELETE error:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
