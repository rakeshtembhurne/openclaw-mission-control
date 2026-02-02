#!/bin/bash
#
# OpenClaw Mission Control - Cron Job Setup Script
#
# This script sets up staggered cron jobs for all 10 agents.
# Each agent has a 15-minute heartbeat cycle, staggered by 2 minutes.
#
# Usage: ./setup-cron.sh
#

set -e

# Configuration
BUN_PATH="${BUN_PATH:-$HOME/.bun/bin/bun}"
WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
HEARTBEAT_SCRIPT="$WORKSPACE/scripts/heartbeat.ts"
NOTIFICATION_DAEMON="$WORKSPACE/scripts/notification-daemon.ts"
DAILY_STANDUP="$WORKSPACE/scripts/daily-standup.ts"

echo "📅 OpenClaw Mission Control - Cron Job Setup"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Bun path: $BUN_PATH"
echo "  Workspace: $WORKSPACE"
echo "  Heartbeat script: $HEARTBEAT_SCRIPT"
echo ""

# Check if scripts exist
if [ ! -f "$HEARTBEAT_SCRIPT" ]; then
    echo "❌ Error: Heartbeat script not found at $HEARTBEAT_SCRIPT"
    echo "   Make sure you've run the deployment script first."
    exit 1
fi

# Create temporary crontab file
TEMP_CRON=$(mktemp)

# Export current crontab
crontab -l > "$TEMP_CRON" 2>/dev/null || touch "$TEMP_CRON"

# Check if Mission Control cron jobs already exist
if grep -q "Mission Control" "$TEMP_CRON"; then
    echo "⚠️  Mission Control cron jobs already exist in crontab."
    echo ""
    read -p "Do you want to replace them? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted."
        rm -f "$TEMP_CRON"
        exit 1
    fi

    # Remove existing Mission Control cron jobs
    grep -v "Mission Control" "$TEMP_CRON" > "$TEMP_CRON.tmp"
    mv "$TEMP_CRON.tmp" "$TEMP_CRON"
fi

# Add Mission Control cron jobs
echo "" >> "$TEMP_CRON"
echo "# Mission Control - Agent Heartbeats (15-min cycle, staggered)" >> "$TEMP_CRON"

# Jarvis - Main orchestrator (every 15 minutes at :00, :15, :30, :45)
echo "*/15 * * * * $BUN_PATH $HEARTBEAT_SCRIPT jarvis # Mission Control - Jarvis" >> "$TEMP_CRON"

# Friday - Assistant (every 15 minutes at :01, :16, :31, :46)
echo "1,16,31,46 * * * * $BUN_PATH $HEARTBEAT_SCRIPT friday # Mission Control - Friday" >> "$TEMP_CRON"

# Shuri - Engineer (every 15 minutes at :02, :17, :32, :47)
echo "2,17,32,47 * * * * $BUN_PATH $HEARTBEAT_SCRIPT shuri # Mission Control - Shuri" >> "$TEMP_CRON"

# Fury - Director (every 15 minutes at :04, :19, :34, :49)
echo "4,19,34,49 * * * * $BUN_PATH $HEARTBEAT_SCRIPT fury # Mission Control - Fury" >> "$TEMP_CRON"

# Vision - Analyst (every 15 minutes at :06, :21, :36, :51)
echo "6,21,36,51 * * * * $BUN_PATH $HEARTBEAT_SCRIPT vision # Mission Control - Vision" >> "$TEMP_CRON"

# Loki - Creative (every 15 minutes at :08, :23, :38, :53)
echo "8,23,38,53 * * * * $BUN_PATH $HEARTBEAT_SCRIPT loki # Mission Control - Loki" >> "$TEMP_CRON"

# Quill - Researcher (every 15 minutes at :10, :25, :40, :55)
echo "10,25,40,55 * * * * $BUN_PATH $HEARTBEAT_SCRIPT quill # Mission Control - Quill" >> "$TEMP_CRON"

# Wanda - Optimizer (every 15 minutes at :12, :27, :42, :57)
echo "12,27,42,57 * * * * $BUN_PATH $HEARTBEAT_SCRIPT wanda # Mission Control - Wanda" >> "$TEMP_CRON"

# Pepper - Manager (every 15 minutes at :14, :29, :44, :59)
echo "14,29,44,59 * * * * $BUN_PATH $HEARTBEAT_SCRIPT pepper # Mission Control - Pepper" >> "$TEMP_CRON"

# Wong - Librarian (every 15 minutes at :03, :18, :33, :48)
echo "3,18,33,48 * * * * $BUN_PATH $HEARTBEAT_SCRIPT wong # Mission Control - Wong" >> "$TEMP_CRON"

# Notification Daemon - Every 2 minutes
echo "" >> "$TEMP_CRON"
echo "# Mission Control - Notification Daemon" >> "$TEMP_CRON"
echo "*/2 * * * * $BUN_PATH $NOTIFICATION_DAEMON # Mission Control - Notification Daemon" >> "$TEMP_CRON"

# Daily Standup - 11:30 PM IST (6:00 PM UTC)
echo "" >> "$TEMP_CRON"
echo "# Mission Control - Daily Standup (11:30 PM IST)" >> "$TEMP_CRON"
echo "30 23 * * * $BUN_PATH $DAILY_STANDUP # Mission Control - Daily Standup" >> "$TEMP_CRON"

echo ""
echo "📝 Cron jobs to be installed:"
echo ""
cat "$TEMP_CRON" | grep "Mission Control"
echo ""

# Install crontab
crontab "$TEMP_CRON"

# Cleanup
rm -f "$TEMP_CRON"

echo "✅ Cron jobs installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Verify installation: crontab -l | grep 'Mission Control'"
echo "  2. Check heartbeat logs in 15 minutes:"
echo "     sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db 'SELECT * FROM heartbeat_logs ORDER BY timestamp DESC LIMIT 10'"
echo "  3. Monitor agent activity:"
echo "     sqlite3 ~/.openclaw/workspace/mission-control/mission-control.db 'SELECT name, status, datetime(last_heartbeat, \"unixepoch\") FROM agents;'"
echo ""
echo "🎉 Mission Control heartbeat system is ready!"
