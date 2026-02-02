#!/usr/bin/env bun
/**
 * OpenClaw Mission Control - Daily Standup Generator
 *
 * This script generates a daily standup summary at 11:30 PM IST:
 * 1. Queries database for today's activities
 * 2. Counts tasks completed and created
 * 3. Lists active agents and their actions
 * 4. Shows pending high-priority tasks
 * 5. Generates formatted Markdown summary
 * 6. Saves to memory/YYYY-MM-DD.md file
 * 7. Stores summary in daily_summaries table
 * 8. Sends via Telegram (if configured)
 *
 * Usage: bun daily-standup.ts
 *
 * Cron entry: 30 23 * * * bun /path/to/daily-standup.ts
 */

import { Database } from 'bun:sqlite';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Configuration
const DB_PATH = process.env.DB_PATH || join(process.env.HOME || '', '.openclaw/workspace/mission-control/mission-control.db');
const MEMORY_PATH = process.env.MEMORY_PATH || join(process.env.HOME || '', '.openclaw/workspace/mission-control/shared/memory');

interface Agent {
  id: number;
  name: string;
  role: string;
  emoji: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  assigned_agent: string | null;
  completed_at: number | null;
  created_at: number;
}

interface Activity {
  id: number;
  agent_name: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  description: string | null;
  created_at: number;
}

interface DailySummary {
  date: string;
  summary_text: string;
  tasks_completed: number;
  tasks_created: number;
  active_agents: number;
  metadata: string;
}

/**
 * Main daily standup function
 */
function generateDailyStandup(): { success: boolean; message: string } {
  const db = new Database(DB_PATH);

  try {
    console.log('📋 OpenClaw Mission Control - Daily Standup Generator');
    console.log('=================================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('');

    // Enable foreign keys
    db.exec('PRAGMA foreign_keys = ON');

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = Math.floor(new Date(today).getTime() / 1000);
    const endOfDay = startOfDay + 86400; // 24 hours later

    console.log(`📅 Date: ${today}`);
    console.log('');

    // Get all agents
    const agentsStmt = db.prepare('SELECT * FROM agents ORDER BY name');
    const agents = agentsStmt.all() as Agent[];

    // Get today's completed tasks
    const completedTasksStmt = db.prepare(`
      SELECT * FROM tasks
      WHERE completed_at >= ? AND completed_at < ?
      ORDER BY completed_at DESC
    `);
    const completedTasks = completedTasksStmt.all(startOfDay, endOfDay) as Task[];

    // Get today's created tasks
    const createdTasksStmt = db.prepare(`
      SELECT * FROM tasks
      WHERE created_at >= ? AND created_at < ?
      ORDER BY created_at DESC
    `);
    const createdTasks = createdTasksStmt.all(startOfDay, endOfDay) as Task[];

    // Get today's activities
    const activitiesStmt = db.prepare(`
      SELECT * FROM activities
      WHERE created_at >= ? AND created_at < ?
      ORDER BY created_at DESC
    `);
    const activities = activitiesStmt.all(startOfDay, endOfDay) as Activity[];

    // Get pending high-priority and critical tasks
    const pendingTasksStmt = db.prepare(`
      SELECT * FROM tasks
      WHERE priority IN ('high', 'critical')
        AND status NOT IN ('completed', 'cancelled')
      ORDER BY priority DESC, created_at ASC
    `);
    const pendingTasks = pendingTasksStmt.all() as Task[];

    // Count active agents (agents with activities today)
    const activeAgentNames = new Set(activities.map(a => a.agent_name));
    const activeAgents = agents.filter(a => activeAgentNames.has(a.name));

    // Count activities per agent
    const agentActivityCounts = new Map<string, number>();
    activities.forEach(activity => {
      const count = agentActivityCounts.get(activity.agent_name) || 0;
      agentActivityCounts.set(activity.agent_name, count + 1);
    });

    // Generate summary
    console.log('📊 Today\'s Stats:');
    console.log(`   ✅ Tasks Completed: ${completedTasks.length}`);
    console.log(`   🆕 Tasks Created: ${createdTasks.length}`);
    console.log(`   🤖 Active Agents: ${activeAgents.length}`);
    console.log('');

    // Build markdown summary
    let markdown = `📋 **Mission Control Daily Standup**\n`;
    markdown += `📅 ${today}\n\n`;

    // Stats section
    markdown += `## 📊 Today's Stats\n\n`;
    markdown += `- ✅ Tasks Completed: ${completedTasks.length}\n`;
    markdown += `- 🆕 Tasks Created: ${createdTasks.length}\n`;
    markdown += `- 🤖 Active Agents: ${activeAgents.length}\n\n`;

    // Completed tasks section
    if (completedTasks.length > 0) {
      markdown += `## ✅ Tasks Completed\n\n`;
      completedTasks.forEach((task, index) => {
        const agent = task.assigned_agent ? `[${task.assigned_agent}] ` : '';
        markdown += `${index + 1}. ${agent}${task.title}\n`;
      });
      markdown += `\n`;
    }

    // New tasks section
    if (createdTasks.length > 0) {
      markdown += `## 🆕 New Tasks\n\n`;
      createdTasks.slice(0, 10).forEach((task, index) => {
        const priority = task.priority.toUpperCase();
        const agent = task.assigned_agent ? ` (${task.assigned_agent})` : '';
        markdown += `- [${priority}] ${task.title}${agent}\n`;
      });
      if (createdTasks.length > 10) {
        markdown += `- ... and ${createdTasks.length - 10} more\n`;
      }
      markdown += `\n`;
    }

    // Agent activity section
    if (activeAgents.length > 0) {
      markdown += `## 🤖 Agent Activity\n\n`;
      activeAgents.forEach(agent => {
        const count = agentActivityCounts.get(agent.name) || 0;
        markdown += `- ${agent.emoji} **${agent.name}**: ${count} action${count !== 1 ? 's' : ''}\n`;
      });
      markdown += `\n`;
    }

    // High priority tasks section
    if (pendingTasks.length > 0) {
      markdown += `## ⚠️ High Priority Tasks\n\n`;
      pendingTasks.slice(0, 10).forEach((task, index) => {
        const priority = task.priority.toUpperCase();
        const agent = task.assigned_agent ? ` (${task.assigned_agent})` : '';
        markdown += `${index + 1}. [${priority}] ${task.title}${agent}\n`;
      });
      if (pendingTasks.length > 10) {
        markdown += `... and ${pendingTasks.length - 10} more\n`;
      }
      markdown += `\n`;
    }

    // Footer
    markdown += `---\n`;
    markdown += `*Generated by Mission Control at ${new Date().toISOString()}*\n`;

    // Save to memory file
    const memoryDir = MEMORY_PATH;
    if (!existsSync(memoryDir)) {
      require('fs').mkdirSync(memoryDir, { recursive: true });
    }

    const memoryFile = join(memoryDir, `${today}.md`);
    writeFileSync(memoryFile, markdown, 'utf-8');
    console.log(`💾 Saved to: ${memoryFile}`);

    // Store in database
    const metadata = JSON.stringify({
      active_agents: activeAgents.map(a => ({ name: a.name, role: a.role, emoji: a.emoji })),
      agent_activity_counts: Object.fromEntries(agentActivityCounts),
      completed_tasks_count: completedTasks.length,
      created_tasks_count: createdTasks.length,
      pending_high_priority_count: pendingTasks.length,
    });

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO daily_summaries (date, summary_text, tasks_completed, tasks_created, active_agents, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(
      today,
      markdown,
      completedTasks.length,
      createdTasks.length,
      activeAgents.length,
      metadata
    );
    console.log('✅ Saved to database');

    // Telegram integration (optional)
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (telegramBotToken && telegramChatId) {
      console.log('');
      console.log('📤 Sending to Telegram...');
      // TODO: Implement Telegram sending
      console.log('⚠️  Telegram integration not yet implemented');
    }

    console.log('');
    console.log('✅ Daily standup generated successfully!');

    return {
      success: true,
      message: `Daily standup generated: ${completedTasks.length} completed, ${createdTasks.length} created, ${activeAgents.length} active agents`
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error('❌ Error generating daily standup:', errorMessage);

    return {
      success: false,
      message: errorMessage
    };

  } finally {
    db.close();
  }
}

// Run daily standup
const result = generateDailyStandup();

// Exit with appropriate code
process.exit(result.success ? 0 : 1);
