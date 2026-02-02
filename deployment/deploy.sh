#!/bin/bash
#
# OpenClaw Mission Control - Deployment Script
#
# This script performs one-command deployment of Mission Control:
# 1. Creates directory structure (agents/, shared/memory/, shared/documents/)
# 2. Initializes WORKING.md for each agent
# 3. Creates SQLite database from schema
# 4. Installs dependencies with Bun
# 5. Sets up environment files
# 6. Configures cron jobs
# 7. Verifies installation
#
# Usage: ./deploy.sh
#

set -e

# Configuration
WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
MISSION_CONTROL_DIR="$WORKSPACE/mission-control"
PROJECTS_DIR="$WORKSPACE/projects"

# Auto-detect repository directory (works whether it's mission-control or openclaw-mission-control)
if [ -d "$PROJECTS_DIR/mission-control" ]; then
    REPO_DIR="$PROJECTS_DIR/mission-control"
elif [ -d "$PROJECTS_DIR/openclaw-mission-control" ]; then
    REPO_DIR="$PROJECTS_DIR/openclaw-mission-control"
else
    echo "Error: Cannot find mission-control directory in $PROJECTS_DIR"
    exit 1
fi

BUN_PATH="${BUN_PATH:-$HOME/.bun/bin/bun}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 OpenClaw Mission Control - Deployment Script${NC}"
echo "=================================================="
echo ""
echo "Configuration:"
echo "  Workspace: $WORKSPACE"
echo "  Mission Control: $MISSION_CONTROL_DIR"
echo "  Repository: $REPO_DIR"
echo "  Bun: $BUN_PATH"
echo ""

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Error: Bun is not installed${NC}"
    echo "   Install Bun from: https://bun.sh"
    exit 1
fi

echo -e "${BLUE}📁 Creating directory structure...${NC}"

# Create runtime directories
mkdir -p "$MISSION_CONTROL_DIR/agents"
mkdir -p "$MISSION_CONTROL_DIR/shared/memory"
mkdir -p "$MISSION_CONTROL_DIR/shared/documents"

echo -e "${GREEN}   ✓ Agent directories created${NC}"

# Create symlink for scripts
if [ -L "$WORKSPACE/scripts" ]; then
    echo "   ✓ Scripts symlink already exists"
else
    ln -sf "$REPO_DIR/mission-control-core/scripts" "$WORKSPACE/scripts"
    echo -e "${GREEN}   ✓ Scripts symlink created${NC}"
fi

echo ""

# Initialize database if it doesn't exist
if [ -f "$MISSION_CONTROL_DIR/mission-control.db" ]; then
    echo -e "${YELLOW}⚠️  Database already exists: $MISSION_CONTROL_DIR/mission-control.db${NC}"
    echo "   Skipping database initialization"
else
    echo -e "${BLUE}🗄️  Creating SQLite database...${NC}"

    sqlite3 "$MISSION_CONTROL_DIR/mission-control.db" < "$REPO_DIR/mission-control-core/schema.sql"

    echo -e "${GREEN}   ✓ Database created${NC}"
    echo -e "${GREEN}   ✓ Agents registered (10 agents)${NC}"
fi

echo ""

# Initialize agent WORKING.md files
echo -e "${BLUE}🤖 Initializing agent WORKING.md files...${NC}"

AGENTS=("jarvis" "shuri" "fury" "vision" "loki" "quill" "wanda" "pepper" "friday" "wong")

for agent in "${AGENTS[@]}"; do
    AGENT_DIR="$MISSION_CONTROL_DIR/agents/$agent"
    mkdir -p "$AGENT_DIR"

    if [ ! -f "$AGENT_DIR/WORKING.md" ]; then
        cat > "$AGENT_DIR/WORKING.md" <<EOF
# WORKING - ${agent^}

> Last updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Status

- **Current Status**: Idle
- **Pending Tasks**: 0
- **Unread Notifications**: 0

## Current Tasks

*No tasks assigned yet.*

## Recent Notifications

*No notifications yet.*

## Recent Activity

*Heartbeat runs every 15 minutes. This file is updated automatically.*
EOF
        echo -e "${GREEN}   ✓ Created WORKING.md for ${agent^}${NC}"
    else
        echo "   ✓ WORKING.md already exists for ${agent^}"
    fi
done

echo ""

# Install dependencies for mission-control-core
echo -e "${BLUE}📦 Installing dependencies...${NC}"

if [ -d "$REPO_DIR/mission-control-core" ]; then
    cd "$REPO_DIR/mission-control-core"
    echo "   Installing mission-control-core dependencies..."
    bun install
    echo -e "${GREEN}   ✓ mission-control-core dependencies installed${NC}"
else
    echo -e "${YELLOW}   ⚠️  mission-control-core not found, skipping${NC}"
fi

# Install dependencies for mission-control-api
if [ -d "$REPO_DIR/mission-control-api" ]; then
    cd "$REPO_DIR/mission-control-api"
    echo "   Installing mission-control-api dependencies..."
    bun install
    echo -e "${GREEN}   ✓ mission-control-api dependencies installed${NC}"
else
    echo -e "${YELLOW}   ⚠️  mission-control-api not found, skipping${NC}"
fi

# Install dependencies for mission-control-ui
if [ -d "$REPO_DIR/mission-control-ui" ]; then
    cd "$REPO_DIR/mission-control-ui"
    echo "   Installing mission-control-ui dependencies..."
    bun install
    echo -e "${GREEN}   ✓ mission-control-ui dependencies installed${NC}"
else
    echo -e "${YELLOW}   ⚠️  mission-control-ui not found, skipping${NC}"
fi

echo ""

# Create environment files
echo -e "${BLUE}🔧 Creating environment files...${NC}"

# API server environment file
API_ENV_FILE="$REPO_DIR/mission-control-api/.env"
if [ ! -f "$API_ENV_FILE" ]; then
    cat > "$API_ENV_FILE" <<EOF
NODE_ENV=production
PORT=3000
DB_PATH=$MISSION_CONTROL_DIR/mission-control.db
WORKSPACE_PATH=$MISSION_CONTROL_DIR
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
EOF
    echo -e "${GREEN}   ✓ Created $API_ENV_FILE${NC}"
    echo -e "${YELLOW}     ⚠️  Edit this file to add Telegram credentials${NC}"
else
    echo "   ✓ API .env already exists"
fi

# UI environment file
UI_ENV_FILE="$REPO_DIR/mission-control-ui/.env"
if [ ! -f "$UI_ENV_FILE" ]; then
    cat > "$UI_ENV_FILE" <<EOF
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
EOF
    echo -e "${GREEN}   ✓ Created $UI_ENV_FILE${NC}"
else
    echo "   ✓ UI .env already exists"
fi

echo ""

# Setup cron jobs
echo -e "${BLUE}⏰ Setting up cron jobs...${NC}"

if [ -f "$REPO_DIR/deployment/setup-cron.sh" ]; then
    chmod +x "$REPO_DIR/deployment/setup-cron.sh"
    bash "$REPO_DIR/deployment/setup-cron.sh"
else
    echo -e "${YELLOW}   ⚠️  Cron setup script not found, skipping${NC}"
fi

echo ""

# Verification
echo -e "${BLUE}🔍 Verifying installation...${NC}"

# Check database
if [ -f "$MISSION_CONTROL_DIR/mission-control.db" ]; then
    AGENT_COUNT=$(sqlite3 "$MISSION_CONTROL_DIR/mission-control.db" "SELECT COUNT(*) FROM agents;")
    echo -e "${GREEN}   ✓ Database exists with $AGENT_COUNT agents${NC}"
else
    echo -e "${RED}   ❌ Database not found${NC}"
fi

# Check agent directories
AGENT_DIR_COUNT=$(find "$MISSION_CONTROL_DIR/agents" -mindepth 1 -maxdepth 1 -type d | wc -l)
echo -e "${GREEN}   ✓ $AGENT_DIR_COUNT agent directories created${NC}"

# Check scripts
if [ -L "$WORKSPACE/scripts" ]; then
    echo -e "${GREEN}   ✓ Scripts symlink exists${NC}"
else
    echo -e "${RED}   ❌ Scripts symlink not found${NC}"
fi

echo ""
echo -e "${GREEN}✅ Mission Control deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the API server:"
echo "     cd $REPO_DIR/mission-control-api && bun run dev"
echo ""
echo "  2. Start the UI (optional):"
echo "     cd $REPO_DIR/mission-control-ui && bun run dev"
echo ""
echo "  3. Verify agents are registered:"
echo "     sqlite3 $MISSION_CONTROL_DIR/mission-control.db 'SELECT name, role, status FROM agents;'"
echo ""
echo "  4. Check heartbeat logs after 15 minutes:"
echo "     sqlite3 $MISSION_CONTROL_DIR/mission-control.db 'SELECT * FROM heartbeat_logs ORDER BY timestamp DESC LIMIT 10;'"
echo ""
echo -e "${GREEN}🎉 Mission Control is ready!${NC}"
