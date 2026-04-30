import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function isAdminAuthed(request: NextRequest): boolean {
  const url = new URL(request.url);
  const adminKey = url.searchParams.get('admin_key');
  const cookieAdminToken = request.cookies.get('admin_token')?.value;

  if (adminKey && verifyAdminToken(adminKey)) return true;
  if (cookieAdminToken && verifyAdminToken(cookieAdminToken)) return true;
  return false;
}

/**
 * GET /api/admin/cleanup
 * 列出待清理的小说（已软删除超过保留期）
 * 支持 ?admin_key=xxx 或 admin_auth cookie
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ 
        success: false, 
        error: '无权限访问，请提供有效的管理员密钥' 
      }, { status: 403 });
    }

    // 查询已软删除且超过保留期的小说
    const now = new Date();
    const novelsToCleanup = db.prepare(`
      SELECT 
        id, title, author, author_id,
        deleted_at,
        retention_days,
        datetime(deleted_at, '+' || retention_days || ' days') as cleanup_date,
        CASE 
          WHEN datetime(deleted_at, '+' || retention_days || ' days') <= datetime('now') 
          THEN 1 ELSE 0 
        END as ready_to_cleanup
      FROM novels 
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at ASC
    `).all() as Array<{
      id: string;
      title: string;
      author: string;
      author_id: string;
      deleted_at: string;
      retention_days: number;
      cleanup_date: string;
      ready_to_cleanup: number;
    }>;

    // 检查实际文件是否存在
    const contentDir = path.join(process.cwd(), 'content', 'novels');
    const novelsWithFileStatus = novelsToCleanup.map(novel => {
      const novelDir = path.join(contentDir, novel.id);
      const metaPath = path.join(novelDir, 'meta.md');
      const hasFiles = fs.existsSync(metaPath);
      return {
        ...novel,
        has_files: hasFiles,
        days_since_deleted: Math.floor((now.getTime() - new Date(novel.deleted_at).getTime()) / (1000 * 60 * 60 * 24))
      };
    });

    // 分类：可清理 vs 待观察
    const readyToCleanup = novelsWithFileStatus.filter(n => n.ready_to_cleanup && n.has_files);
    const pending = novelsWithFileStatus.filter(n => !n.ready_to_cleanup);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_deleted: novelsToCleanup.length,
          ready_to_cleanup: readyToCleanup.length,
          pending: pending.length
        },
        ready_to_cleanup: readyToCleanup,
        pending: pending
      }
    });
  } catch (error) {
    console.error('Get cleanup list error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '获取清理列表失败' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/cleanup
 * 执行清理：永久删除已过保留期的小说
 * 支持 ?admin_key=xxx 或 admin_auth cookie
 * 可选参数: novel_id - 只清理指定小说
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ 
        success: false, 
        error: '无权限访问' 
      }, { status: 403 });
    }

    const url = new URL(request.url);
    const novelId = url.searchParams.get('novel_id');

    const contentDir = path.join(process.cwd(), 'content', 'novels');
    const deletedRecords: string[] = [];

    if (novelId) {
      // 清理指定小说
      const novel = db.prepare(`
        SELECT id, title, deleted_at, retention_days
        FROM novels 
        WHERE id = ? AND deleted_at IS NOT NULL
      `).get(novelId) as { id: string; title: string; deleted_at: string; retention_days: number } | undefined;

      if (!novel) {
        return NextResponse.json({ 
          success: false, 
          error: '小说不存在或未标记删除' 
        }, { status: 404 });
      }

      // 检查是否超过保留期
      const cleanupDate = new Date(new Date(novel.deleted_at).getTime() + novel.retention_days * 24 * 60 * 60 * 1000);
      if (cleanupDate > new Date()) {
        return NextResponse.json({ 
          success: false, 
          error: `小说仍在保留期内，将在 ${cleanupDate.toLocaleDateString('zh-CN')} 后可清理` 
        }, { status: 400 });
      }

      // 删除文件
      const novelDir = path.join(contentDir, novel.id);
      if (fs.existsSync(novelDir)) {
        fs.rmSync(novelDir, { recursive: true });
      }

      // 从数据库删除记录
      db.prepare('DELETE FROM novels WHERE id = ?').run(novelId);
      deletedRecords.push(novel.id);
    } else {
      // 清理所有已过保留期的小说
      const novelsToDelete = db.prepare(`
        SELECT id, deleted_at, retention_days
        FROM novels 
        WHERE deleted_at IS NOT NULL
        AND datetime(deleted_at, '+' || retention_days || ' days') <= datetime('now')
      `).all() as Array<{ id: string; deleted_at: string; retention_days: number }>;

      for (const novel of novelsToDelete) {
        const novelDir = path.join(contentDir, novel.id);
        if (fs.existsSync(novelDir)) {
          fs.rmSync(novelDir, { recursive: true });
        }
        db.prepare('DELETE FROM novels WHERE id = ?').run(novel.id);
        deletedRecords.push(novel.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `已永久删除 ${deletedRecords.length} 篇小说`,
      data: {
        deleted_novels: deletedRecords
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '清理失败' 
    }, { status: 500 });
  }
}
