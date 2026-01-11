#!/bin/bash
# Determine which /vibe agent should handle a task
# Returns agent handle or "self" if Ralph should handle directly

TASK_ID="$1"
PRD_FILE="${2:-MAINTENANCE_PRD.json}"

if [ -z "$TASK_ID" ]; then
  echo "Usage: ralph-route-task.sh <task-id> [prd-file]" >&2
  exit 1
fi

DESCRIPTION=$(jq -r ".tasks[] | select(.id == \"$TASK_ID\") | .description" "$PRD_FILE")

if [ -z "$DESCRIPTION" ] || [ "$DESCRIPTION" = "null" ]; then
  echo "self"
  exit 0
fi

# Pattern matching for agent specialization

# Infrastructure, testing, deployment
if echo "$DESCRIPTION" | grep -qiE "test|coverage|benchmark|deploy|infra|monitor|health"; then
  echo "ops-agent"
  exit 0
fi

# External platform bridges (Telegram, Discord, X, Farcaster)
if echo "$DESCRIPTION" | grep -qiE "telegram|discord|farcaster|twitter|x\.com|bridge|external|platform|messaging"; then
  echo "bridges-agent"
  exit 0
fi

# Documentation and content
if echo "$DESCRIPTION" | grep -qiE "docs|readme|guide|tutorial|documentation|example"; then
  echo "curator-agent"
  exit 0
fi

# Onboarding and user experience
if echo "$DESCRIPTION" | grep -qiE "onboard|welcome|getting.?started|setup|install"; then
  echo "welcome-agent"
  exit 0
fi

# Discovery and matchmaking
if echo "$DESCRIPTION" | grep -qiE "discover|match|connect|recommend|suggestion|find.*people"; then
  echo "discovery-agent"
  exit 0
fi

# Engagement features
if echo "$DESCRIPTION" | grep -qiE "streak|milestone|achievement|celebration|engagement"; then
  echo "streaks-agent"
  exit 0
fi

# Games and interactive features
if echo "$DESCRIPTION" | grep -qiE "game|play|multiplayer|interactive"; then
  echo "games-agent"
  exit 0
fi

# Default: Ralph handles generic maintenance tasks
echo "self"
