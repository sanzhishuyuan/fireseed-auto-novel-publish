/**
 * GET /api/rpg/campaigns/[id] — 战役详情
 * POST /api/rpg/campaigns/[id]/action — 玩家行动 → AI GM
 * POST /api/rpg/campaigns/[id]/save — 存档
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { RULE_PRESETS, type CharacterCardData } from '@/lib/rpg/types';
import { extractAndRollDice } from '@/lib/rpg/dice';

export const dynamic = 'force-dynamic';

/**
 * GET — 获取战役详情（含消息历史）
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const campaign = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM rpg_campaign_members WHERE campaign_id = c.id) as player_count
      FROM rpg_campaigns c WHERE c.id = ?
    `).get(id) as any;

    if (!campaign) {
      return NextResponse.json({ success: false, error: '战役不存在' }, { status: 404 });
    }

    // 获取活跃会话
    const session = db.prepare(`
      SELECT * FROM rpg_sessions WHERE campaign_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1
    `).get(id) as any;

    // 获取最近消息
    const messages = db.prepare(`
      SELECT m.*, u.username
      FROM rpg_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.campaign_id = ?
      ORDER BY m.created_at ASC LIMIT 100
    `).all(id);

    // 获取成员
    const members = db.prepare(`
      SELECT cm.*, u.username, u.nickname, rc.name as character_name, rc.avatar_url
      FROM rpg_campaign_members cm
      LEFT JOIN users u ON cm.user_id = u.id
      LEFT JOIN rpg_characters rc ON cm.character_id = rc.id
      WHERE cm.campaign_id = ?
    `).all(id);

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        session,
        messages,
        members,
      },
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    return NextResponse.json({ success: false, error: '获取战役失败' }, { status: 500 });
  }
}

/**
 * POST /api/rpg/campaigns/[id]/action — 玩家行动，AI GM 响应
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, characterId } = body;

    // 验证战役和成员
    const campaign = db.prepare(`
      SELECT c.*, s.id as session_id
      FROM rpg_campaigns c
      LEFT JOIN rpg_sessions s ON s.campaign_id = c.id AND s.status = 'active'
      WHERE c.id = ?
    `).get(id) as any;

    if (!campaign) {
      return NextResponse.json({ success: false, error: '战役不存在' }, { status: 404 });
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

    // 构建 AI GM 提示
    const systemPrompt = buildGMPrompt(preset, campaign, characterCard);

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
      // 降级模式：返回简单回复
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
        },
      });
    }

    // 调用 LLM API (支持 DeepSeek / 智谱等 OpenAI 兼容接口)
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

    // 解析骰子标记
    const { cleanText, rolls } = extractAndRollDice(rawContent);

    // 保存 GM 消息
    const gmMsgId = uuidv4();
    db.prepare(`
      INSERT INTO rpg_messages (id, campaign_id, session_id, user_id, role, content, msg_type, dice_result)
      VALUES (?, ?, ?, NULL, 'gm', ?, 'narrative', ?)
    `).run(gmMsgId, id, campaign.session_id || '', cleanText, rolls.length > 0 ? JSON.stringify(rolls) : null);

    // 保存掷骰记录
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
      },
    });
  } catch (error) {
    console.error('AI GM action error:', error);
    return NextResponse.json({ success: false, error: 'AI GM 处理失败' }, { status: 500 });
  }
}

/**
 * 构建 AI GM 系统提示词
 */
function buildGMPrompt(preset: typeof RULE_PRESETS.dnd5e, campaign: any, characterCard: CharacterCardData | null): string {
  let prompt = preset.systemPrompt;

  if (campaign.world_brief) {
    prompt += `\n\n## 世界设定\n${campaign.world_brief}`;
  }

  if (characterCard) {
    prompt += `\n\n## 玩家角色\n`;
    prompt += `名称: ${characterCard.name}\n`;
    prompt += `描述: ${characterCard.description}\n`;
    if (characterCard.personality) {
      prompt += `性格: ${characterCard.personality}\n`;
    }
    if (characterCard.trpg) {
      prompt += `等级: ${characterCard.trpg.level || 1}\n`;
      if (characterCard.trpg.attributes) {
        const attrs = Object.entries(characterCard.trpg.attributes)
          .map(([k, v]) => `${k}:${v}`).join(', ');
        prompt += `属性: ${attrs}\n`;
      }
      if (characterCard.trpg.hp) {
        prompt += `HP: ${characterCard.trpg.hp.current}/${characterCard.trpg.hp.max}\n`;
      }
      if (characterCard.trpg.backstory) {
        prompt += `背景故事: ${characterCard.trpg.backstory}\n`;
      }
    }
    prompt += `\n请根据以上角色设定，以第二人称"你"称呼玩家。`;
  } else {
    prompt += `\n\n玩家尚未创建正式角色，请根据对话逐渐了解并称呼他们。`;
  }

  prompt += `\n\n## 输出格式要求
- 使用生动的叙事语言描述场景和事件
- 当需要玩家做决定时，给出 2-3 个清晰的选择
- 当需要掷骰判定时，使用 [[D20+N]] 或 [[D100]] 格式标记，引擎会自动解析
- 保持回复在 200-500 字之间
- 推动剧情发展，但不要替玩家做决定`;

  return prompt;
}

/**
 * POST /api/rpg/campaigns/[id]/save — 存档
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // 获取当前会话和消息
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
