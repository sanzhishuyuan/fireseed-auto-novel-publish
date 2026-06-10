import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { safeParseJSON } from '@/lib/request-parser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/skills-market — 管理员查看所有技能（含未激活）
 * POST /api/admin/skills-market — 管理员添加技能
 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request, 'skill.manage');
  if (admin instanceof Response) return admin;

  try {
    const items = db.prepare('SELECT * FROM skill_marketplace ORDER BY sort_order ASC, created_at DESC').all();
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('[Admin SkillsMarket] GET error:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request, 'skill.manage');
  if (admin instanceof Response) return admin;

  try {
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const { name, title, description, author, icon_emoji, tags, repo_url, repo_type, skill_version, download_count, star_count, is_active, sort_order } = body;

    if (!name || !title) {
      return NextResponse.json({ success: false, error: '名称和标题不能为空' }, { status: 400 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO skill_marketplace (id, name, title, description, author, icon_emoji, tags, repo_url, repo_type, skill_version, download_count, star_count, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, title, description || '', author || '', icon_emoji || '📦', tags || '',
      repo_url || '', repo_type || 'github', skill_version || '',
      download_count || 0, star_count || 0, is_active ?? 1, sort_order || 0, now, now
    );

    const created = db.prepare('SELECT * FROM skill_marketplace WHERE id = ?').get(id);
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('[Admin SkillsMarket] POST error:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}
