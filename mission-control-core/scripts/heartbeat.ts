#!/usr/bin/env bun
/**
 * OpenClaw Mission Control - Agent Heartbeat Script
 *
 * This script is called by cron every 15 minutes (staggered per agent).
 * It:
 * 1. Loads agent configuration from database
 * 2. Checks for pending tasks assigned to agent
 * 3. Processes unread notifications
 * 4. Updates agent status and heartbeat timestamp
 * 5. Logs activity to database
 * 6. Reads/writes WORKING.md file for context persistence
 *
 * Usage: bun heartbeat.ts <agent_name>
 * Example: bun heartbeat.ts jarvis
 *
 * Exit codes:
 * - 0: Success (work done or HEARTBEAT_OK)
 * - 1: Error occurred
 */

import Database from 'better-sqlite3';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface Agent {
  id: number;
  name: string;
  session_key: string;
  role: string;
  emoji: string;
  status: string;
  last_heartbeat: number | null;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_agent: string | null;
  created_by: string;
  due_date: number | null;
  metadata: string | null;
}

interface Notification {
  id: number;
  target_agent: string;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
}

// Configuration
const DB_PATH = process.env.DB_PATH || join(process.env.HOME || '', '.openclaw/workspace/mission-control/mission-control.db');
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || join(process.env.HOME || '', '.openclaw/workspace/mission-control');

// Get agent name from command line
const AGENT_NAME = process.argv[2]?.toLowerCase();

if (!AGENT_NAME) {
  console.error('❌ Error: Agent name required');
  console.error('Usage: bun heartbeat.ts <agent_name>');
  process.exit(1);
}

/**
 * Main heartbeat function
 */
function heartbeat(agentName: string): { success: boolean; heartbeatOk: boolean; message: string } {
  const db = new Database(DB_PATH, { readonly: false });
  let tasksChecked = 0;
  let notificationsProcessed = 0;
  let errorMessage: string | null = null;

  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Load agent configuration
    const agent = getAgent(db, agentName);
    if (!agent) {
      throw new Error(`Agent "${agentName}" not found in database`);
    }

    console.log(`🤖 ${agent.emoji} Heartbeat for ${agent.name} (${agent.role})`);
    console.log(`   Status: ${agent.status}`);
    console.log(`   Last heartbeat: ${agent.last_heartbeat ? new Date(agent.last_heartbeat * 1000).toISOString() : 'Never'}`);

    // Check for pending tasks
    const pendingTasks = getPendingTasks(db, agent.name);
    tasksChecked = pendingTasks.length;

    if (pendingTasks.length > 0) {
      console.log(`\n📋 Found ${pendingTasks.length} pending task(s):`);
      pendingTasks.forEach((task, index) => {
        console.log(`   ${index + 1}. [${task.priority.toUpperCase()}] ${task.title}`);
        if (task.description) {
          console.log(`      ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`);
        }
      });
    } else {
      console.log(`\n✅ No pending tasks`);
    }

    // Process unread notifications
    const notifications = getUnreadNotifications(db, agent.name);
    notificationsProcessed = notifications.length;

    if (notifications.length > 0) {
      console.log(`\n🔔 Found ${notifications.length} unread notification(s):`);
      notifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. [${notif.type}] ${notif.title}`);
        if (notif.message) {
          console.log(`      ${notif.message.substring(0, 100)}${notif.message.length > 100 ? '...' : ''}`);
        }
      });

      // Mark notifications as read
      markNotificationsAsRead(db, notifications.map(n => n.id));
      console.log(`   ✅ Marked as read`);
    } else {
      console.log(`\n✅ No unread notifications`);
    }

    // Update agent status and heartbeat
    const newStatus = pendingTasks.length > 0 ? 'working' : 'idle';
    updateAgentHeartbeat(db, agent.name, newStatus);

    // Log heartbeat to database
    logHeartbeat(db, agent.name, 'success', tasksChecked, notificationsProcessed, null);

    // Update WORKING.md file
    updateWorkingFile(agent.name, pendingTasks, notifications);

    // Determine if heartbeat is OK (no work to do)
    const heartbeatOk = pendingTasks.length === 0 && notifications.length === 0;

    if (heartbeatOk) {
      console.log(`\n✨ HEARTBEAT_OK: No work to do`);
    } else {
      console.log(`\n✅ Heartbeat complete: ${tasksChecked} tasks checked, ${notificationsProcessed} notifications processed`);
    }

    return {
      success: true,
      heartbeatOk,
      message: `${tasksChecked} tasks checked, ${notificationsProcessed} notifications processed`
    };

  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error during heartbeat:`, errorMessage);

    // Log error to database
    try {
      const logStmt = db.prepare(`
        INSERT INTO heartbeat_logs (agent_name, status, tasks_checked, notifications_processed, error_message)
        VALUES (?, 'error', ?, ?, ?)
      `);
      logStmt.run(AGENT_NAME, tasksChecked, notificationsProcessed, errorMessage);
    } catch (logError) {
      // Ignore logging errors
    }

    return {
      success: false,
      heartbeatOk: false,
      message: errorMessage
    };

  } finally {
    db.close();
  }
}

/**
 * Get agent from database
 */
function getAgent(db: Database.Database, agentName: string): Agent | null {
  const stmt = db.prepare(`
    SELECT * FROM agents WHERE LOWER(name) = LOWER(?)
  `);
  return stmt.get(agentName) as Agent | null;
}

/**
 * Get pending tasks for agent
 */
function getPendingTasks(db: Database.Database, agentName: string): Task[] {
  const stmt = db.prepare(`
    SELECT * FROM tasks
    WHERE assigned_agent = ?
      AND status IN ('pending', 'in_progress')
    ORDER BY priority DESC, created_at ASC
  `);
  return stmt.all(agentName) as Task[];
}

/**
 * Get unread notifications for agent
 */
function getUnreadNotifications(db: Database.Database, agentName: string): Notification[] {
  const stmt = db.prepare(`
    SELECT * FROM notifications
    WHERE target_agent = ?
      AND is_read = 0
    ORDER BY created_at ASC
  `);
  return stmt.all(agentName) as Notification[];
}

/**
 * Mark notifications as read
 */
function markNotificationsAsRead(db: Database.Database, notificationIds: number[]): void {
  if (notificationIds.length === 0) return;

  const stmt = db.prepare(`
    UPDATE notifications SET is_read = 1 WHERE id = ?
  `);

  const updateMany = db.transaction((ids: number[]) => {
    for (const id of ids) {
      stmt.run(id);
    }
  });

  updateMany(notificationIds);
}

/**
 * Update agent heartbeat timestamp and status
 */
function updateAgentHeartbeat(db: Database.Database, agentName: string, status: string): void {
  const stmt = db.prepare(`
    UPDATE agents
    SET last_heartbeat = strftime('%s', 'now'),
        status = ?,
        updated_at = strftime('%s', 'now')
    WHERE LOWER(name) = LOWER(?)
  `);
  stmt.run(status, agentName);
}

/**
 * Log heartbeat to database
 */
function logHeartbeat(
  db: Database.Database,
  agentName: string,
  status: string,
  tasksChecked: number,
  notificationsProcessed: number,
  errorMessage: string | null
): void {
  const stmt = db.prepare(`
    INSERT INTO heartbeat_logs (agent_name, status, tasks_checked, notifications_processed, error_message)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(agentName, status, tasksChecked, notificationsProcessed, errorMessage);
}

/**
 * Update WORKING.md file for agent
 */
function updateWorkingFile(
  agentName: string,
  pendingTasks: Task[],
  notifications: Notification[]
): void {
  const agentDir = join(WORKSPACE_PATH, 'agents', agentName.toLowerCase());

  // Create directory if it doesn't exist
  if (!existsSync(agentDir)) {
    require('fs').mkdirSync(agentDir, { recursive: true });
  }

  const workingFile = join(agentDir, 'WORKING.md');
  const now = new Date().toISOString();

  let content = `# WORKING - ${agentName}\n\n`;
  content += `> Last updated: ${now}\n\n`;
  content += `## Status\n\n`;
  content += `- **Current Status**: ${pendingTasks.length > 0 ? 'Working' : 'Idle'}\n`;
  content += `- **Pending Tasks**: ${pendingTasks.length}\n`;
  content += `- **Unread Notifications**: ${notifications.length}\n\n`;

  if (pendingTasks.length > 0) {
    content += `## Current Tasks\n\n`;
    pendingTasks.forEach((task, index) => {
      content += `${index + 1}. **[${task.priority.toUpperCase()}]** ${task.title}\n`;
      if (task.description) {
        content += `   - ${task.description}\n`;
      }
      if (task.due_date) {
        const dueDate = new Date(task.due_date * 1000);
        content += `   - Due: ${dueDate.toISOString()}\n`;
      }
      content += `\n`;
    });
  }

  if (notifications.length > 0) {
    content += `## Recent Notifications\n\n`;
    notifications.forEach((notif, index) => {
      content += `${index + 1}. **[${notif.type}]** ${notif.title}\n`;
      if (notif.message) {
        content += `   - ${notif.message}\n`;
      }
      content += `\n`;
    });
  }

  content += `## Recent Activity\n\n`;
  content += `*Heartbeat runs every 15 minutes. This file is updated automatically.*\n`;

  writeFileSync(workingFile, content, 'utf-8');
}

// Run heartbeat
const result = heartbeat(AGENT_NAME);

// Exit with appropriate code
if (result.heartbeatOk) {
  process.exit(0); // HEARTBEAT_OK
} else if (result.success) {
  process.exit(0); // Success with work done
} else {
  process.exit(1); // Error
}
