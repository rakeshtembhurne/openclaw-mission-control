/**
 * OpenClaw Mission Control - Task Service
 *
 * Business logic for task operations
 */

import { getDatabase } from '../config/database.js';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_agent: string | null;
  created_by: string;
  due_date: number | null;
  completed_at: number | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigned_agent?: string;
  created_by: string;
  due_date?: number;
  metadata?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigned_agent?: string;
  due_date?: number;
  metadata?: string;
}

export interface TaskFilters {
  status?: string;
  assigned_agent?: string;
  priority?: string;
  created_by?: string;
}

/**
 * Get all tasks with optional filters
 */
export function getAllTasks(filters?: TaskFilters): Task[] {
  const db = getDatabase();

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: any[] = [];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters?.assigned_agent) {
    query += ' AND assigned_agent = ?';
    params.push(filters.assigned_agent);
  }

  if (filters?.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }

  if (filters?.created_by) {
    query += ' AND created_by = ?';
    params.push(filters.created_by);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const tasks = stmt.all(...params) as Task[];
  db.close();
  return tasks;
}

/**
 * Get task by ID
 */
export function getTaskById(id: number): Task | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const task = stmt.get(id) as Task | null;
  db.close();
  return task;
}

/**
 * Create new task
 */
export function createTask(input: CreateTaskInput): Task {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, assigned_agent, created_by, due_date, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.title,
    input.description || null,
    input.status || 'pending',
    input.priority || 'medium',
    input.assigned_agent || null,
    input.created_by,
    input.due_date || null,
    input.metadata || null
  );

  // Log activity
  const activityStmt = db.prepare(`
    INSERT INTO activities (agent_name, action_type, entity_type, entity_id, description)
    VALUES (?, 'task_created', 'task', ?, ?)
  `);
  activityStmt.run(input.created_by, String(result.lastInsertRowid), `Created task: ${input.title}`);

  // Get the created task
  const selectStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const task = selectStmt.get(result.lastInsertRowid) as Task;

  db.close();
  return task;
}

/**
 * Update task
 */
export function updateTask(id: number, input: UpdateTaskInput): Task | null {
  const db = getDatabase();

  // Get current task
  const currentStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const current = currentStmt.get(id) as Task | null;

  if (!current) {
    db.close();
    return null;
  }

  // Build update query
  const updates: string[] = [];
  const params: any[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    params.push(input.title);
  }

  if (input.description !== undefined) {
    updates.push('description = ?');
    params.push(input.description);
  }

  if (input.status !== undefined) {
    updates.push('status = ?');
    params.push(input.status);

    // Set completed_at if status is 'completed'
    if (input.status === 'completed' && !current.completed_at) {
      updates.push('completed_at = ?');
      params.push(Math.floor(Date.now() / 1000));
    }
  }

  if (input.priority !== undefined) {
    updates.push('priority = ?');
    params.push(input.priority);
  }

  if (input.assigned_agent !== undefined) {
    updates.push('assigned_agent = ?');
    params.push(input.assigned_agent);
  }

  if (input.due_date !== undefined) {
    updates.push('due_date = ?');
    params.push(input.due_date);
  }

  if (input.metadata !== undefined) {
    updates.push('metadata = ?');
    params.push(input.metadata);
  }

  if (updates.length === 0) {
    db.close();
    return current;
  }

  updates.push('updated_at = strftime(\'%s\', \'now\')');
  params.push(id);

  const updateStmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
  updateStmt.run(...params);

  // Log activity
  const activityStmt = db.prepare(`
    INSERT INTO activities (agent_name, action_type, entity_type, entity_id, description)
    VALUES (?, 'task_updated', 'task', ?, ?)
  `);
  activityStmt.run('system', String(id), `Updated task: ${current.title}`);

  // Get updated task
  const selectStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const updated = selectStmt.get(id) as Task;

  db.close();
  return updated;
}

/**
 * Delete task
 */
export function deleteTask(id: number): boolean {
  const db = getDatabase();

  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  const result = stmt.run(id);

  db.close();
  return result.changes > 0;
}

/**
 * Get task statistics
 */
export function getTaskStats(): any {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
      SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high
    FROM tasks
  `);
  const stats = stmt.get();

  db.close();
  return stats;
}
