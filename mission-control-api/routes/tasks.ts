/**
 * OpenClaw Mission Control - Tasks Routes
 */

import { Router } from 'express';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats
} from '../services/taskService.js';

const router = Router();

/**
 * GET /api/tasks
 * Get all tasks with optional filters
 * Query params: status, assigned_agent, priority, created_by
 */
router.get('/', (req, res) => {
  try {
    const filters = {
      status: req.query.status as string,
      assigned_agent: req.query.assigned_agent as string,
      priority: req.query.priority as string,
      created_by: req.query.created_by as string,
    };

    const tasks = getAllTasks(filters);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ success: false, error: 'Failed to get tasks' });
  }
});

/**
 * GET /api/tasks/stats
 * Get task statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = getTaskStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting task stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get task stats' });
  }
});

/**
 * GET /api/tasks/:id
 * Get task by ID
 */
router.get('/:id', (req, res) => {
  try {
    const task = getTaskById(parseInt(req.params.id));

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({ success: false, error: 'Failed to get task' });
  }
});

/**
 * POST /api/tasks
 * Create new task
 * Body: title, description?, status?, priority?, assigned_agent?, created_by, due_date?, metadata?
 */
router.post('/', (req, res) => {
  try {
    const { title, description, status, priority, assigned_agent, created_by, due_date, metadata } = req.body;

    if (!title || !created_by) {
      return res.status(400).json({ success: false, error: 'title and created_by are required' });
    }

    const task = createTask({
      title,
      description,
      status,
      priority,
      assigned_agent,
      created_by,
      due_date,
      metadata,
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

/**
 * PUT /api/tasks/:id
 * Update task
 * Body: title?, description?, status?, priority?, assigned_agent?, due_date?, metadata?
 */
router.put('/:id', (req, res) => {
  try {
    const { title, description, status, priority, assigned_agent, due_date, metadata } = req.body;

    const task = updateTask(parseInt(req.params.id), {
      title,
      description,
      status,
      priority,
      assigned_agent,
      due_date,
      metadata,
    });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete('/:id', (req, res) => {
  try {
    const deleted = deleteTask(parseInt(req.params.id));

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

export default router;
