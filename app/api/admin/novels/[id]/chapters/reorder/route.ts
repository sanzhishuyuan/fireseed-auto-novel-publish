import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { safeParseJSON } from '@/lib/request-parser';
import { logAdminAction } from '@/lib/audit';

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Props) {
  const { id: novelId } = await params;
  const admin = requireAdmin(request, 'content.edit');
  if (admin instanceof Response) return admin;

  try {
    const bodyText = await request.text();
    const parsed = safeParseJSON(bodyText);
    if (!parsed.success) return parsed.response;

    const { orders } = parsed.data as { orders?: Record<string, number> };

    // 校验参数
    if (!orders || typeof orders !== 'object' || Object.keys(orders).length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供 orders 参数（章节ID到排序号的映射）' },
        { status: 400 }
      );
    }

    // 校验所有章节 ID 属于该小说
    const chapterIds = Object.keys(orders);
    const placeholders = chapterIds.map(() => '?').join(',');
    const existingChapters = db.prepare(
      `SELECT id, order_num FROM chapters WHERE novel_id = ? AND id IN (${placeholders})`
    ).all(novelId, ...chapterIds) as { id: string; order_num: number }[];

    const existingIds = new Set(existingChapters.map(c => c.id));
    const invalidIds = chapterIds.filter(id => !existingIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { success: false, error: `以下章节ID不存在于该小说中: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    // 校验排序号不能为负数
    for (const [id, order] of Object.entries(orders)) {
      if (!Number.isInteger(order) || order < 1) {
        return NextResponse.json(
          { success: false, error: `章节 ${id} 的排序号无效（必须为正整数）` },
          { status: 400 }
        );
      }
    }

    // 校验是否有重复排序号（除了 0 和负数，它们已在上一步被拦截）
    const orderValues = Object.values(orders);
    const uniqueOrders = new Set(orderValues);
    if (orderValues.length !== uniqueOrders.size) {
      return NextResponse.json(
        { success: false, error: '存在重复的排序号，请确保每个序号唯一' },
        { status: 400 }
      );
    }

    // 获取文件系统中的章节文件列表（用于同步重命名）
    const chaptersDir = path.join(process.cwd(), 'content', 'novels', novelId, 'chapters');
    let fileSystemFiles: string[] = [];
    if (fs.existsSync(chaptersDir)) {
      fileSystemFiles = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
    }

    // 更新数据库中的 order_num
    const updateStmt = db.prepare('UPDATE chapters SET order_num = ? WHERE id = ? AND novel_id = ?');

    const transaction = db.transaction(() => {
      for (const [chapterId, newOrder] of Object.entries(orders)) {
        updateStmt.run(newOrder, chapterId, novelId);

        // 同步重命名文件系统中的章节文件
        if (fileSystemFiles.length > 0) {
          const chapter = existingChapters.find(c => c.id === chapterId);
          if (chapter) {
            const oldPrefix = String(chapter.order_num) + '-';
            const newPrefix = String(newOrder) + '-';
            const matchingFile = fileSystemFiles.find(f => f.startsWith(oldPrefix));
            if (matchingFile) {
              const newFileName = matchingFile.replace(oldPrefix, newPrefix);
              const oldPath = path.join(chaptersDir, matchingFile);
              const newPath = path.join(chaptersDir, newFileName);
              try {
                fs.renameSync(oldPath, newPath);
                // 更新文件系统列表中的文件名
                const idx = fileSystemFiles.indexOf(matchingFile);
                if (idx !== -1) fileSystemFiles[idx] = newFileName;
              } catch (e) {
                // 文件可能被其他操作删除了，忽略
              }
            }
          }
        }
      }
    });

    transaction();

    // 写审计日志
    try {
      logAdminAction({
        adminId: admin.id,
        adminUsername: admin.username,
        action: 'edit_chapter',
        targetType: 'chapter',
        targetId: novelId,
        detail: {
          action: 'reorder_chapters',
          chapterCount: Object.keys(orders).length,
          orderSummary: orders as Record<string, unknown>,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
    } catch (e) {
      // 审计日志写入失败不影响主流程
      console.warn('审计日志写入失败:', e);
    }

    return NextResponse.json({
      success: true,
      message: `成功更新 ${Object.keys(orders).length} 个章节的排序`,
      updated: Object.keys(orders).length,
    });
  } catch (error) {
    console.error('Chapter reorder error:', error);
    return NextResponse.json(
      { success: false, error: '排序失败：' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}
