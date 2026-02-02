# OpenClaw Mission Control

A multi-agent coordination system for OpenClaw that transforms a single gateway into an army of specialized agents working 24/7.

## Overview

Mission Control enables 10 specialized AI agents to coordinate tasks, share information through a centralized SQLite database, and communicate via @mentions and subscriptions. The system includes:

- **10 Specialized Agents** - Jarvis, Shuri, Fury, Vision, Loki, Quill, Wanda, Pepper, Friday, Wong
- **SQLite Database** - Shared task, message, and activity management
- **Express.js API** - RESTful API with WebSocket support
- **React Dashboard** - Real-time Kanban board and agent monitoring
- **Heartbeat System** - 15-minute staggered cycles keep agents active
- **Daily Standup** - Automated daily summaries at 11:30 PM IST

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mission Control                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Jarvis    │  │   Shuri     │  │   Fury      │         │
│  │  Orchestr.  │  │  Engineer   │  │  Director   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          │                                   │
│                  ┌───────▼────────┐                          │
│                  │  SQLite Database│                          │
│                  │  - Tasks        │                          │
│                  │  - Messages     │                          │
│                  │  - Notifications│                          │
│                  └───────┬────────┘                          │
│                          │                                   │
│         ┌────────────────┴────────────────┐                  │
│         │                                  │                  │
│  ┌──────▼──────┐                   ┌──────▼──────┐           │
│  │ Express API │                   │ React UI    │           │
│  │ + WebSocket │                   │ Dashboard   │           │
│  └─────────────┘                   └─────────────┘           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Bun runtime ([install](https://bun.sh))
- SQLite3
- Node.js 18+ (for some tools)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/nisheeth/openclaw-mission-control
cd openclaw-mission-control

# 2. Run deployment script
chmod +x deployment/deploy.sh
./deployment/deploy.sh

# 3. Start API server
cd mission-control-api
bun run dev

# 4. Start UI (optional)
cd mission-control-ui
bun run dev
```

The deployment script will:
- Create directory structure
- Initialize SQLite database with 10 agents
- Install dependencies
- Set up environment files
- Configure cron jobs

### Manual Setup

If you prefer manual setup:

```bash
# 1. Create directories
mkdir -p ~/.openclaw/workspace/mission-control/{agents,shared/{memory,documents}}

# 2. Initialize database
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  < mission-control-core/schema.sql

# 3. Install dependencies
cd mission-control-core && bun install
cd ../mission-control-api && bun install
cd ../mission-control-ui && bun install

# 4. Setup cron jobs
chmod +x deployment/setup-cron.sh
./deployment/setup-cron.sh
```

## Components

### 1. Mission Control Core

Backend scripts and database schema.

**Location**: `mission-control-core/`

**Scripts**:
- `scripts/heartbeat.ts` - Agent coordination (runs every 15 min)
- `scripts/notification-daemon.ts` - @mention monitoring (runs every 2 min)
- `scripts/daily-standup.ts` - Daily summary generator (runs at 11:30 PM)

**Schema**: `schema.sql` - 9 tables for agents, tasks, messages, activities, etc.

### 2. Mission Control API

Express.js server with WebSocket support.

**Location**: `mission-control-api/`

**Endpoints**:
- `GET /health` - Health check
- `GET /api/agents` - List all agents
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read

**Start**: `bun run dev` (dev) or `bun run build && bun run start` (prod)

### 3. Mission Control UI

React dashboard with Tailwind CSS.

**Location**: `mission-control-ui/`

**Features**:
- Agent status cards
- Kanban task board (drag-and-drop)
- Real-time updates via WebSocket
- Activity feed

**Start**: `bun run dev` (access at http://localhost:5173)

## Agent Roles

| Agent | Role | Emoji | Specialization |
|-------|------|-------|----------------|
| Jarvis | Orchestrator | 🤖 | Main coordinator |
| Shuri | Engineer | 🔬 | Technical implementation |
| Fury | Director | 🎯 | Strategy and planning |
| Vision | Analyst | 📊 | Data analysis |
| Loki | Creative | 🎭 | Marketing and content |
| Quill | Researcher | 🔍 | Deep research |
| Wanda | Optimizer | ⚡ | Performance optimization |
| Pepper | Manager | 💼 | Operations |
| Friday | Assistant | 📅 | Scheduling and reminders |
| Wong | Librarian | 📚 | Documentation |

## Usage Examples

### Create a Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement feature X",
    "description": "Add feature X to the product",
    "priority": "high",
    "assigned_agent": "Shuri",
    "created_by": "Rocky"
  }'
```

### Query Database

```bash
# View all agents
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "SELECT name, role, status FROM agents;"

# View pending tasks
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "SELECT * FROM tasks WHERE status = 'pending';"

# View recent heartbeat logs
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "SELECT * FROM heartbeat_logs ORDER BY timestamp DESC LIMIT 10;"
```

### Send @mention

Agents can @mention each other in messages:

```json
{
  "thread_id": "task-123",
  "agent_name": "Jarvis",
  "content": "@Shuri Can you look at this task?",
  "mentions": ["@Shuri"]
}
```

The notification daemon will create a notification for Shuri.

## Development

### Project Structure

```
openclaw-mission-control/
├── mission-control-core/      # Backend scripts
│   ├── scripts/
│   │   ├── heartbeat.ts
│   │   ├── notification-daemon.ts
│   │   └── daily-standup.ts
│   ├── config/
│   │   ├── agents.json
│   │   └── deployment.config.json
│   ├── schema.sql
│   └── package.json
│
├── mission-control-api/       # Express API
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   ├── services/
│   │   └── config/
│   └── package.json
│
├── mission-control-ui/        # React UI
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── index.html
│   └── package.json
│
└── deployment/                # Deployment scripts
    ├── deploy.sh
    ├── setup-cron.sh
    └── systemd/
```

### Adding a New Agent

1. Update `mission-control-core/config/agents.json`
2. Add agent to `schema.sql` INSERT statement
3. Update cron jobs in `deployment/setup-cron.sh`
4. Re-run deployment script

### Customizing Agent Behavior

Each agent has a WORKING.md file in their workspace directory:

```
~/.openclaw/workspace/mission-control/agents/jarvis/WORKING.md
```

This file is automatically updated by the heartbeat script.

## Troubleshooting

### Database Locked

```bash
# Enable WAL mode
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "PRAGMA journal_mode=WAL;"
```

### Agents Not Waking Up

```bash
# Check cron jobs
crontab -l | grep heartbeat

# Test heartbeat manually
bun ~/.openclaw/workspace/scripts/heartbeat.ts jarvis

# Check logs
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "SELECT * FROM heartbeat_logs ORDER BY timestamp DESC LIMIT 10;"
```

### API Server Not Starting

```bash
# Check if port is in use
lsof -i :3000

# Check database path
cat ~/.openclaw/workspace/projects/openclaw-mission-control/mission-control-api/.env

# Start manually
cd ~/.openclaw/workspace/projects/openclaw-mission-control/mission-control-api
bun run dev
```

## License

MIT

## Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

## Support

For issues and questions, please open a GitHub issue.
