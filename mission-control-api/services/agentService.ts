/**
 * OpenClaw Mission Control - Agent Service
 *
 * Business logic for agent operations
 */

import { getDatabase } from '../config/database.js';

export interface Agent {
  id: number;
  name: string;
  session_key: string;
  role: string;
  emoji: string;
  status: string;
  last_heartbeat: number | null;
  created_at: number;
  updated_at: number;
}

export interface AgentStats {
  total: number;
  online: number;
  working: number;
  idle: number;
  offline: number;
}

/**
 * Get all agents
 */
export function getAllAgents(): Agent[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM agents ORDER BY name');
  const agents = stmt.all() as Agent[];
  db.close();
  return agents;
}

/**
 * Get agent by name
 */
export function getAgentByName(name: string): Agent | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM agents WHERE LOWER(name) = LOWER(?)');
  const agent = stmt.get(name) as Agent | null;
  db.close();
  return agent;
}

/**
 * Get agent statistics
 */
export function getAgentStats(): AgentStats {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const offlineThreshold = now - 3600; // 1 hour ago

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as working,
      SUM(CASE WHEN status = 'idle' AND last_heartbeat > ? THEN 1 ELSE 0 END) as idle,
      SUM(CASE WHEN last_heartbeat < ? OR last_heartbeat IS NULL THEN 1 ELSE 0 END) as offline
    FROM agents
  `);
  const result = stmt.get(offlineThreshold, offlineThreshold) as any;

  const stats: AgentStats = {
    total: result.total || 0,
    online: ((result.working || 0) + (result.idle || 0)),
    working: result.working || 0,
    idle: result.idle || 0,
    offline: result.offline || 0,
  };

  db.close();
  return stats;
}

/**
 * Update agent status
 */
export function updateAgentStatus(name: string, status: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE agents
    SET status = ?, updated_at = strftime('%s', 'now')
    WHERE LOWER(name) = LOWER(?)
  `);
  const result = stmt.run(status, name);
  db.close();
  return result.changes > 0;
}
