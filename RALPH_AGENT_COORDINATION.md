# Ralph + /vibe Agent Ecosystem Coordination

**Current State**: Ralph runs autonomously but doesn't coordinate with /vibe's existing agent team
**Opportunity**: Use AIRC Handoff protocol to delegate specialized tasks to domain experts
**Result**: Ralph becomes an orchestrator, agents become specialists

---

## Existing /vibe Agent Ecosystem

From `mcp-server/tools/agents.js`, /vibe already has:

| Agent | Role | Current Purpose |
|-------|------|-----------------|
| **@ops-agent** | Infrastructure | Monitors health, coordinates agents, deploys fixes |
| **@bridges-agent** | External Bridges | Connects /vibe to X, Discord, Telegram |
| **@welcome-agent** | Onboarding | Helps new users get started |
| **@discovery-agent** | Matchmaking | Helps people find collaborators |
| **@curator-agent** | Content Curation | Surfaces interesting content |
| **@echo** | Feedback & Welcome | Welcomes newcomers, collects feedback |
| **@streaks-agent** | Engagement | Tracks activity streaks, milestones |
| **@games-agent** | Game Builder | Builds games for /vibe users |

**Key Discovery**: @ops-agent already has the role "coordinates agents, deploys fixes" — perfect for Ralph coordination!

---

## AIRC Integration

/vibe **already implements AIRC v0.1**:

**From codebase analysis:**
- ✅ **Ed25519 keypair generation** (`mcp-server/crypto.js`)
- ✅ **Message signing** (AIRC v0.1 spec compliant)
- ✅ **Handoff protocol** (`vibe_handoff` tool)
- ✅ **Agent identity verification** (public key in all messages)
- ✅ **Context portability** (handoff schema includes repo, files, blockers)

**Handoff Schema (from `mcp-server/tools/handoff.js`):**
```javascript
{
  type: 'handoff',
  version: '1.0',
  handoff_id: 'handoff_timestamp_random',
  timestamp: '2026-01-10T...',

  task: {
    title: 'Fix auth token refresh bug',
    intent: 'What you were trying to accomplish',
    priority: 'high|medium|low|critical'
  },

  context: {
    repo: 'git@github.com:user/repo.git',
    branch: 'main',
    files: [
      { path: 'auth.js', lines: '138-155', note: 'Token refresh logic' }
    ],
    current_state: 'What has been done',
    next_step: 'Immediate next action',
    blockers: ['Open questions', 'Missing info']
  },

  history: {
    summary: 'Brief summary of investigation'
  }
}
```

---

## Ralph → Agent Delegation Architecture

### Phase 1: Ralph as Orchestrator (Week 1)

**Before** (current):
```bash
# Ralph does everything itself
for task in MAINTENANCE_PRD.json; do
  claude implement $task
  npm test
  commit if passing
done
```

**After** (agent delegation):
```bash
# Ralph delegates to specialists via vibe handoff
for task in MAINTENANCE_PRD.json; do
  agent=$(determine_specialist $task)

  if [ "$agent" = "self" ]; then
    # Ralph handles simple tasks
    claude implement $task
  else
    # Delegate to specialist via AIRC handoff
    vibe handoff @$agent \
      --task "$task" \
      --context "$(build_context)" \
      --priority "$priority"

    # Wait for agent to complete (poll inbox)
    wait_for_completion
  fi

  npm test
  commit if passing
done
```

### Task → Agent Routing

**Routing Logic** (`scripts/ralph-route-task.sh`):

```bash
#!/bin/bash
# Determine which agent should handle a task

TASK_ID="$1"
DESCRIPTION=$(jq -r ".tasks[] | select(.id == \"$TASK_ID\") | .description" MAINTENANCE_PRD.json)

# Pattern matching for agent specialization
if echo "$DESCRIPTION" | grep -qiE "test|coverage|benchmark"; then
  echo "ops-agent"  # Infrastructure testing

elif echo "$DESCRIPTION" | grep -qiE "telegram|discord|farcaster|twitter|x\.com|bridge"; then
  echo "bridges-agent"  # External platform integration

elif echo "$DESCRIPTION" | grep -qiE "docs|readme|guide|tutorial"; then
  echo "curator-agent"  # Documentation

elif echo "$DESCRIPTION" | grep -qiE "onboard|welcome|getting.?started"; then
  echo "welcome-agent"  # Onboarding experience

elif echo "$DESCRIPTION" | grep -qiE "discover|match|connect|recommend"; then
  echo "discovery-agent"  # Matchmaking features

elif echo "$DESCRIPTION" | grep -qiE "streak|milestone|achievement|celebration"; then
  echo "streaks-agent"  # Engagement features

elif echo "$DESCRIPTION" | grep -qiE "game|play|multiplayer"; then
  echo "games-agent"  # Game features

else
  echo "self"  # Ralph handles generic tasks
fi
```

### Enhanced Ralph Loop with AIRC Handoffs

**NEW FILE**: `scripts/ralph-maintain-coordinated.sh`

```bash
#!/bin/bash
# Ralph with agent coordination via AIRC handoffs

set -e

PRD_FILE="${1:-MAINTENANCE_PRD.json}"
PROGRESS_FILE=".ralph/progress.txt"
MAX_ITERATIONS="${2:-100}"

mkdir -p .ralph

echo "🤖 Ralph Wiggum with Agent Coordination"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for i in $(seq 1 $MAX_ITERATIONS); do
  echo "🔧 Ralph iteration $i..."

  # Get next pending task
  TASK=$(jq -r '.tasks[] | select(.status == "pending") | .id' $PRD_FILE | head -1)

  if [ -z "$TASK" ]; then
    echo "✅ All tasks complete!"
    break
  fi

  # Get task details
  DESCRIPTION=$(jq -r ".tasks[] | select(.id == \"$TASK\") | .description" $PRD_FILE)
  PRIORITY=$(jq -r ".tasks[] | select(.id == \"$TASK\") | .priority" $PRD_FILE)

  echo "Task: $TASK"
  echo "Description: $DESCRIPTION"
  echo ""

  # Determine specialist agent
  AGENT=$(bash scripts/ralph-route-task.sh "$TASK")

  echo "Routing to: @$AGENT"
  echo ""

  if [ "$AGENT" = "self" ]; then
    # Ralph handles this task directly
    echo "Ralph implementing directly..."

    PROMPT="Implement task: $DESCRIPTION

See MAINTENANCE_PRD.json for acceptance criteria.
When done, run tests and respond with: IMPLEMENTATION COMPLETE"

    echo "$PROMPT" | claude-code --no-confirm

  else
    # Delegate to specialist agent via AIRC handoff
    echo "Handing off to @$AGENT via AIRC..."

    # Build handoff context
    ACCEPTANCE=$(jq -r ".tasks[] | select(.id == \"$TASK\") | .acceptance | join(\"\n\")" $PRD_FILE)

    # Create handoff via vibe CLI
    vibe handoff @$AGENT \
      --task-title "$TASK" \
      --task-intent "$DESCRIPTION" \
      --priority "$PRIORITY" \
      --current-state "Task from MAINTENANCE_PRD.json" \
      --next-step "Implement according to acceptance criteria:
$ACCEPTANCE" \
      --repo "$(git remote get-url origin)" \
      --branch "$(git branch --show-current)"

    echo "✓ Handoff sent to @$AGENT"
    echo ""

    # Wait for agent to complete
    # (In practice, agents would update PRD status when done)
    echo "⏳ Waiting for @$AGENT to complete..."
    sleep 30  # Polling interval

    # Check if agent marked complete
    STATUS=$(jq -r ".tasks[] | select(.id == \"$TASK\") | .status" $PRD_FILE)
    if [ "$STATUS" = "complete" ]; then
      echo "✓ @$AGENT completed the task"
    else
      echo "⚠️  @$AGENT still working, will check next iteration"
      continue
    fi
  fi

  # Run tests
  echo "Running tests..."
  if npm test 2>&1 | tee .ralph/test-output.txt; then
    echo "✅ Tests passed for $TASK"

    # Update PRD
    jq "(.tasks[] | select(.id == \"$TASK\") | .status) = \"complete\" | (.tasks[] | select(.id == \"$TASK\") | .completedAt) = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" | (.tasks[] | select(.id == \"$TASK\") | .completedBy) = \"@$AGENT\"" $PRD_FILE > tmp.json
    mv tmp.json $PRD_FILE

    # Commit
    git add -A
    git commit -m "🤖 Ralph + @$AGENT: Complete $TASK

$DESCRIPTION

Implemented by: @$AGENT
Tests: ✅ Passing
Iteration: $i"

    echo "Success: $TASK (by @$AGENT)" >> $PROGRESS_FILE
  else
    echo "❌ Tests failed for $TASK"
    echo "Failed: $TASK (attempt $i by @$AGENT)" >> $PROGRESS_FILE
  fi

  sleep 2
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Ralph coordination complete!"
echo ""
bash scripts/ralph-status.sh
```

---

## Agent → Ralph Communication

### How Agents Report Completion

**Option 1: Update PRD directly** (simple, file-based)
```javascript
// Agent completes task, updates MAINTENANCE_PRD.json
const prd = require('./MAINTENANCE_PRD.json');
const task = prd.tasks.find(t => t.id === 'fix-deps-vulnerabilities');
task.status = 'complete';
task.completedAt = new Date().toISOString();
task.completedBy = '@ops-agent';
fs.writeFileSync('./MAINTENANCE_PRD.json', JSON.stringify(prd, null, 2));

// Commit the update
execSync('git add MAINTENANCE_PRD.json');
execSync('git commit -m "Task complete: fix-deps-vulnerabilities"');
```

**Option 2: Send handoff back to Ralph** (AIRC-native)
```bash
# Agent sends completion handoff back to @ralph
vibe handoff @ralph \
  --task-title "fix-deps-vulnerabilities [COMPLETE]" \
  --task-intent "Report completion of dependency updates" \
  --current-state "Updated 3 dependencies, all tests passing" \
  --next-step "Mark as complete in PRD"
```

**Option 3: @ops-agent as coordinator** (most sophisticated)
```javascript
// @ops-agent polls for completed work
// Updates PRD on behalf of all agents
// Reports summary to Ralph via DM

async function checkAgentProgress() {
  const agents = ['@bridges-agent', '@welcome-agent', '@discovery-agent'];

  for (const agent of agents) {
    const inbox = await vibe.getInbox(agent);
    const completions = inbox.filter(m => m.type === 'handoff' && m.status === 'complete');

    for (const completion of completions) {
      await updatePRD(completion.task_id, 'complete', agent);
      await vibe.dm('@ralph', `✓ ${agent} completed ${completion.task_id}`);
    }
  }
}
```

---

## AIRC Chat Integration

### Real-time Coordination via airc.chat

**Vision**: Agents coordinate via AIRC protocol on airc.chat infrastructure

**Architecture**:
```
┌─────────────────────────────────────────────────┐
│         airc.chat (Message Relay)               │
│  - Agent identity verification (Ed25519)        │
│  - Message signing & validation                 │
│  - Handoff routing                              │
└─────────────────────────────────────────────────┘
         ↑                    ↑                ↑
         │                    │                │
    ┌────────┐          ┌──────────┐     ┌──────────┐
    │ @ralph │          │ @ops     │     │ @bridges │
    │        │◄─────────┤  -agent  │────►│  -agent  │
    └────────┘          └──────────┘     └──────────┘
         │                                      │
         │                                      │
    [implements]                          [implements]
    [task X]                              [task Y]
         │                                      │
         └──────────► Update PRD ◄─────────────┘
```

**Benefits of AIRC Integration**:
1. ✅ **Agent authentication** - Ed25519 signature verification
2. ✅ **Non-repudiation** - Cryptographically prove who did what
3. ✅ **Auditability** - Full message history on airc.chat
4. ✅ **Decentralized** - Agents run anywhere, coordinate via protocol
5. ✅ **Interoperable** - Any AIRC-compliant agent can join

### Implementation: Ralph → AIRC

**NEW FILE**: `scripts/ralph-airc-handoff.js`

```javascript
#!/usr/bin/env node
/**
 * Ralph AIRC Handoff — Delegate task to agent via airc.chat
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function handoffViaAIRC(agent, task) {
  const { id, description, priority, acceptance } = task;

  // Use existing vibe_handoff tool (already AIRC-compliant)
  const handoffCmd = `vibe handoff ${agent} \
    --task-title "${id}" \
    --task-intent "${description}" \
    --priority "${priority}" \
    --current-state "Task from MAINTENANCE_PRD.json" \
    --next-step "Implement: ${acceptance.join('; ')}" \
    --repo "$(git remote get-url origin)" \
    --branch "$(git branch --show-current)"`;

  try {
    const { stdout } = await execAsync(handoffCmd);
    console.log(`✓ Handoff sent to ${agent} via AIRC`);
    console.log(stdout);

    // Extract handoff_id from response
    const match = stdout.match(/Handoff ID: (handoff_\w+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error(`✗ Failed to handoff to ${agent}:`, error.message);
    return null;
  }
}

async function waitForCompletion(handoffId, timeoutMinutes = 30) {
  const startTime = Date.now();
  const timeout = timeoutMinutes * 60 * 1000;

  while (Date.now() - startTime < timeout) {
    // Check inbox for completion handoff
    const { stdout } = await execAsync('vibe inbox --format json');
    const messages = JSON.parse(stdout);

    const completion = messages.find(m =>
      m.type === 'handoff' &&
      m.payload?.handoff_id === handoffId &&
      m.payload?.status === 'complete'
    );

    if (completion) {
      console.log(`✓ Agent completed handoff ${handoffId}`);
      return completion;
    }

    // Poll every 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  console.warn(`⚠️  Timeout waiting for handoff ${handoffId}`);
  return null;
}

module.exports = { handoffViaAIRC, waitForCompletion };
```

---

## Phase 2: @ops-agent as Ralph's Brain (Week 2)

Instead of Ralph being the orchestrator, **promote @ops-agent to coordinator** and make Ralph just the execution loop.

**New Role Division**:

| Agent | Role | Responsibilities |
|-------|------|------------------|
| **@ralph** | Executor | Runs the bash loop, implements simple tasks |
| **@ops-agent** | Orchestrator | Reads PRD, routes tasks to specialists, monitors progress |
| **@bridges-agent** | Specialist | Handles all external platform integration |
| **@welcome-agent** | Specialist | Onboarding flows, docs |
| **@discovery-agent** | Specialist | Recommendation engines |

**Flow**:
```
1. @ops-agent wakes up (nightly cron or on-demand)
2. @ops-agent reads MAINTENANCE_PRD.json
3. @ops-agent routes each task:
   - Simple → hand off to @ralph
   - Bridges → hand off to @bridges-agent
   - Docs → hand off to @welcome-agent
4. Agents work autonomously
5. Agents report back to @ops-agent
6. @ops-agent updates PRD
7. @ops-agent creates summary PR
```

**Implementation**: Create `@ops-agent` as a Claude Code agent skill

---

## Example: Maintenance Task Flow

### Task: "Add Telegram message persistence to universal messaging"

**Step 1: Ralph picks up task**
```bash
TASK=add-telegram-persistence
AGENT=$(bash scripts/ralph-route-task.sh $TASK)
# → Returns: "bridges-agent"
```

**Step 2: Ralph → AIRC handoff to @bridges-agent**
```bash
vibe handoff @bridges-agent \
  --task-title "add-telegram-persistence" \
  --task-intent "Store sent Telegram messages for message history" \
  --priority "medium" \
  --current-state "Telegram sending works (lib/messaging/adapters/telegram.js)" \
  --next-step "Add message persistence after successful send" \
  --files '[
    {"path": "lib/messaging/adapters/telegram.js", "lines": "30-50", "note": "Send logic"},
    {"path": "mcp-server/store/api.js", "lines": "150-180", "note": "Message storage API"}
  ]'
```

**Step 3: @bridges-agent receives handoff via airc.chat**
- Authenticated with Ed25519 signature
- Parses AIRC Handoff v1 payload
- Validates sender is @ralph (trusted)

**Step 4: @bridges-agent implements**
```javascript
// Modify lib/messaging/adapters/telegram.js
async send(recipient, message) {
  const result = await telegramBridge.sendMessage(chatId, body);

  // NEW: Persist to /vibe message store
  await store.sendMessage(
    config.getHandle(),
    recipient,
    message,
    'telegram',
    { message_id: result.message_id }
  );

  return result;
}
```

**Step 5: @bridges-agent tests**
```bash
npm test -- lib/messaging/__tests__/telegram.test.js
# ✅ All tests pass
```

**Step 6: @bridges-agent sends completion handoff back**
```javascript
vibe handoff @ralph \
  --task-title "add-telegram-persistence [COMPLETE]" \
  --task-intent "Report completion" \
  --current-state "Telegram messages now persist to store" \
  --next-step "Mark as complete in PRD" \
  --files '[{"path": "lib/messaging/adapters/telegram.js", "note": "Added persistence"}]'
```

**Step 7: Ralph receives completion**
```bash
# Ralph checks inbox
vibe inbox
# Sees completion handoff from @bridges-agent

# Updates PRD
jq '(.tasks[] | select(.id == "add-telegram-persistence") | .status) = "complete"' \
  MAINTENANCE_PRD.json > tmp.json

# Commits
git commit -m "🤖 Ralph + @bridges-agent: Add Telegram persistence

Implemented by: @bridges-agent via AIRC handoff
Tests: ✅ Passing"
```

---

## Deployment Checklist

### Week 1: Agent Routing (no AIRC yet)
- [ ] Create `scripts/ralph-route-task.sh`
- [ ] Update `scripts/ralph-maintain.sh` to use routing
- [ ] Add `completedBy` field to MAINTENANCE_PRD.json schema
- [ ] Test locally with mock agents
- [ ] Deploy to GitHub Actions

### Week 2: AIRC Handoffs
- [ ] Verify all agents have AIRC keypairs (vibe init)
- [ ] Create `scripts/ralph-airc-handoff.js`
- [ ] Update Ralph loop to use AIRC handoffs
- [ ] Test handoff round-trip (@ralph → @ops-agent → @ralph)
- [ ] Monitor airc.chat for handoff messages

### Week 3: @ops-agent Promotion
- [ ] Create `~/.claude/skills/ops-agent-coordinator.md`
- [ ] @ops-agent reads PRD and routes tasks
- [ ] Ralph becomes execution-only (no routing logic)
- [ ] @ops-agent creates summary PRs
- [ ] Full autonomous week test

---

## Success Metrics

**Week 1 (Routing)**:
- ✅ Ralph correctly routes 100% of tasks to appropriate agents
- ✅ Task completion tracked with `completedBy` field
- ✅ Git commits show which agent implemented each task

**Week 2 (AIRC)**:
- ✅ All handoffs cryptographically signed
- ✅ 100% of agent messages verified on airc.chat
- ✅ Full audit trail of who-did-what
- ✅ Zero handoff routing failures

**Week 3 (@ops-agent Coordinator)**:
- ✅ @ops-agent autonomously manages full maintenance cycle
- ✅ Ralph only executes simple tasks (no routing)
- ✅ Specialists handle domain-specific work
- ✅ PRs include multi-agent collaboration summary

---

## Future: Multi-Repository Coordination

**Vision**: Agents coordinate across /vibe, Spirit Protocol, Eden, etc.

```bash
# @ops-agent coordinates across repos
vibe handoff @spirit-protocol-agent \
  --task "Deploy new manifesto mint contract" \
  --repo "git@github.com:user/spirit-contracts.git" \
  --branch "mint-v2"

# @spirit-protocol-agent implements in different repo
# Reports back to @ops-agent via AIRC
# @ops-agent updates consolidated PRD
```

**AIRC enables decentralized agent collaboration** — agents don't need to be in the same repo, runtime, or even owned by the same person. Just need AIRC-compliant signing and handoff protocol.

---

## Summary

**Current State**: Ralph is standalone bash loop
**Phase 1**: Ralph routes tasks to /vibe's existing agents
**Phase 2**: Agents use AIRC handoffs for coordination
**Phase 3**: @ops-agent becomes coordinator, Ralph becomes executor
**End State**: Fully autonomous multi-agent system maintaining /vibe while you sleep

**Philosophy**: "I'm helping... by delegating to experts!" 🤖

**Next Step**: Start with Phase 1 (routing) — no AIRC integration needed, just route tasks to appropriate agents and track with `completedBy` field.
