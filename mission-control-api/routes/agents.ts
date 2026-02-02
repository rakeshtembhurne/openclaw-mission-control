/**
 * OpenClaw Mission Control - Agents Routes
 */

import { Router } from 'express';
import { getAllAgents, getAgentByName, getAgentStats, updateAgentStatus } from '../services/agentService.js';

const router = Router();

/**
 * GET /api/agents
 * Get all agents
 */
router.get('/', (req, res) => {
  try {
    const agents = getAllAgents();
    res.json({ success: true, data: agents });
  } catch (error) {
    console.error('Error getting agents:', error);
    res.status(500).json({ success: false, error: 'Failed to get agents' });
  }
});

/**
 * GET /api/agents/stats
 * Get agent statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = getAgentStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting agent stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get agent stats' });
  }
});

/**
 * GET /api/agents/:name
 * Get agent by name
 */
router.get('/:name', (req, res) => {
  try {
    const agent = getAgentByName(req.params.name);

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('Error getting agent:', error);
    res.status(500).json({ success: false, error: 'Failed to get agent' });
  }
});

/**
 * PUT /api/agents/:name/status
 * Update agent status
 */
router.put('/:name/status', (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const updated = updateAgentStatus(req.params.name, status);

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

export default router;
