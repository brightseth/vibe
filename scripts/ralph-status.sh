#!/bin/bash
# Check Ralph's progress

echo "🤖 Ralph Wiggum Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PRD_FILE="${1:-MAINTENANCE_PRD.json}"

if [ ! -f "$PRD_FILE" ]; then
  echo "❌ PRD file not found: $PRD_FILE"
  exit 1
fi

# Overall progress
PENDING=$(jq '.tasks[] | select(.status == "pending")' $PRD_FILE | jq -s length)
COMPLETE=$(jq '.tasks[] | select(.status == "complete")' $PRD_FILE | jq -s length)
TOTAL=$(jq '.tasks | length' $PRD_FILE)

echo "Progress: $COMPLETE/$TOTAL tasks complete"
echo ""

# Tasks by priority
echo "By Priority:"
for priority in high medium low; do
  COUNT=$(jq ".tasks[] | select(.priority == \"$priority\" and .status == \"pending\")" $PRD_FILE | jq -s length)
  if [ $COUNT -gt 0 ]; then
    echo "  $priority: $COUNT pending"
  fi
done
echo ""

# Pending tasks
if [ $PENDING -gt 0 ]; then
  echo "Pending Tasks:"
  jq -r '.tasks[] | select(.status == "pending") | "  • \(.id) (\(.priority)) - \(.description)"' $PRD_FILE
  echo ""
fi

# Recently completed
RECENT_COMPLETE=$(jq '.tasks[] | select(.status == "complete" and .completedAt != null)' $PRD_FILE | jq -s 'sort_by(.completedAt) | reverse | .[0:5]')
if [ "$RECENT_COMPLETE" != "[]" ]; then
  echo "Recently Completed:"
  echo "$RECENT_COMPLETE" | jq -r '.[] | "  ✓ \(.id) - \(.completedAt) (\(.completedBy // "unknown"))"'
  echo ""
fi

# Agent contributions
AGENTS=$(jq -r '.tasks[] | select(.completedBy != null) | .completedBy' $PRD_FILE | sort -u)
if [ -n "$AGENTS" ]; then
  echo "Agent Contributions:"
  echo "$AGENTS" | while read agent; do
    COUNT=$(jq ".tasks[] | select(.completedBy == \"$agent\")" $PRD_FILE | jq -s length)
    echo "  $agent: $COUNT tasks"
  done
  echo ""
fi

# Recent activity from progress log
if [ -f .ralph/progress.txt ]; then
  echo "Recent Activity (last 10):"
  tail -10 .ralph/progress.txt | sed 's/^/  /'
  echo ""
fi

# Next up
NEXT=$(jq -r '.tasks[] | select(.status == "pending") | .id' $PRD_FILE | head -1)
if [ -n "$NEXT" ]; then
  NEXT_DESC=$(jq -r ".tasks[] | select(.id == \"$NEXT\") | .description" $PRD_FILE)
  NEXT_EST=$(jq -r ".tasks[] | select(.id == \"$NEXT\") | .estimatedMinutes // \"unknown\"" $PRD_FILE)
  NEXT_AGENT=$(bash scripts/ralph-route-task.sh "$NEXT" 2>/dev/null || echo "self")
  echo "Next Up:"
  echo "  📋 $NEXT"
  echo "  📝 $NEXT_DESC"
  echo "  👤 Will be handled by: @$NEXT_AGENT"
  echo "  ⏱️  Est: $NEXT_EST minutes"
else
  echo "✅ All done!"
fi
