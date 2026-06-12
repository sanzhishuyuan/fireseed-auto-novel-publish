/**
 * GET /api/rpg/asset-links — 获取资产关联列表
 * POST /api/rpg/asset-links — 创建资产关联
 */
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createAssetLink, getAssetLinks, linkExists, getBulkAssetLinks } from '@/lib/rpg/asset-links';
import type { AssetSourceType, AssetLinkedType } from '@/lib/rpg/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rpg/asset-links?sourceType=xxx&sourceId=xxx
 * 查询某个资产的所有关联
 * 支持批量: sourceIds=id1,id2,id3 (用逗号分隔)
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get('sourceType') as AssetSourceType | null;
    const sourceId = searchParams.get('sourceId');
    const sourceIds = searchParams.get('sourceIds');

    if (!sourceType || !['module', 'lorebook', 'character'].includes(sourceType)) {
      return NextResponse.json({ success: false, error: '无效的 sourceType' }, { status: 400 });
    }

    if (sourceIds) {
      // 批量查询
      const ids = sourceIds.split(',').filter(Boolean);
      const result = getBulkAssetLinks(sourceType, ids);
      const obj: Record<string, any[]> = {};
      result.forEach((v, k) => { obj[k] = v; });
      return NextResponse.json({ success: true, data: obj });
    }

    if (!sourceId) {
      return NextResponse.json({ success: false, error: '需要 sourceId 或 sourceIds' }, { status: 400 });
    }

    const links = getAssetLinks(sourceType, sourceId);
    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    console.error('Get asset links error:', error);
    return NextResponse.json({ success: false, error: '获取资产关联失败' }, { status: 500 });
  }
}

/**
 * POST /api/rpg/asset-links — 创建资产关联
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { sourceType, sourceId, linkedType, linkedId, role } = body;

    if (!sourceType || !sourceId || !linkedType || !linkedId) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    if (!['module', 'lorebook', 'character'].includes(sourceType)) {
      return NextResponse.json({ success: false, error: '无效的 sourceType' }, { status: 400 });
    }
    if (!['character', 'lorebook', 'module'].includes(linkedType)) {
      return NextResponse.json({ success: false, error: '无效的 linkedType' }, { status: 400 });
    }

    // 检查是否已存在
    if (linkExists(sourceType, sourceId, linkedType as AssetLinkedType, linkedId)) {
      return NextResponse.json({ success: false, error: '该关联已存在' }, { status: 409 });
    }

    const link = createAssetLink({
      sourceType,
      sourceId,
      linkedType: linkedType as AssetLinkedType,
      linkedId,
      role: role || '',
      createdBy: user.userId,
    });

    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    console.error('Create asset link error:', error);
    return NextResponse.json({ success: false, error: '创建资产关联失败' }, { status: 500 });
  }
}
