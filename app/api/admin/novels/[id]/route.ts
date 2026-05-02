import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import db from '@/lib/db';

interface Props {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get('admin_token')?.value || '')) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    // 检查小说是否存在
    const novel = db.prepare('SELECT id, title, retention_days FROM novels WHERE id = ?').get(id) as { id: string; title: string; retention_days: number } | undefined;

    if (!novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    // 软删除：设置 deleted_at 时间戳，走保留期后自动清理
    const now = new Date().toISOString();
    const retentionDays = novel.retention_days || 7;

    db.prepare(`
      UPDATE novels
      SET deleted_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(now, id);

    return NextResponse.json({
      success: true,
      message: `小说「${novel.title}」已标记为删除，将在 ${retentionDays} 天后自动清理`
    });
  } catch (error) {
    console.error('Admin delete novel error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
