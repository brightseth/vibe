#!/bin/bash
#
# /vibe Agent Workshop — Visual Control Center
#
# Launches all agents in a tmux session with visual monitoring.
# Each agent gets its own pane so you can watch them work.
#
# Usage:
#   ./workshop.sh        # Start the workshop
#   ./workshop.sh stop   # Stop all agents
#   ./workshop.sh status # Check status
#

SESSION="vibe-workshop"
AGENTS_DIR="/Users/seth/vibe-public/agents"
AGENTS_DIR_ALT="/Users/seth/vibe/agents"

# Agent configurations: name|directory|interval
AGENTS=(
  "ops-agent|$AGENTS_DIR|5"
  "welcome-agent|$AGENTS_DIR|10"
  "curator-agent|$AGENTS_DIR|30"
  "games-agent|$AGENTS_DIR|15"
  "streaks-agent|$AGENTS_DIR_ALT|15"
  "discovery-agent|$AGENTS_DIR_ALT|15"
  "bridges-agent|$AGENTS_DIR_ALT|15"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  /vibe Agent Workshop${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
}

start_workshop() {
  print_header

  # Kill existing session if any
  tmux kill-session -t "$SESSION" 2>/dev/null

  # Create new session
  echo -e "${YELLOW}Creating tmux session: $SESSION${NC}"
  tmux new-session -d -s "$SESSION" -n "workshop"

  # Create layout: 3 rows, 2-3 columns
  # Row 1: ops-agent | welcome-agent
  # Row 2: curator-agent | games-agent
  # Row 3: streaks-agent | discovery-agent | bridges-agent

  # First agent in main pane
  local first=true
  local pane_count=0

  for agent_config in "${AGENTS[@]}"; do
    IFS='|' read -r name dir interval <<< "$agent_config"

    if [ "$first" = true ]; then
      first=false
      # Use the initial pane
      tmux send-keys -t "$SESSION" "cd $dir/$name && echo '🤖 @$name starting...' && node index.js daemon" C-m
    else
      # Split and create new pane
      if [ $((pane_count % 2)) -eq 0 ]; then
        tmux split-window -t "$SESSION" -v
      else
        tmux split-window -t "$SESSION" -h
      fi
      tmux send-keys -t "$SESSION" "cd $dir/$name && echo '🤖 @$name starting...' && node index.js daemon" C-m
    fi

    pane_count=$((pane_count + 1))
    echo -e "${GREEN}✓${NC} @$name configured (every ${interval}m)"
  done

  # Balance the layout
  tmux select-layout -t "$SESSION" tiled

  # Add a status bar
  tmux set -t "$SESSION" status-style "bg=black,fg=white"
  tmux set -t "$SESSION" status-left "#[fg=cyan]/vibe workshop | "
  tmux set -t "$SESSION" status-right "#[fg=yellow]%H:%M"

  echo ""
  echo -e "${GREEN}Workshop started!${NC}"
  echo ""
  echo -e "Attach with: ${YELLOW}tmux attach -t $SESSION${NC}"
  echo -e "Detach with: ${YELLOW}Ctrl+B then D${NC}"
  echo -e "Stop with:   ${YELLOW}./workshop.sh stop${NC}"
  echo ""
}

stop_workshop() {
  print_header
  echo -e "${YELLOW}Stopping workshop...${NC}"

  # Kill tmux session
  tmux kill-session -t "$SESSION" 2>/dev/null

  # Kill any remaining agent processes
  pkill -f "node index.js daemon" 2>/dev/null

  echo -e "${GREEN}Workshop stopped.${NC}"
}

show_status() {
  print_header

  # Check tmux session
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo -e "Session: ${GREEN}$SESSION (active)${NC}"
  else
    echo -e "Session: ${RED}$SESSION (not running)${NC}"
  fi
  echo ""

  # Check agent processes
  echo "Agent Processes:"
  for agent_config in "${AGENTS[@]}"; do
    IFS='|' read -r name dir interval <<< "$agent_config"
    if pgrep -f "$name/index.js" > /dev/null; then
      echo -e "  ${GREEN}✓${NC} @$name"
    else
      echo -e "  ${RED}✗${NC} @$name"
    fi
  done
  echo ""

  # Check log sizes
  echo "Recent Activity (log sizes):"
  for agent_config in "${AGENTS[@]}"; do
    IFS='|' read -r name dir interval <<< "$agent_config"
    if [ -f "/tmp/$name.log" ]; then
      lines=$(wc -l < "/tmp/$name.log")
      echo "  @$name: $lines lines"
    fi
  done
}

# Main
case "${1:-start}" in
  start)
    start_workshop
    ;;
  stop)
    stop_workshop
    ;;
  status)
    show_status
    ;;
  attach)
    tmux attach -t "$SESSION"
    ;;
  *)
    echo "Usage: $0 {start|stop|status|attach}"
    exit 1
    ;;
esac
