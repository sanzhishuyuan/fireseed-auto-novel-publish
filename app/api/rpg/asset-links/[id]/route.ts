/**
 * DELETE /api/rpg/asset-links/[id] — 删除资产关联
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { deleteAssetLink } from '@/lib/rpg/asset-links';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/rpg/asset-links/[id] — 删除资产关联（仅创建者可删除）
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;

    // 验证所有权
    const link = db.prepare('SELECT * FROM rpg_asset_links WHERE id = ?').get(id) as any;
    if (!link) {
      return NextResponse.json({ success: false, error: '关联不存在' }, { status: 404 });
    }
    if (link.created_by !== user.userId && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '无权限删除此关联' }, { status: 403 });
    }

    const deleted = deleteAssetLink(id);
    return NextResponse.json({ success: true, data: { deleted } });
  } catch (error) {
    console.error('Delete asset link error:', error);
    return NextResponse.json({ success: false, error: '删除资产关联失败' }, { status: 500 });
  }
}
