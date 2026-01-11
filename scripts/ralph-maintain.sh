#!/bin/bash
# Ralph Wiggum maintenance loop with AIRC agent coordination
# "I'm helping... by delegating to experts!"

set -e

PRD_FILE="${1:-MAINTENANCE_PRD.json}"
PROGRESS_FILE=".ralph/progress.txt"
MAX_ITERATIONS="${2:-10}"
HANDOFF_TIMEOUT_MIN=30

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup
mkdir -p .ralph

echo "🤖 Ralph Wiggum with AIRC Agent Coordination"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "PRD: $PRD_FILE"
echo "Max iterations: $MAX_ITERATIONS"
echo "Handoff timeout: $HANDOFF_TIMEOUT_MIN minutes"
echo ""

# Check if /vibe is initialized
if ! vibe test &>/dev/null; then
  echo -e "${YELLOW}⚠️  /vibe not configured. Running in standalone mode (no agent delegation).${NC}"
  AIRC_ENABLED=false
else
  echo -e "${GREEN}✓ /vibe AIRC enabled${NC}"
  AIRC_ENABLED=true
fi
echo ""

for i in $(seq 1 $MAX_ITERATIONS); do
  echo -e "${BLUE}🔧 Ralph iteration $i...${NC}"

  # Get next pending task
  TASK=$(jq -r '.tasks[] | select(.status == "pending") | .id' $PRD_FILE | head -1)

  if [ -z "$TASK" ]; then
    echo -e "${GREEN}✅ All tasks complete!${NC}"
    break
  fi

  # Get task details
  DESCRIPTION=$(jq -r ".tasks[] | select(.id == \"$TASK\") | .description" $PRD_FILE)
  PRIORITY=$(jq -r ".tasks[] | select(.id == \"$TASK\") | .priority" $PRD_FILE)
  ACCEPTANCE=$(jq -r ".tasks[] | select(.id == \"$TASK\") | .acceptance | join(\"\n- \")" $PRD_FILE)

  echo "Task: $TASK"
  echo "Description: $DESCRIPTION"
  echo "Priority: $PRIORITY"
  echo ""
  echo "Log: Iteration $i: $TASK" >> $PROGRESS_FILE

  # Determine which agent should handle this task
  AGENT=$(bash scripts/ralph-route-task.sh "$TASK")

  echo -e "Routing: ${YELLOW}@$AGENT${NC}"
  echo ""

  HANDOFF_ID=""

  if [ "$AGENT" = "self" ] || [ "$AIRC_ENABLED" = false ]; then
    # Ralph implements this task directly
    echo "Ralph implementing directly..."

    PROMPT="Implement this task from the PRD:

Task ID: $TASK
Description: $DESCRIPTION

Acceptance Criteria:
- $ACCEPTANCE

Requirements:
1. Write clean, tested code
2. Follow existing code patterns
3. Add tests for new functionality
4. Update docs if needed
5. Run 'npm test' to verify

When done, respond with: IMPLEMENTATION COMPLETE
"

    # Run Claude (using claude-code if available, otherwise use API)
    if command -v claude-code &> /dev/null; then
      echo "$PROMPT" | claude-code --no-confirm
    else
      echo "⚠️  claude-code not found, using manual mode"
      echo "Please implement: $TASK"
      echo "Press Enter when ready to test..."
      read
    fi

  else
    # Delegate to specialist agent via AIRC handoff
    echo -e "${BLUE}Handing off to @$AGENT via AIRC...${NC}"

    # Build handoff context
    REPO_URL=$(git remote get-url origin 2>/dev/null || echo "local")
    BRANCH=$(git branch --show-current 2>/dev/null || echo "main")

    # Create temporary handoff script
    cat > .ralph/handoff-$TASK.sh << EOF
#!/bin/bash
# Handoff via /vibe AIRC protocol

vibe handoff @$AGENT \\
  --task-title "$TASK" \\
  --task-intent "$DESCRIPTION" \\
  --priority "$PRIORITY" \\
  --current-state "Task from MAINTENANCE_PRD.json" \\
  --next-step "Implement according to acceptance criteria:
- $ACCEPTANCE" \\
  --repo "$REPO_URL" \\
  --branch "$BRANCH" \\
  --history-summary "Ralph autonomous maintenance run, iteration $i"
EOF

    chmod +x .ralph/handoff-$TASK.sh

    # Execute handoff
    if HANDOFF_OUTPUT=$(.ralph/handoff-$TASK.sh 2>&1); then
      echo -e "${GREEN}✓ Handoff sent to @$AGENT${NC}"

      # Extract handoff ID from output
      HANDOFF_ID=$(echo "$HANDOFF_OUTPUT" | grep -oE 'handoff_[a-zA-Z0-9_]+' | head -1)

      if [ -n "$HANDOFF_ID" ]; then
        echo "Handoff ID: $HANDOFF_ID"
        echo ""

        # Wait for agent to complete
        echo -e "${YELLOW}⏳ Waiting for @$AGENT to complete (timeout: ${HANDOFF_TIMEOUT_MIN}m)...${NC}"

        WAIT_START=$(date +%s)
        TIMEOUT_SECONDS=$((HANDOFF_TIMEOUT_MIN * 60))
        COMPLETED=false

        while true; do
          # Check elapsed time
          ELAPSED=$(($(date +%s) - WAIT_START))
          if [ $ELAPSED -ge $TIMEOUT_SECONDS ]; then
            echo -e "${RED}⏱️  Timeout waiting for @$AGENT${NC}"
            echo "Will retry this task in next iteration"
            echo "Timeout: $TASK (by @$AGENT, attempt $i)" >> $PROGRESS_FILE
            break
          fi

          # Check inbox for completion handoff
          if INBOX=$(vibe inbox --format json 2>/dev/null); then
            # Look for completion message from agent
            if echo "$INBOX" | jq -e ".[] | select(.from == \"$AGENT\" and (.message | contains(\"COMPLETE\") or contains(\"$TASK\")))" &>/dev/null; then
              echo -e "${GREEN}✓ @$AGENT completed handoff!${NC}"
              COMPLETED=true
              break
            fi
          fi

          # Show progress every 30 seconds
          if [ $((ELAPSED % 30)) -eq 0 ] && [ $ELAPSED -gt 0 ]; then
            echo "  Still waiting... (${ELAPSED}s elapsed)"
          fi

          # Poll every 10 seconds
          sleep 10
        done

        if [ "$COMPLETED" = false ]; then
          # Agent didn't complete in time, skip to next iteration
          continue
        fi
      else
        echo -e "${YELLOW}⚠️  No handoff ID received, assuming synchronous completion${NC}"
      fi

    else
      echo -e "${RED}✗ Handoff failed: $HANDOFF_OUTPUT${NC}"
      echo "Falling back to direct implementation..."
      AGENT="self"
      # Would retry with direct implementation, but skipping for now
      echo "Failed handoff: $TASK (to @$AGENT)" >> $PROGRESS_FILE
      continue
    fi
  fi

  echo ""
  echo "Running tests..."

  # Run tests
  if npm test 2>&1 | tee .ralph/test-output.txt; then
    # Tests passed!
    echo -e "${GREEN}✅ Tests passed for $TASK${NC}"

    # Update PRD status
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    jq "(.tasks[] | select(.id == \"$TASK\") | .status) = \"complete\" | \
        (.tasks[] | select(.id == \"$TASK\") | .completedAt) = \"$TIMESTAMP\" | \
        (.tasks[] | select(.id == \"$TASK\") | .completedBy) = \"@$AGENT\" | \
        (.tasks[] | select(.id == \"$TASK\") | .handoffId) = \"$HANDOFF_ID\"" \
        $PRD_FILE > tmp.json
    mv tmp.json $PRD_FILE

    # Build commit message
    if [ "$AGENT" = "self" ]; then
      COMMIT_MSG="🤖 Ralph: Complete $TASK

$DESCRIPTION

Tests: ✅ Passing
Iteration: $i

Acceptance criteria met:
- $ACCEPTANCE
"
    else
      COMMIT_MSG="🤖 Ralph + @$AGENT: Complete $TASK

$DESCRIPTION

Implemented by: @$AGENT via AIRC handoff
Handoff ID: $HANDOFF_ID
Tests: ✅ Passing
Iteration: $i

Acceptance criteria met:
- $ACCEPTANCE
"
    fi

    # Commit
    git add -A
    git commit -m "$COMMIT_MSG"

    echo "Success: $TASK (by @$AGENT)" >> $PROGRESS_FILE
    echo ""
  else
    # Tests failed
    echo -e "${RED}❌ Tests failed for $TASK${NC}"
    echo "Will retry in next iteration..."
    echo "Failed: $TASK (attempt $i by @$AGENT)" >> $PROGRESS_FILE

    # Save error for debugging
    tail -20 .ralph/test-output.txt > ".ralph/error-$TASK-$i.txt"
  fi

  # Brief pause
  sleep 2
done

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Ralph coordination session complete!"
echo ""
echo "Summary:"
COMPLETE=$(jq '.tasks[] | select(.status == "complete")' $PRD_FILE | jq -s length)
TOTAL=$(jq '.tasks | length' $PRD_FILE)
echo "  Completed: $COMPLETE/$TOTAL tasks"
echo ""

# Show which agents contributed
AGENTS=$(jq -r '.tasks[] | select(.completedBy != null) | .completedBy' $PRD_FILE | sort -u)
if [ -n "$AGENTS" ]; then
  echo "Agents who contributed:"
  echo "$AGENTS" | while read agent; do
    COUNT=$(jq ".tasks[] | select(.completedBy == \"$agent\")" $PRD_FILE | jq -s length)
    echo "  $agent: $COUNT tasks"
  done
  echo ""
fi

echo "See .ralph/progress.txt for details"
