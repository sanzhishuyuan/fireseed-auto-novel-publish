import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const missions = db.prepare('SELECT * FROM skill_missions ORDER BY priority ASC').all();
  return NextResponse.json({ missions });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const body = await request.text();
    const { type, title, description, link, icon_emoji, priority, user_filter } = JSON.parse(body);

    if (!type || !title) {
      return NextResponse.json({ error: 'type 和 title 是必填项' }, { status: 400 });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO skill_missions (id, type, title, description, link, icon_emoji, priority, user_filter, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, type, title, description || '', link || '', icon_emoji || '📌', priority || 0, user_filter || 'all');

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Create mission error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
