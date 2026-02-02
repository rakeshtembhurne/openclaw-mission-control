/**
 * OpenClaw Mission Control - API Server
 *
 * Express.js server with WebSocket support for real-time updates
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { env } from '../config/environment.js';
import { initializeDatabase } from '../config/database.js';
import agentsRouter from '../routes/agents.js';
import tasksRouter from '../routes/tasks.js';
import notificationsRouter from '../routes/notifications.js';

// Initialize app
const app = express();
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// WebSocket clients
const clients = Set<WebSocket>();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

/**
 * Broadcast message to all connected WebSocket clients
 */
export function broadcast(type: string, data: any) {
  const message = JSON.stringify({ type, data });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API routes
 */
app.use('/api/agents', agentsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/notifications', notificationsRouter);

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

/**
 * Error handler
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

/**
 * WebSocket connection handler
 */
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    data: { message: 'Connected to Mission Control API' }
  }));

  // Handle incoming messages (if needed)
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('WebSocket message:', message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log('WebSocket disconnected');
    clients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

/**
 * Start server
 */
async function start() {
  try {
    // Initialize database
    console.log('Initializing database...');
    initializeDatabase();
    console.log('✅ Database initialized');

    // Start server
    server.listen(env.PORT, () => {
      console.log('');
      console.log('🚀 OpenClaw Mission Control API Server');
      console.log('=======================================');
      console.log(`✅ Server running on port ${env.PORT}`);
      console.log(`📊 HTTP: http://localhost:${env.PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${env.PORT}`);
      console.log(`🏥 Health check: http://localhost:${env.PORT}/health`);
      console.log('');
      console.log('API Endpoints:');
      console.log('  GET  /api/agents          - List all agents');
      console.log('  GET  /api/agents/:name    - Get agent by name');
      console.log('  GET  /api/agents/stats    - Get agent statistics');
      console.log('  GET  /api/tasks           - List all tasks');
      console.log('  GET  /api/tasks/:id       - Get task by ID');
      console.log('  POST /api/tasks           - Create new task');
      console.log('  PUT  /api/tasks/:id       - Update task');
      console.log('  GET  /api/notifications   - Get notifications');
      console.log('  PUT  /api/notifications/:id/read - Mark as read');
      console.log('');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, closing server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
start();

export { app, server, wss };
