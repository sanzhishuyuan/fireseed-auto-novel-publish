import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import db from '@/lib/db';
import { safeParseJSON } from '@/lib/request-parser';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
    return NextResponse.json({ error: '未授�? }, { status: 401 });
  }

  try {
    const body = await request.text();
    const parsed = safeParseJSON(body);
    if (!parsed.success) return parsed.response;
    const updates = parsed.data;
    const { id } = params;

    const mission = db.prepare('SELECT id FROM skill_missions WHERE id = ?').get(id);
    if (!mission) {
      return NextResponse.json({ error: '任务不存�? }, { status: 404 });
    }

    // 动态构�?SET 子句，只更新传了的字�?
    const allowedFields = ['type', 'title', 'description', 'link', 'icon_emoji', 'priority', 'user_filter', 'is_active'];
    const setClauses: string[] = [];
    const setValues: any[] = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        setValues.push(updates[field]);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
    }

    setClauses.push("updated_at = datetime('now')");
    setValues.push(id);

    db.prepare(`UPDATE skill_missions SET ${setClauses.join(', ')} WHERE id = ?`).run(...setValues);

    return NextResponse.json({ success: true, message: '任务已更�? });
  } catch (error) {
    console.error('Update mission error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
    return NextResponse.json({ error: '未授�? }, { status: 401 });
  }

  try {
    const { id } = params;
    db.prepare('DELETE FROM skill_missions WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: '任务已删�? });
  } catch (error) {
    console.error('Delete mission error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

