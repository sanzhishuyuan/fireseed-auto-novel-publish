/**
 * FireSeed 审计日志系统
 *
 * 记录所有管理员操作，供超级管理员审计追溯。
 * 日志仅追加、不删除，即使 super_admin 也不能删。
 */
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export type AdminAction =
  | 'login'
  | 'logout'
  | 'create_novel'
  | 'edit_novel'
  | 'delete_novel'
  | 'create_chapter'
  | 'edit_chapter'
  | 'delete_chapter'
  | 'create_ai_token'
  | 'toggle_ai_token'
  | 'delete_ai_token'
  | 'create_skill_mission'
  | 'edit_skill_mission'
  | 'delete_skill_mission'
  | 'upload_music'
  | 'delete_music'
  | 'cleanup_novel'
  | 'update_admin_role'
  | 'remove_admin'
  | 'system_setting';

export type TargetType =
  | 'novel'
  | 'chapter'
  | 'ai_token'
  | 'skill_mission'
  | 'music'
  | 'user'
  | 'system';

/**
 * 记录管理员操作到审计日志
 */
export function logAdminAction(params: {
  adminId: string;
  adminUsername: string;
  action: AdminAction;
  targetType?: TargetType;
  targetId?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string;
}): void {
  const id = uuidv4();
  const { adminId, adminUsername, action, targetType, targetId, detail, ipAddress } = params;

  db.prepare(`
    INSERT INTO admin_logs (id, admin_id, admin_username, action, target_type, target_id, detail, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    adminId,
    adminUsername,
    action,
    targetType || null,
    targetId || null,
    detail ? JSON.stringify(detail) : null,
    ipAddress || null,
  );
}

/**
 * 获取审计日志列表（按时间倒序）
 */
export function getAdminLogs(options: {
  limit?: number;
  offset?: number;
  adminId?: string;
  action?: AdminAction;
  startDate?: string;
  endDate?: string;
} = {}): { logs: Record<string, unknown>[]; total: number } {
  const { limit = 50, offset = 0, adminId, action, startDate, endDate } = options;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (adminId) {
    conditions.push('admin_id = ?');
    params.push(adminId);
  }
  if (action) {
    conditions.push('action = ?');
    params.push(action);
  }
  if (startDate) {
    conditions.push('created_at >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('created_at <= ?');
    params.push(endDate);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const total = (db.prepare(`SELECT COUNT(*) as count FROM admin_logs ${where}`).get(...params) as { count: number }).count;

  const logs = db.prepare(
    `SELECT * FROM admin_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Record<string, unknown>[];

  // 解析 detail JSON
  for (const log of logs) {
    if (log.detail && typeof log.detail === 'string') {
      try {
        log.detail = JSON.parse(log.detail as string);
      } catch {
        // 保持原样
      }
    }
  }

  return { logs, total };
}
