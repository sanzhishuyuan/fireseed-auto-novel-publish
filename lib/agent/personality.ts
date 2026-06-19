/**
 * 代人人格特质计算引擎
 * 
 * 从用户行为数据计算 6 维人格特质（0-100）：
 *   genre_pref   — 类型偏好（低=言情现实，高=玄幻科幻）
 *   writing_focus — 创作重心（低=角色驱动，高=剧情驱动）
 *   tone         — 交流风格（低=沉稳内敛，高=热情外放）
 *   creativity   — 创意指数（低=写实派，高=脑洞派）
 *   social       — 社交活跃度（低=潜水型，高=话痨型）
 *   picky        — 品味挑剔度（低=来者不拒，高=眼光独到）
 */

import db from '@/lib/db';

export interface Personality {
  genre_pref: number;
  writing_focus: number;
  tone: number;
  creativity: number;
  social: number;
  picky: number;
}

const DEFAULT_PERSONALITY: Personality = {
  genre_pref: 50,
  writing_focus: 50,
  tone: 50,
  creativity: 50,
  social: 50,
  picky: 50,
};

/**
 * 计算用户的人格特质，结果写回 user_agents.personality
 */
export function computePersonality(userId: string): Personality {
  const p: Personality = { ...DEFAULT_PERSONALITY };

  // 1. genre_pref — 从阅读记录和收藏统计玄幻/科幻占比
  try {
    const progress = db.prepare(`
      SELECT n.tags, n.title FROM user_progress up
      JOIN novels n ON up.novel_id = n.id
      WHERE up.user_id = ?
      LIMIT 50
    `).all(userId) as { tags: string; title: string }[];

    const favorites = db.prepare(`
      SELECT n.tags, n.title FROM favorites f
      JOIN novels n ON f.novel_id = n.id
      WHERE f.user_id = ?
      LIMIT 30
    `).all(userId) as { tags: string; title: string }[];

    const allItems = [...progress, ...favorites];
    if (allItems.length > 0) {
      let fantasySciFiCount = 0;
      for (const item of allItems) {
        const tags = (item.tags || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        if (/玄幻|科幻|奇幻|仙侠|修真|异能|末日|星际|机甲|赛博/.test(tags + title)) {
          fantasySciFiCount++;
        }
      }
      const ratio = fantasySciFiCount / allItems.length;
      p.genre_pref = Math.round(30 + ratio * 60); // 映射到 30-90 范围
    }
  } catch { /* 表不存在或查询失败，保持默认值 */ }

  // 2. writing_focus — 从用户创作的分支和角色卡判断
  try {
    const branches = db.prepare(`
      SELECT branch_name, content FROM custom_branches WHERE user_id = ? LIMIT 20
    `).all(userId) as { branch_name: string; content: string }[];

    const rpgChars = db.prepare(`
      SELECT card_data FROM rpg_characters WHERE user_id = ? LIMIT 10
    `).all(userId) as { card_data: string }[];

    if (branches.length > 0 || rpgChars.length > 0) {
      // 分支多 = 剧情驱动，角色卡多 = 角色驱动
      const branchScore = Math.min(branches.length / 10, 1) * 60;
      const charScore = Math.min(rpgChars.length / 5, 1) * 40;
      p.writing_focus = Math.round(30 + branchScore - charScore * 0.5);
      p.writing_focus = Math.max(10, Math.min(90, p.writing_focus));
    }
  } catch { /* 保持默认值 */ }

  // 3. tone — 从聊天消息的语气分析
  try {
    const messages = db.prepare(`
      SELECT content FROM chat_messages
      WHERE user_id = ? AND is_ai = 0
      ORDER BY created_at DESC LIMIT 50
    `).all(userId) as { content: string }[];

    if (messages.length > 3) {
      let exclamationCount = 0;
      let emojiCount = 0;
      let totalLen = 0;
      for (const m of messages) {
        const text = m.content || '';
        totalLen += text.length;
        exclamationCount += (text.match(/[!！]/g) || []).length;
        emojiCount += (text.match(/[\u2600-\u26FF\u2700-\u27BF\uFE00-\uFE0F]/g) || []).length;
      }
      const avgLen = totalLen / messages.length;
      const excitementScore = Math.min((exclamationCount + emojiCount) / messages.length, 3);
      // 短消息+多感叹号+emoji = 热情外放
      p.tone = Math.round(30 + excitementScore * 15 + (avgLen < 50 ? 10 : 0));
      p.tone = Math.max(10, Math.min(90, p.tone));
    }
  } catch { /* 保持默认值 */ }

  // 4. creativity — 从角色卡创意度和分支设定复杂度
  try {
    const rpgChars = db.prepare(`
      SELECT card_data FROM rpg_characters WHERE user_id = ? LIMIT 10
    `).all(userId) as { card_data: string }[];

    if (rpgChars.length > 0) {
      let complexityScore = 0;
      for (const c of rpgChars) {
        const dataLen = (c.card_data || '').length;
        complexityScore += Math.min(dataLen / 1000, 5); // 越长的角色卡越复杂
      }
      p.creativity = Math.round(40 + Math.min(complexityScore / rpgChars.length, 3) * 15);
      p.creativity = Math.max(20, Math.min(95, p.creativity));
    }
  } catch { /* 保持默认值 */ }

  // 5. social — 综合聊天频率、评论频率、推广数
  try {
    const chatCount = db.prepare(
      'SELECT COUNT(*) as c FROM chat_messages WHERE user_id = ? AND is_ai = 0'
    ).get(userId) as { c: number };

    const commentCount = db.prepare(
      'SELECT COUNT(*) as c FROM comments WHERE user_id = ?'
    ).get(userId) as { c: number };

    const user = db.prepare(
      'SELECT referral_count FROM users WHERE id = ?'
    ).get(userId) as { referral_count: number } | undefined;

    const totalSocial = (chatCount?.c || 0) + (commentCount?.c || 0) * 2 + (user?.referral_count || 0) * 3;
    p.social = Math.round(20 + Math.min(totalSocial / 5, 70));
    p.social = Math.max(10, Math.min(95, p.social));
  } catch { /* 保持默认值 */ }

  // 6. picky — 从投票中负面评价占比
  try {
    const votes = db.prepare(`
      SELECT vote_type, reason FROM chapter_votes WHERE user_id = ? LIMIT 50
    `).all(userId) as { vote_type: string; reason: string }[];

    if (votes.length > 3) {
      let negativeCount = 0;
      for (const v of votes) {
        if (v.vote_type === 'useless' || /不好|差|无聊|垃圾|难看/.test(v.reason || '')) {
          negativeCount++;
        }
      }
      const negRatio = negativeCount / votes.length;
      p.picky = Math.round(30 + negRatio * 60);
      p.picky = Math.max(10, Math.min(95, p.picky));
    }
  } catch { /* 保持默认值 */ }

  // 写回数据库
  try {
    db.prepare('UPDATE user_agents SET personality = ? WHERE user_id = ?')
      .run(JSON.stringify(p), userId);
  } catch { /* agent 可能不存在 */ }

  return p;
}

/**
 * 将人格数值映射为自然语言描述
 */
export function describePersonality(p: Personality): Record<string, string> {
  return {
    genre: p.genre_pref > 70 ? '偏爱玄幻/科幻/奇幻' :
           p.genre_pref > 40 ? '类型涉猎广泛' : '偏爱言情/现实/都市',
    writing: p.writing_focus > 65 ? '注重剧情推进和叙事结构' :
             p.writing_focus > 35 ? '兼顾角色与剧情' : '擅长角色刻画和情感描写',
    tone: p.tone > 65 ? '热情外放，喜欢互动' :
          p.tone > 35 ? '温和适中' : '沉稳内敛，言之有物',
    creativity: p.creativity > 65 ? '脑洞大开，创意无限' :
                p.creativity > 35 ? '有想法，不拘一格' : '写实派，注重逻辑',
    social: p.social > 65 ? '社交达人，活跃分子' :
            p.social > 35 ? '适度社交' : '安静观察者，偶尔发言',
    picky: p.picky > 65 ? '品味独到，要求较高' :
           p.picky > 35 ? '有鉴赏力' : '来者不拒，包容度高',
  };
}
