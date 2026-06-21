/**
 * GET /api/rpg/campaigns/[id] — 战役详情
 * POST /api/rpg/campaigns/[id] — 玩家行动 → AI GM（含命运公式判定）
 * PUT /api/rpg/campaigns/[id] — 存档
 *
 * v2.0: 集成命运公式引擎
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { RULE_PRESETS, type CharacterCardData, type LorebookEntry } from '@/lib/rpg/types';
import { extractAndRollDice } from '@/lib/rpg/dice';
import { fateCheck, applyFateStateUpdate } from '@/lib/rpg/fate';
import { buildSystemPrompt, inferActionType } from '@/lib/rpg/gm-engine';

export const dynamic = 'force-dynamic';

/**
 * GET — 获取战役详情（含消息历史）
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const before = searchParams.get('before'); // message ID for cursor

    const campaign = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM rpg_campaign_members WHERE campaign_id = c.id) as player_count
      FROM rpg_campaigns c WHERE c.id = ?
    `).get(id) as any;

    if (!campaign) {
      return NextResponse.json({ success: false, error: '战役不存在' }, { status: 404 });
    }

    const session = db.prepare(`
      SELECT * FROM rpg_sessions WHERE campaign_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1
    `).get(id) as any;

    let messagesQuery = `
      SELECT m.*, u.username
      FROM rpg_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.campaign_id = ?
    `;
    const queryParams: any[] = [id];

    if (before) {
      messagesQuery += ' AND m.created_at < (SELECT created_at FROM rpg_messages WHERE id = ?)';
      queryParams.push(before);
    }

    messagesQuery += ' ORDER BY m.created_at DESC LIMIT ?';
    queryParams.push(limit);

    const messages = db.prepare(messagesQuery).all(...queryParams) as any[];
    // 反转回正序
    messages.reverse();

    // 检查是否有更多消息
    const hasMore = messages.length === limit && messages.length > 0;
    const nextCursor = hasMore ? messages[0].id : null;

    const members = db.prepare(`
      SELECT cm.*, u.username, u.nickname, rc.name as character_name, rc.avatar_url
      FROM rpg_campaign_members cm
      LEFT JOIN users u ON cm.user_id = u.id
      LEFT JOIN rpg_characters rc ON cm.character_id = rc.id
      WHERE cm.campaign_id = ?
    `).all(id);

    // 获取关联的世界书信息
    let lorebookInfo = null;
    if (campaign.lorebook_id) {
      const lb = db.prepare('SELECT name, description, entries FROM rpg_lorebooks WHERE id = ?').get(campaign.lorebook_id) as any;
      if (lb) {
        let entryCount = 0;
        try { entryCount = JSON.parse(lb.entries || '[]').length; } catch {}
        lorebookInfo = { id: campaign.lorebook_id, name: lb.name, entry_count: entryCount };
      }
    }

    // 获取副本全局状态
    let campaignState = null;
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS rpg_campaign_state (
        id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL UNIQUE,
        variables TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      const stateRow = db.prepare('SELECT variables FROM rpg_campaign_state WHERE campaign_id = ?').get(id) as any;
      if (stateRow) campaignState = JSON.parse(stateRow.variables || '{}');
    } catch {}

    return NextResponse.json({
      success: true,
      data: { 
        ...campaign, 
        session, 
        messages, 
        members, 
        lorebook: lorebookInfo, 
        campaignState,
        pagination: { hasMore, nextCursor, limit },
      },
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    return NextResponse.json({ success: false, error: '获取战役失败' }, { status: 500 });
  }
}

/**
 * POST — 玩家行动，AI GM 响应（支持命运公式）
 * Body: { action, characterId, fateActionType?, fateDifficulty? }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, characterId, fateActionType, fateDifficulty } = body;

    const campaign = db.prepare(`
      SELECT c.*, s.id as session_id
      FROM rpg_campaigns c
      LEFT JOIN rpg_sessions s ON s.campaign_id = c.id AND s.status = 'active'
      WHERE c.id = ?
    `).get(id) as any;

    if (!campaign) {
      return NextResponse.json({ success: false, error: '战役不存在' }, { status: 404 });
    }

    // 权限校验：必须是副本创建者或成员才能行动
    const isOwner = campaign.created_by === user.userId;
    const isMember = db.prepare(
      'SELECT 1 FROM rpg_campaign_members WHERE campaign_id = ? AND user_id = ?'
    ).get(id, user.userId);

    if (!isOwner && !isMember) {
      return NextResponse.json({ success: false, error: '无权访问此副本' }, { status: 403 });
    }

    // ===== 命运公式判定 =====
    let fateResult = null;
    let stateUpdate = null;
    const resolvedFateActionType = fateActionType || inferActionType(action);
    if (characterId && resolvedFateActionType) {
      try {
        fateResult = fateCheck({
          actionType: resolvedFateActionType,
          characterId,
          campaignId: id,
          difficulty: fateDifficulty,
        });
        // Phase 4: 自动更新角色状态
        try {
          stateUpdate = applyFateStateUpdate(characterId, fateResult);
        } catch (e) {
          console.warn('State update failed:', e);
        }
      } catch (e) {
        console.warn('Fate check failed:', e);
      }
    }

    // 保存玩家消息
    const msgId = uuidv4();
    db.prepare(`
      INSERT INTO rpg_messages (id, campaign_id, session_id, user_id, character_id, role, content, msg_type)
      VALUES (?, ?, ?, ?, ?, 'player', ?, 'action')
    `).run(msgId, id, campaign.session_id || '', user.userId, characterId || null, action);

    // 获取最近的消息上下文
    const recentMessages = db.prepare(`
      SELECT role, content, msg_type FROM rpg_messages
      WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(id) as any[];

    // 获取角色卡信息
    let characterCard: CharacterCardData | null = null;
    if (characterId) {
      const charRow = db.prepare('SELECT card_data FROM rpg_characters WHERE id = ?').get(characterId) as any;
      if (charRow) {
        try { characterCard = JSON.parse(charRow.card_data); } catch {}
      }
    }

    // 获取规则预设
    const preset = RULE_PRESETS[campaign.system as keyof typeof RULE_PRESETS] || RULE_PRESETS.custom;

    // 获取关联的世界书条目（用于注入 AI GM 上下文）
    let lorebookEntries: LorebookEntry[] = [];
    if (campaign.lorebook_id) {
      const lbRow = db.prepare('SELECT entries FROM rpg_lorebooks WHERE id = ?').get(campaign.lorebook_id) as any;
      if (lbRow) {
        try {
          const parsed = JSON.parse(lbRow.entries || '[]');
          lorebookEntries = parsed.filter((e: any) => e.enabled !== false);
        } catch {}
      }
    }

    // 构建 AI GM 提示（含命运公式结果 + 世界书上下文）
    const systemPrompt = buildSystemPrompt({
      preset,
      campaign: { world_brief: campaign.world_brief, system: campaign.system },
      characterCard,
      lorebookEntries,
      playerMessage: action,
      fateResult,
      stateUpdate,
    });

    // 构建消息历史
    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.reverse().map(m => ({
        role: m.role === 'gm' ? 'assistant' as const : 'user' as const,
        content: m.content,
      })),
      { role: 'user' as const, content: action },
    ];

    // 调用 DeepSeek API
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) {
      const fallbackResponse = `*${preset.name}的 GM 点了点头，若有所思地看着你。*\n\n"你的行动已被记录，但 AI 引擎尚未配置完成。请设置 DEEPSEEK_API_KEY 环境变量以启用完整 AI GM 体验。"\n\n*(提示: 当前为降级模式，仅记录你的行动)*`;

      const gmMsgId = uuidv4();
      db.prepare(`
        INSERT INTO rpg_messages (id, campaign_id, session_id, user_id, role, content, msg_type)
        VALUES (?, ?, ?, NULL, 'gm', ?, 'narrative')
      `).run(gmMsgId, id, campaign.session_id || '', fallbackResponse);

      return NextResponse.json({
        success: true,
        data: {
          message: { id: gmMsgId, role: 'gm', content: fallbackResponse, msg_type: 'narrative' },
          diceRolls: [],
          fateResult,
          stateUpdate,
        },
      });
    }

    const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.deepseek.com/chat/completions';
    const llmModel = process.env.LLM_MODEL || 'deepseek-chat';
    const aiResponse = await fetch(llmBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: llmModel,
        max_tokens: 1024,
        temperature: 0.9,
        messages,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('DeepSeek API error:', errText);
      return NextResponse.json({ success: false, error: 'AI GM 暂时无法响应' }, { status: 502 });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    const { cleanText, rolls } = extractAndRollDice(rawContent);

    const gmMsgId = uuidv4();
    db.prepare(`
      INSERT INTO rpg_messages (id, campaign_id, session_id, user_id, role, content, msg_type, dice_result)
      VALUES (?, ?, ?, NULL, 'gm', ?, 'narrative', ?)
    `).run(gmMsgId, id, campaign.session_id || '', cleanText, rolls.length > 0 ? JSON.stringify(rolls) : null);

    for (const roll of rolls) {
      db.prepare(`
        INSERT INTO rpg_dice_rolls (id, campaign_id, session_id, user_id, character_id, expression, result, details, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), id, campaign.session_id || '', user.userId, characterId || null, roll.expression, roll.total, roll.detail, 'AI GM 自动掷骰');
    }

    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: gmMsgId,
          role: 'gm',
          content: cleanText,
          msg_type: 'narrative',
          dice_result: rolls.length > 0 ? JSON.stringify(rolls) : null,
        },
        diceRolls: rolls,
        fateResult,
        stateUpdate,
      },
    });
  } catch (error) {
    console.error('AI GM action error:', error);
    return NextResponse.json({ success: false, error: 'AI GM 处理失败' }, { status: 500 });
  }
}

/**
 * PUT — 存档
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const session = db.prepare(`
      SELECT * FROM rpg_sessions WHERE campaign_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1
    `).get(id) as any;

    const messages = db.prepare(`
      SELECT role, content, msg_type, dice_result FROM rpg_messages
      WHERE campaign_id = ? ORDER BY created_at ASC
    `).all(id);

    const archiveId = uuidv4();
    db.prepare(`
      INSERT INTO rpg_archives (id, campaign_id, session_id, title, content, token_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      archiveId, id, session?.id || '',
      body.title || `存档 ${new Date().toLocaleString('zh-CN')}`,
      JSON.stringify({ messages, state: body.state || {} }),
      0
    );

    return NextResponse.json({ success: true, data: { id: archiveId } });
  } catch (error) {
    console.error('Save campaign error:', error);
    return NextResponse.json({ success: false, error: '存档失败' }, { status: 500 });
  }
}

/**
 * DELETE — 删除副本（含级联安全检查）
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const campaign = db.prepare('SELECT id, created_by FROM rpg_campaigns WHERE id = ?').get(id) as any;

    if (!campaign) {
      return NextResponse.json({ success: false, error: '副本不存在' }, { status: 404 });
    }

    if (campaign.created_by !== user.userId) {
      return NextResponse.json({ success: false, error: '无权删除此副本' }, { status: 403 });
    }

    // 检查是否有活跃成员（除了创建者）
    const memberCount = db.prepare(
      'SELECT COUNT(*) as c FROM rpg_campaign_members WHERE campaign_id = ?'
    ).get(id) as any;

    if (memberCount.c > 0) {
      return NextResponse.json(
        { success: false, error: `该副本还有 ${memberCount.c} 名成员，请先移除所有成员后再删除` },
        { status: 409 }
      );
    }

    // 下架市场中的副本 listings
    db.prepare("UPDATE rpg_market_listings SET status = 'cancelled' WHERE asset_id = ? AND asset_type = 'module'").run(id);

    // 清理资产库关联
    db.prepare('DELETE FROM rpg_asset_library WHERE asset_id = ? AND asset_type = "module"').run(id);

    // 级联删除相关数据（按依赖顺序）
    // 1. 删除骰子记录
    db.prepare('DELETE FROM rpg_dice_rolls WHERE campaign_id = ?').run(id);
    
    // 2. 删除消息
    db.prepare('DELETE FROM rpg_messages WHERE campaign_id = ?').run(id);
    
    // 3. 删除会话
    db.prepare('DELETE FROM rpg_sessions WHERE campaign_id = ?').run(id);
    
    // 4. 删除存档
    db.prepare('DELETE FROM rpg_archives WHERE campaign_id = ?').run(id);
    
    // 5. 删除副本状态
    try {
      db.prepare('DELETE FROM rpg_campaign_state WHERE campaign_id = ?').run(id);
    } catch {}
    
    // 6. 删除成员关系（兜底，理论上上面已检查为空）
    db.prepare('DELETE FROM rpg_campaign_members WHERE campaign_id = ?').run(id);
    
    // 7. 最后删除副本本身
    db.prepare('DELETE FROM rpg_campaigns WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return NextResponse.json({ success: false, error: '删除副本失败' }, { status: 500 });
  }
}

