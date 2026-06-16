/**
 * GET /api/rpg/assets/my — 获取当前用户的所有资产（含购买和免费领取）
 */
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getPurchasedAssets } from '@/lib/rpg/economy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const assets = getPurchasedAssets(user.userId);

    // 为每个资产添加名称信息
    const enrichedAssets = assets.map((asset: any) => {
      let name = '';
      if (asset.asset_type === 'character') {
        name = asset.char_name || '未命名角色';
      } else if (asset.asset_type === 'lorebook') {
        name = asset.lore_name || '未命名世界书';
      } else if (asset.asset_type === 'module') {
        name = asset.campaign_name || '未命名副本';
      }

      return {
        ...asset,
        name,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedAssets,
    });
  } catch (error) {
    console.error('Get user assets error:', error);
    return NextResponse.json({ success: false, error: '获取资产失败' }, { status: 500 });
  }
}
