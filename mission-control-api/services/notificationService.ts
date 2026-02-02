/**
 * OpenClaw Mission Control - Notification Service
 *
 * Business logic for notification operations
 */

import { getDatabase } from '../config/database.js';

export interface Notification {
  id: number;
  target_agent: string;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: number;
  created_at: number;
}

/**
 * Get notifications for agent
 */
export function getNotificationsForAgent(agentName: string, unreadOnly = false): Notification[] {
  const db = getDatabase();

  let query = 'SELECT * FROM notifications WHERE target_agent = ?';
  if (unreadOnly) {
    query += ' AND is_read = 0';
  }
  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const notifications = stmt.all(agentName) as Notification[];
  db.close();
  return notifications;
}

/**
 * Mark notification as read
 */
export function markNotificationAsRead(id: number): boolean {
  const db = getDatabase();

  const stmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?');
  const result = stmt.run(id);

  db.close();
  return result.changes > 0;
}

/**
 * Mark all notifications as read for agent
 */
export function markAllAsRead(agentName: string): number {
  const db = getDatabase();

  const stmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE target_agent = ? AND is_read = 0');
  const result = stmt.run(agentName);

  db.close();
  return result.changes;
}

/**
 * Create notification
 */
export function createNotification(
  targetAgent: string,
  type: string,
  title: string,
  message?: string,
  entityType?: string,
  entityId?: string
): Notification {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO notifications (target_agent, type, title, message, entity_type, entity_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(targetAgent, type, title, message || null, entityType || null, entityId || null);

  const selectStmt = db.prepare('SELECT * FROM notifications WHERE id = ?');
  const notification = selectStmt.get(result.lastInsertRowid) as Notification;

  db.close();
  return notification;
}
