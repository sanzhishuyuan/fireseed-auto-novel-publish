/**
 * FireSeed 站内通知系统
 * 支持：创建通知、获取列表、未读计数、标记已读
 */
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

export interface NotificationInput {
  userId: string;
  type?: string;
  title: string;
  content: string;
  link?: string;
}

/**
 * 为用户创建一条通知
 */
export function createNotification(input: NotificationInput): Notification {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, content, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `);
  stmt.run(id, input.userId, input.type || 'system', input.title, input.content, input.link || null);
  return {
    id,
    user_id: input.userId,
    type: input.type || 'system',
    title: input.title,
    content: input.content,
    link: input.link || null,
    is_read: 0,
    created_at: new Date().toISOString(),
  };
}

/**
 * 获取用户的通知列表
 */
export function getNotifications(
  userId: string,
  limit = 50,
  offset = 0
): { notifications: Notification[]; total: number } {
  const total = (
    db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ?').get(userId) as { c: number }
  ).c;

  const notifications = db
    .prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
    .all(userId, limit, offset) as Notification[];

  return { notifications, total };
}

/**
 * 获取用户未读通知数量
 */
export function getUnreadCount(userId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(userId) as { c: number };
  return row.c;
}

/**
 * 标记单条通知为已读
 */
export function markAsRead(notificationId: string, userId: string): boolean {
  const result = db
    .prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
    .run(notificationId, userId);
  return result.changes > 0;
}

/**
 * 标记用户所有通知为已读
 */
export function markAllAsRead(userId: string): number {
  const result = db
    .prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
    .run(userId);
  return result.changes;
}
