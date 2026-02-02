/**
 * OpenClaw Mission Control - Database Configuration
 *
 * SQLite database connection using Bun's native SQLite (bun:sqlite)
 */

import { Database } from 'bun:sqlite';
import { existsSync } from 'fs';
import { join } from 'path';

// Database path configuration
const DB_PATH = process.env.DB_PATH || join(process.env.HOME || '', '.openclaw/workspace/mission-control/mission-control.db');

/**
 * Get database connection
 */
export function getDatabase(): Database {
  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  // Enable WAL mode for better concurrent access
  db.exec('PRAGMA journal_mode = WAL');

  // Set busy timeout (5 seconds)
  db.exec('PRAGMA busy_timeout = 5000');

  return db;
}

/**
 * Initialize database from schema file
 */
export function initializeDatabase(): void {
  if (existsSync(DB_PATH)) {
    console.log('✅ Database already exists:', DB_PATH);
    return;
  }

  console.log('📄 Initializing database from schema...');

  const schemaPath = join(
    process.env.WORKSPACE_PATH || join(process.env.HOME || '', '.openclaw/workspace/mission-control'),
    '../projects/mission-control/mission-control-core/schema.sql'
  );

  const schema = require('fs').readFileSync(schemaPath, 'utf-8');

  const db = getDatabase();
  db.exec(schema);
  db.close();

  console.log('✅ Database initialized:', DB_PATH);
}

/**
 * Get database path
 */
export function getDatabasePath(): string {
  return DB_PATH;
}
