#!/usr/bin/env bun
/**
 * OpenClaw Mission Control - Notification Daemon
 *
 * This script runs continuously (via cron every 2 minutes) to:
 * 1. Scan new messages for @mentions (e.g., @Jarvis, @Shuri)
 * 2. Create notifications in database for mentioned agents
 * 3. Check subscriptions and notify subscribers of activity
 * 4. Process system alerts and notifications
 *
 * Usage: bun notification-daemon.ts
 *
 * This script is designed to be idempotent and safe to run multiple times.
 */

import { Database } from 'bun:sqlite';
import { join } from 'path';

// Configuration
const DB_PATH = process.env.DB_PATH || join(process.env.HOME || '', '.openclaw/workspace/mission-control/mission-control.db');

interface Message {
  id: number;
  thread_id: string;
  agent_name: string;
  content: string;
  created_at: number;
}

interface Agent {
  name: string;
}

interface Subscription {
  agent_name: string;
  target_type: string;
  target_id: string;
}

interface Activity {
  id: number;
  agent_name: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  created_at: number;
}

/**
 * Main notification daemon function
 */
function runNotificationDaemon(): { success: boolean; notificationsCreated: number; message: string } {
  const db = new Database(DB_PATH);
  let notificationsCreated = 0;
  let errorMessage: string | null = null;

  try {
    console.log('🔔 OpenClaw Mission Control - Notification Daemon');
    console.log('===============================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('');

    // Enable foreign keys
    db.exec('PRAGMA foreign_keys = ON');

    // Process @mentions in messages
    const mentionNotifications = processMentions(db);
    notificationsCreated += mentionNotifications;

    // Process subscriptions
    const subscriptionNotifications = processSubscriptions(db);
    notificationsCreated += subscriptionNotifications;

    // Process system alerts (optional)
    const systemNotifications = processSystemAlerts(db);
    notificationsCreated += systemNotifications;

    console.log('');
    console.log(`✅ Notification daemon complete: ${notificationsCreated} notifications created`);

    return {
      success: true,
      notificationsCreated,
      message: `${notificationsCreated} notifications created`
    };

  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error('❌ Error in notification daemon:', errorMessage);

    return {
      success: false,
      notificationsCreated,
      message: errorMessage
    };

  } finally {
    db.close();
  }
}

/**
 * Process @mentions in messages
 */
function processMentions(db: Database.Database): number {
  console.log('📝 Processing @mentions in messages...');

  // Get all agents for validation
  const agentsStmt = db.prepare('SELECT name FROM agents');
  const agents = agentsStmt.all() as Agent[];
  const agentNames = new Set(agents.map(a => a.name.toLowerCase()));

  // Get recent messages that haven't been processed for mentions
  // We check messages created in the last 5 minutes to avoid re-processing
  const cutoffTime = Math.floor(Date.now() / 1000) - 300; // 5 minutes ago
  const messagesStmt = db.prepare(`
    SELECT id, thread_id, agent_name, content, created_at
    FROM messages
    WHERE created_at > ?
    ORDER BY created_at ASC
  `);
  const messages = messagesStmt.all(cutoffTime) as Message[];

  console.log(`   Found ${messages.length} recent messages`);

  let notificationsCreated = 0;

  for (const message of messages) {
    // Find @mentions using regex
    const mentionRegex = /@(\w+)/g;
    const matches = message.content.matchAll(mentionRegex);
    const mentions = Array.from(matches).map(m => m[1]);

    if (mentions.length === 0) continue;

    console.log(`   Message ${message.id}: found ${mentions.length} mention(s)`);

    for (const mention of mentions) {
      // Check if mentioned name is a valid agent
      if (!agentNames.has(mention.toLowerCase())) {
        console.log(`      ❌ "@${mention}" is not a valid agent`);
        continue;
      }

      // Get actual agent name (correct case)
      const actualAgentName = agents.find(a => a.name.toLowerCase() === mention.toLowerCase())!.name;

      // Check if notification already exists
      const existingStmt = db.prepare(`
        SELECT id FROM notifications
        WHERE target_agent = ?
          AND entity_type = 'message'
          AND entity_id = ?
      `);
      const existing = existingStmt.get(actualAgentName, String(message.id));

      if (existing) {
        console.log(`      ℹ️  Notification already exists for @${actualAgentName}`);
        continue;
      }

      // Create notification
      const insertStmt = db.prepare(`
        INSERT INTO notifications (target_agent, type, title, message, entity_type, entity_id)
        VALUES (?, 'mention', ?, ?, 'message', ?)
      `);

      const title = `You were mentioned by ${message.agent_name}`;
      const notificationMessage = message.content.length > 200
        ? message.content.substring(0, 200) + '...'
        : message.content;

      insertStmt.run(actualAgentName, title, notificationMessage, String(message.id));
      notificationsCreated++;

      console.log(`      ✅ Created notification for @${actualAgentName}`);
    }
  }

  console.log(`   Created ${notificationsCreated} mention notifications`);
  return notificationsCreated;
}

/**
 * Process subscriptions
 */
function processSubscriptions(db: Database.Database): number {
  console.log('');
  console.log('📬 Processing subscriptions...');

  let notificationsCreated = 0;

  // Get recent activities (last 5 minutes)
  const cutoffTime = Math.floor(Date.now() / 1000) - 300;
  const activitiesStmt = db.prepare(`
    SELECT id, agent_name, action_type, entity_type, entity_id, created_at
    FROM activities
    WHERE created_at > ?
    ORDER BY created_at ASC
  `);
  const activities = activitiesStmt.all(cutoffTime) as Activity[];

  console.log(`   Found ${activities.length} recent activities`);

  for (const activity of activities) {
    // Find subscribers for this entity
    const subscriptionsStmt = db.prepare(`
      SELECT agent_name FROM subscriptions
      WHERE target_type = ? AND target_id = ?
    `);
    const subscriptions = subscriptionsStmt.all(activity.entity_type, String(activity.entity_id)) as Subscription[];

    if (subscriptions.length === 0) continue;

    console.log(`   Activity ${activity.id}: ${subscriptions.length} subscriber(s)`);

    for (const subscription of subscriptions) {
      // Don't notify the agent who performed the action
      if (subscription.agent_name === activity.agent_name) {
        continue;
      }

      // Check if notification already exists
      const existingStmt = db.prepare(`
        SELECT id FROM notifications
        WHERE target_agent = ?
          AND entity_type = ?
          AND entity_id = ?
      `);
      const existing = existingStmt.get(subscription.agent_name, activity.entity_type, String(activity.entity_id));

      if (existing) {
        continue;
      }

      // Create notification
      const insertStmt = db.prepare(`
        INSERT INTO notifications (target_agent, type, title, message, entity_type, entity_id)
        VALUES (?, 'subscription', ?, ?, ?, ?)
      `);

      const title = `Activity update: ${activity.action_type}`;
      const notificationMessage = `${activity.agent_name} performed ${activity.action_type} on ${activity.entity_type}:${activity.entity_id}`;

      insertStmt.run(
        subscription.agent_name,
        title,
        notificationMessage,
        activity.entity_type,
        String(activity.entity_id)
      );
      notificationsCreated++;

      console.log(`      ✅ Notified ${subscription.agent_name}`);
    }
  }

  console.log(`   Created ${notificationsCreated} subscription notifications`);
  return notificationsCreated;
}

/**
 * Process system alerts
 */
function processSystemAlerts(db: Database.Database): number {
  console.log('');
  console.log('⚠️  Processing system alerts...');

  let notificationsCreated = 0;

  // Check for overdue tasks
  const now = Math.floor(Date.now() / 1000);
  const overdueTasksStmt = db.prepare(`
    SELECT id, title, assigned_agent, due_date
    FROM tasks
    WHERE due_date < ?
      AND status NOT IN ('completed', 'cancelled')
      AND assigned_agent IS NOT NULL
  `);
  const overdueTasks = overdueTasksStmt.all(now);

  console.log(`   Found ${overdueTasks.length} overdue task(s)`);

  for (const task of overdueTasks as any[]) {
    // Check if notification already exists
    const existingStmt = db.prepare(`
      SELECT id FROM notifications
      WHERE target_agent = ?
        AND type = 'alert'
        AND entity_type = 'task'
        AND entity_id = ?
        AND created_at > ?
    `);
    const alertCutoff = now - 86400; // Only alert once per day
    const existing = existingStmt.get(task.assigned_agent, String(task.id), alertCutoff);

    if (existing) {
      continue;
    }

    // Create notification
    const insertStmt = db.prepare(`
      INSERT INTO notifications (target_agent, type, title, message, entity_type, entity_id)
      VALUES (?, 'alert', ?, ?, 'task', ?)
    `);

    const title = '⚠️ Overdue Task Alert';
    const dueDate = new Date(task.due_date * 1000).toISOString();
    const notificationMessage = `Task "${task.title}" was due on ${dueDate}`;

    insertStmt.run(task.assigned_agent, title, notificationMessage, String(task.id));
    notificationsCreated++;

    console.log(`      ✅ Alerted ${task.assigned_agent} about overdue task "${task.title}"`);
  }

  // Check for agents with no recent heartbeat (offline detection)
  const offlineThreshold = now - 3600; // 1 hour ago
  const offlineAgentsStmt = db.prepare(`
    SELECT name, last_heartbeat
    FROM agents
    WHERE last_heartbeat < ?
      OR last_heartbeat IS NULL
  `);
  const offlineAgents = offlineAgentsStmt.all(offlineThreshold);

  console.log(`   Found ${offlineAgents.length} offline agent(s)`);

  // Only notify Jarvis about offline agents (avoid spam)
  if (offlineAgents.length > 0) {
    const jarvisOfflineStmt = db.prepare(`
      SELECT id FROM notifications
      WHERE target_agent = 'Jarvis'
        AND type = 'system'
        AND created_at > ?
    `);
    const existing = jarvisOfflineStmt.get(alertCutoff);

    if (!existing) {
      const offlineNames = offlineAgents.map((a: any) => a.name).join(', ');
      const insertStmt = db.prepare(`
        INSERT INTO notifications (target_agent, type, title, message)
        VALUES (?, 'system', ?, ?)
      `);

      const title = '🔴 Offline Agents Detected';
      const notificationMessage = `The following agents haven't sent a heartbeat in over 1 hour: ${offlineNames}`;

      insertStmt.run('Jarvis', title, notificationMessage);
      notificationsCreated++;

      console.log(`      ✅ Notified Jarvis about offline agents`);
    }
  }

  console.log(`   Created ${notificationsCreated} system alert notifications`);
  return notificationsCreated;
}

// Run notification daemon
const result = runNotificationDaemon();

// Exit with appropriate code
process.exit(result.success ? 0 : 1);
