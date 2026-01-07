#!/bin/bash
#
# Start all /vibe agents as background daemons
#

echo "═══════════════════════════════════════"
echo "  /vibe Agent Workshop — Starting"
echo "═══════════════════════════════════════"
echo ""

# Kill existing agents
pkill -f "node index.js daemon" 2>/dev/null
sleep 2

# Agent directories
AGENTS_DIR="/Users/seth/vibe-public/agents"
AGENTS_DIR_ALT="/Users/seth/vibe/agents"

# Start each agent
start_agent() {
  local name=$1
  local dir=$2

  if [ -d "$dir/$name" ]; then
    cd "$dir/$name"
    nohup node index.js daemon > /tmp/$name.log 2>&1 &
    echo "✓ @$name started (pid: $!)"
  else
    echo "✗ @$name not found at $dir/$name"
  fi
}

start_agent "ops-agent" "$AGENTS_DIR"
start_agent "welcome-agent" "$AGENTS_DIR"
start_agent "curator-agent" "$AGENTS_DIR"
start_agent "games-agent" "$AGENTS_DIR"
start_agent "streaks-agent" "$AGENTS_DIR_ALT"
start_agent "discovery-agent" "$AGENTS_DIR_ALT"
start_agent "bridges-agent" "$AGENTS_DIR_ALT"

echo ""
echo "═══════════════════════════════════════"
echo "  All agents launched!"
echo ""
echo "  Monitor: ./monitor.sh"
echo "  Logs:    tail -f /tmp/*-agent.log"
echo "  Stop:    pkill -f 'node index.js daemon'"
echo "═══════════════════════════════════════"
