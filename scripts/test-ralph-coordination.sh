#!/bin/bash
# Test Ralph's AIRC agent coordination
# Simulates the full handoff flow

set -e

echo "🧪 Testing Ralph AIRC Coordination"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Task routing
echo "Test 1: Task Routing"
echo "─────────────────────"
for task in test-universal-messaging fix-deps-vulnerabilities update-readme-universal-messaging; do
  if [ ! -f "MAINTENANCE_PRD.json" ]; then
    echo "⚠️  MAINTENANCE_PRD.json not found, skipping routing test"
    break
  fi

  agent=$(./scripts/ralph-route-task.sh "$task" 2>/dev/null || echo "error")
  if [ "$agent" = "error" ]; then
    echo "  ✗ Failed to route $task"
  else
    echo "  ✓ $task → @$agent"
  fi
done
echo ""

# Test 2: Check if /vibe is configured
echo "Test 2: AIRC Availability"
echo "─────────────────────────"
if command -v vibe &>/dev/null; then
  echo "  ✓ vibe CLI found"

  if vibe test &>/dev/null; then
    echo "  ✓ /vibe configured and healthy"
    AIRC_AVAILABLE=true
  else
    echo "  ⚠️  /vibe not initialized (run 'vibe init')"
    AIRC_AVAILABLE=false
  fi
else
  echo "  ✗ vibe CLI not found"
  echo "  Install: npm install -g @vibe/cli"
  AIRC_AVAILABLE=false
fi
echo ""

# Test 3: Check agent availability
echo "Test 3: Agent Availability"
echo "──────────────────────────"
if [ "$AIRC_AVAILABLE" = true ]; then
  AGENTS="ops-agent bridges-agent welcome-agent discovery-agent"

  for agent in $AGENTS; do
    if vibe agents @$agent &>/dev/null; then
      echo "  ✓ @$agent available"
    else
      echo "  ℹ️  @$agent listed but not active"
    fi
  done
else
  echo "  ⊘ Skipped (AIRC not available)"
fi
echo ""

# Test 4: Handoff helper
echo "Test 4: Handoff Helper"
echo "──────────────────────"
if [ -f "scripts/ralph-handoff-helper.js" ]; then
  echo "  ✓ ralph-handoff-helper.js exists"

  if node scripts/ralph-handoff-helper.js 2>&1 | grep -q "Usage:"; then
    echo "  ✓ Helper script is executable"
  else
    echo "  ⚠️  Helper script may have issues"
  fi
else
  echo "  ✗ ralph-handoff-helper.js not found"
fi
echo ""

# Test 5: PRD schema
echo "Test 5: PRD Schema Compatibility"
echo "────────────────────────────────"
if [ -f "MAINTENANCE_PRD.json" ]; then
  echo "  ✓ MAINTENANCE_PRD.json exists"

  # Check for required fields
  if jq -e '.tasks[] | select(.id != null and .status != null)' MAINTENANCE_PRD.json &>/dev/null; then
    echo "  ✓ Basic schema valid (id, status)"
  else
    echo "  ✗ PRD schema incomplete"
  fi

  # Check task count
  TOTAL=$(jq '.tasks | length' MAINTENANCE_PRD.json)
  PENDING=$(jq '[.tasks[] | select(.status == "pending")] | length' MAINTENANCE_PRD.json)
  echo "  ℹ️  $PENDING pending tasks (of $TOTAL total)"
else
  echo "  ✗ MAINTENANCE_PRD.json not found"
fi
echo ""

# Test 6: Git environment
echo "Test 6: Git Environment"
echo "───────────────────────"
if git rev-parse --git-dir &>/dev/null; then
  echo "  ✓ Git repository detected"

  BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
  echo "  ℹ️  Current branch: $BRANCH"

  if git remote get-url origin &>/dev/null; then
    REMOTE=$(git remote get-url origin)
    echo "  ✓ Remote configured: ${REMOTE:0:50}..."
  else
    echo "  ⚠️  No remote configured"
  fi
else
  echo "  ✗ Not a git repository"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo ""

if [ "$AIRC_AVAILABLE" = true ]; then
  echo "✅ READY: Ralph can coordinate with agents via AIRC"
  echo ""
  echo "Next steps:"
  echo "  1. Run: ./scripts/ralph-maintain.sh MAINTENANCE_PRD.json 3"
  echo "  2. Watch Ralph delegate tasks to @ops-agent and @bridges-agent"
  echo "  3. Check .ralph/progress.txt for activity log"
  echo ""
  echo "Manual test:"
  echo "  vibe handoff @ops-agent --task-title test --task-intent 'Test handoff'"
else
  echo "⚠️  PARTIAL: Ralph can run standalone (no agent delegation)"
  echo ""
  echo "To enable AIRC coordination:"
  echo "  1. Ensure /vibe MCP server is installed"
  echo "  2. Run: vibe init"
  echo "  3. Restart Claude Code"
  echo "  4. Re-run this test"
  echo ""
  echo "Ralph will still work in standalone mode (self-implementation only)"
fi
