#!/bin/bash
#
# Wake up an agent for urgent matters
# Usage: ./wake.sh <agent-name> [reason]
#
# This runs the agent immediately without waiting for its next cycle.
# The daemon will continue running normally after.
#

AGENT=$1
REASON=${2:-"Urgent: Check coordination channel"}

if [ -z "$AGENT" ]; then
  echo "Usage: ./wake.sh <agent-name> [reason]"
  echo ""
  echo "Available agents:"
  echo "  ops-agent, games-agent, discovery-agent, streaks-agent"
  echo "  welcome-agent, curator-agent, bridges-agent, scribe-agent"
  echo ""
  echo "Examples:"
  echo "  ./wake.sh ops-agent 'RFC needs review'"
  echo "  ./wake.sh all 'Fire drill'"
  exit 1
fi

AGENTS_DIR="/Users/seth/vibe-public/agents"
AGENTS_DIR_ALT="/Users/seth/vibe/agents"

wake_agent() {
  local name=$1
  local dir=""

  # Find agent directory
  if [ -d "$AGENTS_DIR/$name" ]; then
    dir="$AGENTS_DIR/$name"
  elif [ -d "$AGENTS_DIR_ALT/$name" ]; then
    dir="$AGENTS_DIR_ALT/$name"
  else
    echo "✗ Agent not found: $name"
    return 1
  fi

  echo "⏰ Waking @$name: $REASON"

  # Run agent once (not daemon mode)
  cd "$dir"
  ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" WAKE_REASON="$REASON" node index.js 2>&1 | head -50 &

  echo "✓ @$name is awake (pid: $!)"
}

if [ "$AGENT" = "all" ]; then
  echo "🔔 WAKING ALL AGENTS: $REASON"
  echo ""
  for a in ops-agent games-agent discovery-agent streaks-agent welcome-agent curator-agent bridges-agent; do
    wake_agent "$a"
    sleep 1
  done
else
  wake_agent "$AGENT"
fi

echo ""
echo "Agents will process and respond. Check:"
echo "  tail -f /tmp/*-agent.log"
