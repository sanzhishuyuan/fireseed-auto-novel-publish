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

    // 校验排序号必须为正整数
    for (const [id, order] of Object.entries(orders)) {
      if (!Number.isInteger(order) || order < 1) {
        return NextResponse.json(
          { success: false, error: `章节 ${id} 的排序号无效（必须为正整数）` },
          { status: 400 }
        );
      }
    }

    // 获取小说所有章节（按当前 order_num 排序）
    const allChapters = db.prepare(
      `SELECT id, order_num FROM chapters WHERE novel_id = ? ORDER BY order_num ASC, created_at ASC`
    ).all(novelId) as { id: string; order_num: number }[];

    // 校验用户指定的章节 ID 确实属于该小说
    const allIds = new Set(allChapters.map(c => c.id));
    const invalidIds = Object.keys(orders).filter(id => !allIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { success: false, error: `以下章节ID不存在于该小说中: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    // ===== 插入排序算法 =====
    // 1. 获取当前有序列表（按 order_num）
    const orderedList: string[] = allChapters.map(c => c.id);

    // 2. 按目标序号升序排列用户指定的章节
    const userMoves = Object.entries(orders)
      .map(([id, target]) => ({ id, target }))
      .sort((a, b) => a.target - b.target);

    // 3. 从列表中移除被移动的章节（从后往前删避免索引偏移）
    const movedIds = new Set(Object.keys(orders));
    for (let i = orderedList.length - 1; i >= 0; i--) {
      if (movedIds.has(orderedList[i])) {
        orderedList.splice(i, 1);
      }
    }

    // 4. 按目标位置插入（升序已排好，逐次插入）
    const inserted = new Set<string>();
    for (const { id, target } of userMoves) {
      const insertIndex = Math.min(Math.max(target - 1, 0), orderedList.length);
      orderedList.splice(insertIndex, 0, id);
      inserted.add(id);
    }

    // 5. 分配最终序号 1..N
    const finalOrders: Record<string, number> = {};
    orderedList.forEach((id, idx) => {
      finalOrders[id] = idx + 1;
    });

    // ===== 更新数据库 =====
    const updateStmt = db.prepare('UPDATE chapters SET order_num = ? WHERE id = ? AND novel_id = ?');
    const transaction = db.transaction(() => {
      for (const [chapterId, newOrder] of Object.entries(finalOrders)) {
        updateStmt.run(newOrder, chapterId, novelId);
      }
    });
    transaction();

    // ===== 同步文件系统 =====
    const chaptersDir = path.join(process.cwd(), 'content', 'novels', novelId, 'chapters');
    if (fs.existsSync(chaptersDir)) {
      const fileSystemFiles = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
      if (fileSystemFiles.length > 0) {
        for (const [chapterId, newOrder] of Object.entries(finalOrders)) {
          const oldData = allChapters.find(c => c.id === chapterId);
          if (!oldData) continue;
          const oldPrefix = String(oldData.order_num) + '-';
          const newPrefix = String(newOrder) + '-';
          const matchingFile = fileSystemFiles.find(f => f.startsWith(oldPrefix));
          if (matchingFile) {
            const newFileName = matchingFile.replace(oldPrefix, newPrefix);
            try {
              fs.renameSync(
                path.join(chaptersDir, matchingFile),
                path.join(chaptersDir, newFileName)
              );
            } catch (e) {
              // 文件可能已被其他操作删除，忽略
            }
          }
        }
      }
    }

    // ===== 审计日志 =====
    try {
      logAdminAction({
        adminId: admin.id,
        adminUsername: admin.username,
        action: 'edit_chapter',
        targetType: 'chapter',
        targetId: novelId,
        detail: {
          action: 'reorder_chapters',
          movedCount: Object.keys(orders).length,
          moveSummary: orders as Record<string, unknown>,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
    } catch (e) {
      // 审计日志写入失败不影响主流程
      console.warn('审计日志写入失败:', e);
    }

    return NextResponse.json({
      success: true,
      message: `章节排序已更新（${Object.keys(orders).length} 个章节移动，共 ${orderedList.length} 章重新编号）`,
      updated: orderedList.length,
    });
  } catch (error) {
    console.error('Chapter reorder error:', error);
    return NextResponse.json(
      { success: false, error: '排序失败：' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}
