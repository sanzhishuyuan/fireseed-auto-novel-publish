/**
 * Fate Formula API — 命运公式全功能端点
 *
 * POST /api/rpg/fate — 执行命运检定
 * GET  /api/rpg/fate — 获取修正摘要
 *
 * POST body 支持 mode 参数：
 *   mode: 'check'    (默认) 命运检定
 *   mode: 'opposed'  NPC 对抗检定
 *   mode: 'simulate' 平衡性模拟
 *   mode: 'update'   状态自动更新
 *   mode: 'flag'     Flag 管理 (set/remove/get)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import {
  fateCheck,
  getFateModSummary,
  opposedCheck,
  applyFateStateUpdate,
  simulateFateCheck,
  setFlag,
  removeFlag,
  getFlags,
} from '@/lib/rpg/fate';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const mode = body.mode || 'check';

    switch (mode) {
      case 'check': {
        const { actionType, characterId, campaignId, difficulty, extraPlayerMod, extraWorldMod, targetNpcId } = body;
        if (!actionType || !characterId) {
          return NextResponse.json({ success: false, error: '缺少 actionType 或 characterId' }, { status: 400 });
        }
        const result = fateCheck({ actionType, characterId, campaignId, difficulty, extraPlayerMod, extraWorldMod, targetNpcId });
        return NextResponse.json({ success: true, data: result });
      }

      case 'opposed': {
        const { actionType, characterId, npcId, campaignId, difficulty } = body;
        if (!actionType || !characterId || !npcId) {
          return NextResponse.json({ success: false, error: '缺少 actionType, characterId 或 npcId' }, { status: 400 });
        }
        const result = opposedCheck({ actionType, characterId, npcId, campaignId, difficulty });
        return NextResponse.json({ success: true, data: result });
      }

      case 'simulate': {
        const { actionType, characterId, campaignId, difficulty, runs } = body;
        if (!actionType || !characterId) {
          return NextResponse.json({ success: false, error: '缺少 actionType 或 characterId' }, { status: 400 });
        }
        const result = simulateFateCheck({ actionType, characterId, campaignId, difficulty }, runs || 1000);
        return NextResponse.json({ success: true, data: result });
      }

      case 'update': {
        const { characterId, fateResult, targetNpcName } = body;
        if (!characterId || !fateResult) {
          return NextResponse.json({ success: false, error: '缺少 characterId 或 fateResult' }, { status: 400 });
        }
        const result = applyFateStateUpdate(characterId, fateResult, targetNpcName);
        return NextResponse.json({ success: true, data: result });
      }

      case 'flag': {
        const { action, characterId, flagName, value } = body;
        if (!characterId || !flagName) {
          return NextResponse.json({ success: false, error: '缺少 characterId 或 flagName' }, { status: 400 });
        }
        switch (action) {
          case 'set': {
            const ok = setFlag(characterId, flagName, value ?? true);
            return NextResponse.json({ success: ok, data: { flagName, value: value ?? true } });
          }
          case 'remove': {
            const ok = removeFlag(characterId, flagName);
            return NextResponse.json({ success: ok, data: { flagName, removed: true } });
          }
          case 'get': {
            const flags = getFlags(characterId);
            return NextResponse.json({ success: true, data: flags });
          }
          default:
            return NextResponse.json({ success: false, error: 'flag action 必须是 set, remove 或 get' }, { status: 400 });
        }
      }

      default:
        return NextResponse.json({ success: false, error: `未知 mode: ${mode}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Fate API error:', error);
    return NextResponse.json({ success: false, error: error.message || '命运公式执行失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');
    const campaignId = searchParams.get('campaignId') || undefined;

    if (!characterId) {
      return NextResponse.json({ success: false, error: '缺少 characterId' }, { status: 400 });
    }

    const summary = getFateModSummary(characterId, campaignId);
    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Fate summary error:', error);
    return NextResponse.json({ success: false, error: '获取命运修正失败' }, { status: 500 });
  }
}
