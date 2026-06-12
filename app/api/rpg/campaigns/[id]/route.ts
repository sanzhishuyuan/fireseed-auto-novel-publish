/**
 * GET /api/rpg/campaigns/[id] — 战役详情
 * POST /api/rpg/campaigns/[id] — 玩家行动 → AI GM（支持 SSE 流式）
 * PUT /api/rpg/campaigns/[id] — 存档
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { RULE_PRESETS, type CharacterCardData, type LorebookEntry } from '@/lib/rpg/types';
import { extractAndRollDice } from '@/lib/rpg/dice';
import { transferSeed, getBalance } from '@/lib/seed';

export const dynamic = 'force-dynamic';

// AI GM 每次调用消耗的 SEED
const AI_GM_COST = 2;

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

    const session = db.prepare(`
      SELECT * FROM rpg_sessions WHERE campaign_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1
    `).get(id) as any;

    const messages = db.prepare(`
      SELECT m.*, u.username
      FROM rpg_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.campaign_id = ?
      ORDER BY m.created_at ASC LIMIT 100
    `).all(id);

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

    return NextResponse.json({
      success: true,
      data: { ...campaign, session, messages, members, lorebook: lorebookInfo },
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    return NextResponse.json({ success: false, error: '获取战役失败' }, { status: 500 });
  }
}

/**
 * POST — 玩家行动，AI GM 响应（支持 SSE 流式 + SEED 计费）
 * Body: { action, characterId, stream?: boolean }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(request);
    if (user instanceof Response) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, characterId, stream } = body;

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

    // ===== SEED 经济检查 =====
    const balance = getBalance(user.userId);
    if (balance < AI_GM_COST) {
      return NextResponse.json({
        success: false,
        error: `SEED 不足：当前 ${balance} 🌱，AI GM 每次调用需要 ${AI_GM_COST} 🌱。请通过发布小说、签到等方式获取 SEED。`,
        balance,
        required: AI_GM_COST,
      }, { status: 402 });
    }

    // 保存玩家消息
    const msgId = uuidv4();
    db.prepare(`
      INSERT INTO rpg_messages (id, campaign_id, session_id, user_id, character_id, role, content, msg_type)
      VALUES (?, ?, ?, ?, ?, 'player', ?, 'action')
    `).run(msgId, id, campaign.session_id || '', user.userId, characterId || null, action);

    // 获取最近的消息上下文（增加到30条以改善记忆）
    const recentMessages = db.prepare(`
      SELECT role, content, msg_type FROM rpg_messages
      WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 30
    `).all(id) as any[];

    // 获取角色卡信息
    let characterCard: CharacterCardData | null = null;
    if (characterId) {
      const charRow = db.prepare('SELECT card_data FROM rpg_characters WHERE id = ?').get(characterId) as any;
      if (charRow) {
        try { characterCard = JSON.parse(charRow.card_data); } catch {}
      }
    }

    // ===== 加载世界书条目 =====
    let loreEntries: LorebookEntry[] = [];
    if (campaign.lorebook_id) {
      const lbRow = db.prepare('SELECT entries FROM rpg_lorebooks WHERE id = ?').get(campaign.lorebook_id) as any;
      if (lbRow) {
        try {
          const allEntries: LorebookEntry[] = JSON.parse(lbRow.entries || '[]');
          loreEntries = matchLoreEntries(allEntries, action, recentMessages);
        } catch {}
      }
    }

    // 获取规则预设
    const preset = RULE_PRESETS[campaign.system as keyof typeof RULE_PRESETS] || RULE_PRESETS.custom;

    // 构建 AI GM 提示
    const systemPrompt = buildGMPrompt(preset, campaign, characterCard, loreEntries);

    // 构建消息历史（上下文压缩：只保留最近20条的完整内容，更早的只保留摘要）
    const compressedHistory = compressHistory(recentMessages);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...compressedHistory,
      { role: 'user' as const, content: action },
    ];

    // 调用 LLM API
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
          seedCost: 0,
        },
      });
    }

    const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.deepseek.com/chat/completions';
    const llmModel = process.env.LLM_MODEL || 'deepseek-chat';

    // ===== SSE 流式响应 =====
    if (stream) {
      const aiResponse = await fetch(llmBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model: llmModel,
          max_tokens: 1536,
          temperature: 0.9,
          messages,
          stream: true,
        }),
      });

      if (!aiResponse.ok || !aiResponse.body) {
        const errText = await aiResponse.text();
        console.error('DeepSeek API error:', errText);
        return NextResponse.json({ success: false, error: 'AI GM 暂时无法响应' }, { status: 502 });
      }

      // SSE 流式处理
      const gmMsgId = uuidv4();
      let fullContent = '';

      const textEncoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const reader = aiResponse.body!.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

              for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullContent += delta;
                    controller.enqueue(textEncoder.encode(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`));
                  }
                } catch {}
              }
            }

            // 流结束，处理骰子并保存
            const { cleanText, rolls } = extractAndRollDice(fullContent);

            // 保存 GM 消息
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

            // 扣除 SEED
            let seedCost = 0;
            try {
              transferSeed(user.userId, -AI_GM_COST, 'ai_gm' as any, {
                refId: id,
                description: `AI GM 调用 - ${campaign.name}`,
              });
              seedCost = AI_GM_COST;
            } catch (e: any) {
              console.error('SEED deduction error:', e.message);
            }

            // 发送结束事件
            controller.enqueue(textEncoder.encode(`data: ${JSON.stringify({
              type: 'done',
              messageId: gmMsgId,
              cleanText,
              diceRolls: rolls,
              seedCost,
            })}\n\n`));

            controller.close();
          } catch (error) {
            console.error('SSE stream error:', error);
            controller.enqueue(textEncoder.encode(`data: ${JSON.stringify({ type: 'error', error: '流式传输中断' })}\n\n`));
            controller.close();
          }
        },
      });

      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // ===== 非流式响应（兼容旧版） =====
    const aiResponse = await fetch(llmBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: llmModel,
        max_tokens: 1536,
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

    // 扣除 SEED
    let seedCost = 0;
    try {
      transferSeed(user.userId, -AI_GM_COST, 'ai_gm' as any, {
        refId: id,
        description: `AI GM 调用 - ${campaign.name}`,
      });
      seedCost = AI_GM_COST;
    } catch (e: any) {
      console.error('SEED deduction error:', e.message);
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
        seedCost,
        balance: getBalance(user.userId),
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

// ===== 辅助函数 =====

/**
 * 构建 AI GM 系统提示词（增强版：含世界书）
 */
function buildGMPrompt(
  preset: typeof RULE_PRESETS.dnd5e,
  campaign: any,
  characterCard: CharacterCardData | null,
  loreEntries: LorebookEntry[],
): string {
  let prompt = preset.systemPrompt;

  if (campaign.world_brief) {
    prompt += `\n\n## 世界设定\n${campaign.world_brief}`;
  }

  // 注入世界书条目
  if (loreEntries.length > 0) {
    prompt += `\n\n## 世界百科（以下信息已确认存在于世界中，请在叙事中自然引用）`;
    for (const entry of loreEntries) {
      const keysStr = entry.keys.join(', ');
      prompt += `\n### ${keysStr}\n${entry.content}`;
    }
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
      if (characterCard.trpg.mp) {
        prompt += `MP: ${characterCard.trpg.mp.current}/${characterCard.trpg.mp.max}\n`;
      }
      if (characterCard.trpg.san) {
        prompt += `SAN: ${characterCard.trpg.san.current}/${characterCard.trpg.san.max}\n`;
      }
      if (characterCard.trpg.equipment?.length > 0) {
        prompt += `装备: ${characterCard.trpg.equipment.join(', ')}\n`;
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
- 推动剧情发展，但不要替玩家做决定
- 如果世界百科中有相关信息，自然地融入叙事`;

  return prompt;
}

/**
 * 上下文记忆压缩：保留最近20条完整内容，更早的只保留角色和内容摘要
 */
function compressHistory(messages: any[]): { role: string; content: string }[] {
  const reversed = [...messages].reverse();

  if (reversed.length <= 20) {
    return reversed.map(m => ({
      role: m.role === 'gm' ? 'assistant' : 'user',
      content: m.content,
    }));
  }

  // 较早的消息压缩
  const older = reversed.slice(0, reversed.length - 20);
  const recent = reversed.slice(-20);

  const summary = older.map(m => {
    const prefix = m.role === 'gm' ? 'GM' : '玩家';
    const content = m.content.length > 100 ? m.content.slice(0, 100) + '...' : m.content;
    return `[${prefix}]: ${content}`;
  }).join('\n');

  const compressedMessages: { role: string; content: string }[] = [
    {
      role: 'user',
      content: `[之前的冒险摘要]\n${summary}`,
    },
  ];

  for (const m of recent) {
    compressedMessages.push({
      role: m.role === 'gm' ? 'assistant' : 'user',
      content: m.content,
    });
  }

  return compressedMessages;
}

/**
 * 世界书条目匹配：根据玩家行动和历史消息匹配相关条目
 */
function matchLoreEntries(allEntries: LorebookEntry[], action: string, recentMessages: any[]): LorebookEntry[] {
  const enabled = allEntries.filter(e => e.enabled);
  const actionLower = action.toLowerCase();

  // 提取最近消息中的关键词
  const recentText = recentMessages.slice(0, 5).map(m => m.content).join(' ').toLowerCase();

  const matched: LorebookEntry[] = [];

  for (const entry of enabled) {
    // 常驻条目直接加入
    if (entry.constant) {
      matched.push(entry);
      continue;
    }

    const keysMatch = entry.keys.some(k => {
      const keyLower = k.toLowerCase();
      return actionLower.includes(keyLower) || recentText.includes(keyLower);
    });

    if (keysMatch) {
      // 条件触发需要同时匹配副关键词
      if (entry.selective && entry.secondary_keys?.length) {
        const secMatch = entry.secondary_keys.some(sk =>
          actionLower.includes(sk.toLowerCase()) || recentText.includes(sk.toLowerCase())
        );
        if (secMatch) matched.push(entry);
      } else {
        matched.push(entry);
      }
    }
  }

  // 按优先级排序，限制注入条目数（避免上下文过长）
  matched.sort((a, b) => b.priority - a.priority);
  return matched.slice(0, 8);
}
