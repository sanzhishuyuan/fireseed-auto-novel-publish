import { NextResponse } from 'next/server';
import { getNovelMeta } from '@/lib/novels';
import db from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';
import { withRoute } from '@/lib/with-route';
import { apiSuccess } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export const GET = withRoute({ auth: 'none' }, async (request, ctx) => {
  try {
    const { id } = ctx.params!;

    // 优先从数据库读取（AI API 创建的小说没有 meta.md 文件）
    const dbNovel = db.prepare('SELECT * FROM novels WHERE id = ?').get(id) as any;

    if (dbNovel) {
      // 检查是否已软删除
      if (dbNovel.deleted_at) {
        return NextResponse.json({ success: false, error: '小说不存在' }, { status: 404 });
      }

      // 从数据库查询章节数和总字数
      const chaptersInfo = db.prepare(`
        SELECT COUNT(*) as chapter_count, COALESCE(SUM(word_count), 0) as total_words
        FROM chapters WHERE novel_id = ?
      `).get(id) as { chapter_count: number; total_words: number };

      return apiSuccess({
        id: dbNovel.id,
        title: dbNovel.title,
        author: dbNovel.author,
        description: dbNovel.description || '',
        cover_url: dbNovel.cover_url || '',
        status: dbNovel.status || 'ongoing',
        // 保持逗号分隔字符串格式，兼容前端 split(',') 处理
        tags: dbNovel.tags || '',
        created_at: dbNovel.created_at,
        updated_at: dbNovel.updated_at,
        chapter_count: chaptersInfo.chapter_count,
        total_words: chaptersInfo.total_words,
      });
    }

    // 回退：从文件系统读取（兼容旧版内容目录小说）
    const fileNovel = getNovelMeta(id);
    if (!fileNovel) {
      return NextResponse.json({ success: false, error: '小说不存在' }, { status: 404 });
    }

    return apiSuccess(fileNovel);
  } catch (error) {
    console.error('Get novel error:', error);
    return NextResponse.json({ success: false, error: '获取小说失败' }, { status: 500 });
  }
});

export const DELETE = withRoute({ auth: 'none' }, async (request, ctx) => {
  try {
    const { id } = ctx.params!;
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('admin_key');

    // 检查小说是否存在
    const novel = db.prepare('SELECT * FROM novels WHERE id = ?').get(id) as any;
    if (!novel) {
      return NextResponse.json({ success: false, error: '小说不存在' }, { status: 404 });
    }

    // 检查是否已删除
    if (novel.deleted_at) {
      return NextResponse.json({ success: false, error: '小说已在待删除状态' }, { status: 400 });
    }

    // 权限检查：仅管理员可删除（取消用户端删除权限，防止意外删除）
    const isAdmin = adminKey && verifyAdminToken(adminKey);

    if (!isAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: '无权限删除此小说，仅管理员可删除' 
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
    `).run(now, id);

    // 同时标记内容文件中的小说状态（如果需要）
    // 这里保持文件不变，等7天后管理员手动清理

    return NextResponse.json({
      success: true,
      message: `小说已标记为删除，将在 ${retentionDays} 天后自动清理`,
      data: {
        novel_id: id,
        deleted_at: now,
        cleanup_at: cleanupDate,
        retention_days: retentionDays
      }
    });
  } catch (error) {
    console.error('Delete novel error:', error);
    return NextResponse.json({ success: false, error: '删除小说失败' }, { status: 500 });
  }
});
