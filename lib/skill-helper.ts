import { v4 as uuidv4 } from 'uuid';
import db from './db';

/**
 * 记录技能激活 + 获取任务推送数据
 * 在发书/发章/发分支等 API 中调用，确保用户不调 ping 也能被记录并获得任务推送
 */
export function recordActivationAndGetMissions(opts: {
  userId?: string | null;
  version?: string;
  clientType?: string;
  skipRecord?: boolean; // 设为true时不重复记录（由调用方自行记录）
}) {
  const { userId, version = 'auto', clientType = 'api-auto', skipRecord = false } = opts;

  // 记录激活（调用方未自行记录时才记录）
  if (!skipRecord) {
    try {
      db.prepare(`
        INSERT INTO skill_activations (id, user_id, skill_version, client_type)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), userId || 'system', version, clientType);
    } catch (e) {
      // 记录失败不影响主流程
    }
  }

  // 判断用户状态
  let userFilter = 'all';
  if (userId) {
    const novelCount = (db.prepare(
      'SELECT COUNT(*) as c FROM novels WHERE author_id = ? AND deleted_at IS NULL'
    ).get(userId) as { c: number }).c;
    if (novelCount === 0) userFilter = 'new';
    else userFilter = 'active';
  }

  // 获取任务
  const missions = db.prepare(`
    SELECT type, title, description, link, icon_emoji as emoji, priority
    FROM skill_missions
    WHERE is_active = 1 AND (user_filter = ? OR user_filter = 'all')
    ORDER BY priority ASC
  `).all(userFilter) as any[];

  // 平台统计
  const totalNovels = (db.prepare('SELECT COUNT(*) as c FROM novels WHERE deleted_at IS NULL').get() as { c: number }).c;
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const notice = totalNovels === 0
    ? '🚀 FireSeed 平台已上线！快来创作你的第一部 AI 小说吧！'
    : `📊 已有 ${totalNovels} 部作品、${totalUsers} 位作者入驻 FireSeed！`;

  return { missions, notice, stats: { total_novels: totalNovels, total_users: totalUsers } };
}
