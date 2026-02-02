# OpenClaw Mission Control - Deployment Checklist

## Pre-Deployment Checklist

### Local Setup ✅
- [x] Repository created and initialized
- [x] Git repository initialized
- [x] All files committed
- [x] .gitignore configured
- [x] Documentation complete

### Code Quality ✅
- [x] TypeScript files created (API, UI, scripts)
- [x] SQL schema complete with all tables
- [x] API routes implemented
- [x] React components created
- [x] Deployment scripts written

## Server Deployment (nisshitsu-01)

### Step 1: Copy Repository to Server
```bash
# From local machine
scp -r /Users/rakesh/Documents/Projects/nisshitsu/openclaw-workspace/projects/mission-control \
    nisheeth@nisshitsu-01:~/.openclaw/workspace/projects/

# OR use git (if remote repository set up)
ssh nisheeth@nisshitsu-01
cd ~/.openclaw/workspace/projects
git clone <repository-url> mission-control
```

### Step 2: Run Deployment Script
```bash
ssh nisheeth@nisshitsu-01
cd ~/.openclaw/workspace/projects/mission-control
chmod +x deployment/deploy.sh
./deployment/deploy.sh
```

Expected output:
- ✅ Directory structure created
- ✅ Database initialized with 10 agents
- ✅ Agent WORKING.md files created
- ✅ Dependencies installed
- ✅ Environment files created
- ✅ Cron jobs configured

### Step 3: Configure Environment
```bash
# Edit API environment file
nano ~/.openclaw/workspace/projects/mission-control/mission-control-api/.env

# Add Telegram credentials (optional)
TELEGRAM_BOT_TOKEN=8549352421:AAErjuNHOhDzWLkznqr-nt6Xcevo3FsHQEk
TELEGRAM_CHAT_ID=<your-chat-id>
```

### Step 4: Verify Database
```bash
# Check agents were registered
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "SELECT name, role, status FROM agents;"

# Expected output: 10 agents
```

### Step 5: Test Heartbeat Manually
```bash
# Test Jarvis heartbeat
~/.bun/bin/bun ~/.openclaw/workspace/scripts/heartbeat.ts jarvis

# Check heartbeat logs
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "SELECT * FROM heartbeat_logs ORDER BY timestamp DESC LIMIT 5;"
```

### Step 6: Verify Cron Jobs
```bash
# List cron jobs
crontab -l | grep heartbeat

# Expected output: 10 heartbeat jobs + notification daemon + daily standup
```

### Step 7: Start API Server
```bash
cd ~/.openclaw/workspace/projects/mission-control/mission-control-api

# Development mode
bun run dev

# Production mode (after testing)
bun run build
pm2 start "bun run start" --name mission-control-api
pm2 save
pm2 startup
```

### Step 8: Test API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Get agents
curl http://localhost:3000/api/agents

# Create test task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Mission Control",
    "description": "Verify task creation works",
    "priority": "high",
    "assigned_agent": "Jarvis",
    "created_by": "Rocky"
  }'
```

### Step 9: Start UI (Optional)
```bash
cd ~/.openclaw/workspace/projects/mission-control/mission-control-ui

# Development mode
bun run dev

# Production build
bun run build
# Serve with nginx or another web server
```

### Step 10: Monitor First Heartbeat Cycle
```bash
# Wait 15 minutes for first heartbeat cycle

# Check agent status
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "SELECT name, status, datetime(last_heartbeat, 'unixepoch') FROM agents;"

# Check heartbeat logs
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "SELECT * FROM heartbeat_logs ORDER BY timestamp DESC LIMIT 20;"
```

## Post-Deployment Verification

### Database Checks
```bash
# Verify all tables exist
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db ".tables"

# Expected output:
# activities          agents              documents
# daily_summaries     heartbeat_logs      messages
# notifications       subscriptions       tasks

# Verify agents
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "SELECT COUNT(*) FROM agents;"
# Expected output: 10
```

### File System Checks
```bash
# Check directory structure
ls -la ~/.openclaw/workspace/mission-control/

# Expected:
# agents/          (10 agent directories)
# shared/          (memory/, documents/)
# mission-control.db

# Check agent WORKING.md files
ls -la ~/.openclaw/workspace/mission-control/agents/
```

### Process Checks
```bash
# Check if API server is running
lsof -i :3000

# Check PM2 processes (if using PM2)
pm2 list

# Check cron jobs
crontab -l
```

### Monitoring
```bash
# Monitor heartbeat in real-time
watch -n 10 "sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  'SELECT name, status FROM agents;'"

# Monitor task creation
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "SELECT * FROM tasks ORDER BY created_at DESC LIMIT 10;"
```

## Troubleshooting

### Issue: Database Locked
```bash
# Enable WAL mode
sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db \
  "PRAGMA journal_mode=WAL;"
```

### Issue: Agents Not Waking Up
```bash
# Check cron jobs
crontab -l

# Test heartbeat manually
~/.bun/bin/bun ~/.openclaw/workspace/scripts/heartbeat.ts jarvis

# Check for errors
~/.bun/bin/bun ~/.openclaw/workspace/scripts/heartbeat.ts jarvis 2>&1
```

### Issue: API Server Not Starting
```bash
# Check if port is in use
lsof -i :3000

# Kill process using port 3000
kill -9 <PID>

# Start server manually
cd ~/.openclaw/workspace/projects/mission-control/mission-control-api
bun run dev
```

### Issue: Dependencies Not Installed
```bash
# Reinstall dependencies
cd ~/.openclaw/workspace/projects/mission-control/mission-control-core
bun install

cd ../mission-control-api
bun install

cd ../mission-control-ui
bun install
```

## Success Criteria

### Day 1 ✅
- [ ] Deployment script runs without errors
- [ ] Database created with 10 agents
- [ ] Heartbeat runs successfully for at least one agent
- [ ] Cron jobs installed
- [ ] API server starts and responds to /health

### Week 1 📅
- [ ] All 10 agents wake up on schedule
- [ ] Tasks created via API
- [ ] Agents pick up tasks
- [ ] @mentions work
- [ ] Daily standup generated

### Month 1 📆
- [ ] System stable with 99%+ uptime
- [ ] UI functional with real-time updates
- [ ] Telegram integration working
- [ ] Performance optimized
- [ ] Documentation complete

## Rollback Plan

If deployment fails:
1. Stop API server: `pm2 stop mission-control-api`
2. Remove cron jobs: `crontab -e` (delete Mission Control lines)
3. Backup database: `cp mission-control.db mission-control.db.backup`
4. Restore from previous working state

## Next Steps After Deployment

1. **Create first task** via API or UI
2. **Monitor first 24 hours** of heartbeat cycles
3. **Test @mentions** between agents
4. **Review daily standup** at 11:30 PM
5. **Configure Telegram** for notifications
6. **Create SOUL files** for each agent
7. **Fine-tune schedules** if needed

## Support and Documentation

- **Main README**: `README.md`
- **Implementation Summary**: `IMPLEMENTATION-SUMMARY.md`
- **Database Schema**: `mission-control-core/schema.sql`
- **Deployment Config**: `mission-control-core/config/deployment.config.json`

---

**Last Updated**: 2026-02-02

**Status**: ✅ Ready for deployment

**Server**: nisshitsu-01 (nisheeth@nisshitsu-01)
