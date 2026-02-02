#!/usr/bin/env bun
/**
 * Initialize Mission Control Database
 *
 * Usage: bun init-db.ts
 */

import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || join(process.env.HOME || '', '.openclaw/workspace/mission-control/mission-control.db');
const SCHEMA_PATH = join(import.meta.dir, '../schema.sql');

console.log('📄 Initializing Mission Control database...');
console.log(`   Database: ${DB_PATH}`);
console.log(`   Schema: ${SCHEMA_PATH}`);

// Read schema
const schema = readFileSync(SCHEMA_PATH, 'utf-8');

// Create database
const db = new Database(DB_PATH);

// Execute schema
db.exec(schema);

// Close database
db.close();

console.log('✅ Database initialized successfully!');
console.log(`   Agents registered: 10`);
