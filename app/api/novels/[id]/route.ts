import { NextResponse } from 'next/server';
import { getNovelMeta } from '@/lib/novels';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { verifyAdminPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const novel = getNovelMeta(params.id);
    
    if (!novel) {
      return NextResponse.json({ success: false, error: '小说不存在' }, { status: 404 });
    }

    // 检查是否已软删除
    const dbNovel = db.prepare('SELECT deleted_at FROM novels WHERE id = ?').get(params.id) as { deleted_at: string | null } | undefined;
    if (dbNovel?.deleted_at) {
      return NextResponse.json({ success: false, error: '小说不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: novel });
  } catch (error) {
    console.error('Get novel error:', error);
    return NextResponse.json({ success: false, error: '获取小说失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('admin_key');

    // 检查小说是否存在
    const novel = db.prepare('SELECT * FROM novels WHERE id = ?').get(params.id) as any;
    if (!novel) {
      return NextResponse.json({ success: false, error: '小说不存在' }, { status: 404 });
    }

    // 检查是否已删除
    if (novel.deleted_at) {
      return NextResponse.json({ success: false, error: '小说已在待删除状态' }, { status: 400 });
    }

    // 权限检查：作者本人或管理员
    const isAuthor = user && novel.author_id === user.userId;
    const isAdmin = adminKey && verifyAdminPassword(adminKey);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: '无权限删除此小说，仅作者或管理员可删除' 
      }, { status: 403 });
    }

    // 软删除：设置 deleted_at 时间戳
    const now = new Date().toISOString();
    const retentionDays = novel.retention_days || 7;
    const cleanupDate = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE novels 
      SET deleted_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(now, params.id);

    // 同时标记内容文件中的小说状态（如果需要）
    // 这里保持文件不变，等7天后管理员手动清理

    return NextResponse.json({
      success: true,
      message: `小说已标记为删除，将在 ${retentionDays} 天后自动清理`,
      data: {
        novel_id: params.id,
        deleted_at: now,
        cleanup_at: cleanupDate,
        retention_days: retentionDays
      }
    });
  } catch (error) {
    console.error('Delete novel error:', error);
    return NextResponse.json({ success: false, error: '删除小说失败' }, { status: 500 });
  }
}
