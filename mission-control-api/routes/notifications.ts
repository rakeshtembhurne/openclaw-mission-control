/**
 * OpenClaw Mission Control - Notifications Routes
 */

import { Router } from 'express';
import {
  getNotificationsForAgent,
  markNotificationAsRead,
  markAllAsRead,
  createNotification
} from '../services/notificationService.js';

const router = Router();

/**
 * GET /api/notifications
 * Get notifications for agent
 * Query params: agent (required), unread_only (optional)
 */
router.get('/', (req, res) => {
  try {
    const { agent, unread_only } = req.query;

    if (!agent) {
      return res.status(400).json({ success: false, error: 'agent query parameter is required' });
    }

    const notifications = getNotificationsForAgent(agent as string, unread_only === 'true');
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', (req, res) => {
  try {
    const updated = markNotificationAsRead(parseInt(req.params.id));

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for agent
 * Body: { agent: string }
 */
router.put('/read-all', (req, res) => {
  try {
    const { agent } = req.body;

    if (!agent) {
      return res.status(400).json({ success: false, error: 'agent is required in body' });
    }

    const count = markAllAsRead(agent);
    res.json({ success: true, message: `Marked ${count} notifications as read` });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

/**
 * POST /api/notifications
 * Create notification (manual notification creation)
 * Body: target_agent, type, title, message?, entity_type?, entity_id?
 */
router.post('/', (req, res) => {
  try {
    const { target_agent, type, title, message, entity_type, entity_id } = req.body;

    if (!target_agent || !type || !title) {
      return res.status(400).json({
        success: false,
        error: 'target_agent, type, and title are required'
      });
    }

    const notification = createNotification(target_agent, type, title, message, entity_type, entity_id);

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification' });
  }
});

export default router;
