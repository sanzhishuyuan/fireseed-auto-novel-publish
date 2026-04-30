import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '无效的Token' }, { status: 401 });
  }

  try {
    // 修复: request.json() 解析异常兼容
    const bodyText = await request.text();
    const { novelId, branch, chapterId } = JSON.parse(bodyText);
    const userId = payload.userId;

    const existing = db.prepare('SELECT id FROM user_progress WHERE user_id = ? AND novel_id = ?')
      .get(userId, novelId);

    if (existing) {
      db.prepare(`
        UPDATE user_progress 
        SET branch = ?, chapter_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND novel_id = ?
      `).run(branch, chapterId, userId, novelId);
    } else {
      db.prepare(`
        INSERT INTO user_progress (id, user_id, novel_id, branch, chapter_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, novelId, branch, chapterId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update progress error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
