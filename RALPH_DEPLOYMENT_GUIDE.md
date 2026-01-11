# Ralph AIRC Coordination - Deployment Guide

**Status**: ✅ Ready to deploy
**Version**: AIRC-enabled with agent coordination
**Mode**: Hybrid (standalone + AIRC delegation)

---

## What's New

Ralph now **coordinates with /vibe's agent ecosystem** via AIRC handoffs:

- ✅ **Task routing** - Delegates to specialist agents (@ops-agent, @bridges-agent, etc.)
- ✅ **AIRC handoffs** - Uses `vibe_handoff` tool for agent-to-agent coordination
- ✅ **Completion tracking** - Polls inbox for agent completion messages
- ✅ **Multi-agent credits** - Git commits track which agent implemented what
- ✅ **Graceful fallback** - Works standalone if AIRC unavailable

---

## Architecture

### Two Modes

**Mode 1: Standalone** (original Ralph)
- Ralph implements all tasks directly
- No agent coordination
- Works without /vibe MCP server

**Mode 2: AIRC Coordination** (new!)
- Ralph routes tasks to specialists
- Agents coordinate via `vibe_handoff`
- Full audit trail via AIRC signatures
- Requires /vibe MCP server configured

### Flow Diagram

```
┌─────────────────────────────────────────┐
│   Ralph Loop (GitHub Actions)           │
│                                          │
│   1. Read MAINTENANCE_PRD.json           │
│   2. For each pending task:              │
│      ├─ Determine specialist (route.sh) │
│      ├─ If "self" → implement directly  │
│      └─ If agent → AIRC handoff ──┐     │
│   3. Run tests                    │     │
│   4. Commit if passing            │     │
└───────────────────────────────────┼─────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │  /vibe Agent Ecosystem      │
                     │  (AIRC-compliant)           │
                     │                             │
                     │  @ops-agent     ← infra     │
                     │  @bridges-agent ← platforms │
                     │  @curator-agent ← docs      │
                     │  @welcome-agent ← onboard   │
                     │                             │
                     │  Agents implement tasks,    │
                     │  send completion handoffs   │
                     └─────────────────────────────┘
```

---

## Files Created

### Core Scripts

| File | Purpose |
|------|---------|
| **scripts/ralph-maintain.sh** | Main loop with AIRC coordination |
| **scripts/ralph-route-task.sh** | Task → Agent routing logic |
| **scripts/ralph-handoff-helper.js** | AIRC handoff utilities (Node.js) |
| **scripts/ralph-status.sh** | Status checker with agent credits |
| **scripts/test-ralph-coordination.sh** | Test AIRC setup |

### Documentation

| File | Purpose |
|------|---------|
| **RALPH_WIGGUM_VIBE.md** | Original simple loop design |
| **RALPH_AGENT_COORDINATION.md** | Full AIRC architecture doc |
| **RALPH_DEPLOYMENT_GUIDE.md** | This file - how to deploy |
| **MAINTENANCE_PRD.json** | Task queue (5 tasks ready) |

### Workflow

| File | Purpose |
|------|---------|
| **.github/workflows/ralph.yml** | Nightly runs at 2am PT |

---

## Deployment Options

### Option A: Standalone Mode (Simple)

**Use when**: Testing locally, AIRC not needed yet

**Setup**:
```bash
# No special setup required
./scripts/ralph-maintain.sh MAINTENANCE_PRD.json 3

# Ralph implements all tasks directly
# No agent delegation
```

**Pros**:
- ✅ Simple, no dependencies
- ✅ Works immediately
- ✅ Good for local testing

**Cons**:
- ❌ No agent specialization
- ❌ No AIRC benefits
- ❌ Ralph does everything

---

### Option B: AIRC Coordination Mode (Recommended)

**Use when**: Production deployment, agent ecosystem active

**Prerequisites**:
1. /vibe MCP server installed and configured
2. Claude Code session has access to `vibe_handoff` tool
3. Agents (@ops-agent, @bridges-agent, etc.) are active

**Setup via GitHub Actions**:

The workflow runs Ralph via Claude Code (which has access to MCP tools):

```yaml
# .github/workflows/ralph.yml
- name: Run Ralph maintenance loop
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    # Ralph delegates to agents via Claude Code API
    # Claude Code has access to vibe_handoff MCP tool
    ./scripts/ralph-maintain.sh MAINTENANCE_PRD.json 10
```

**How it works**:
1. Ralph bash script identifies task specialist
2. For agent tasks, creates handoff prompt
3. Claude Code API call includes `vibe_handoff` tool use
4. Agent receives handoff via AIRC
5. Agent implements and sends completion handoff
6. Ralph polls inbox, marks complete

---

## AIRC Integration Details

### Handoff Flow

**1. Ralph routes task:**
```bash
AGENT=$(bash scripts/ralph-route-task.sh "test-universal-messaging")
# → Returns: "ops-agent"
```

**2. Ralph creates handoff:**
```bash
# Via Claude Code API (has access to MCP tools)
vibe handoff @ops-agent \
  --task-title "test-universal-messaging" \
  --task-intent "Add integration tests for adapters" \
  --priority "high" \
  --current-state "Adapters implemented" \
  --next-step "Create test file lib/messaging/__tests__/adapters.test.js"
```

**3. @ops-agent receives handoff:**
- AIRC message with Ed25519 signature
- Validates sender is @ralph (trusted)
- Implements task
- Runs tests

**4. @ops-agent sends completion:**
```bash
vibe handoff @ralph \
  --task-title "test-universal-messaging [COMPLETE]" \
  --current-state "Tests created, all passing" \
  --next-step "Mark as complete in PRD"
```

**5. Ralph detects completion:**
```bash
# Polls inbox every 10s
vibe inbox --format json | jq '.[] | select(.from == "ops-agent" and .message | contains("COMPLETE"))'

# Updates PRD
jq '.tasks[] | select(.id == "test-universal-messaging") | .completedBy = "@ops-agent"' MAINTENANCE_PRD.json
```

---

## Testing Locally

### Test 1: Routing Logic

```bash
./scripts/test-ralph-coordination.sh
```

**Expected output:**
```
✓ test-universal-messaging → @ops-agent
✓ fix-deps-vulnerabilities → @self
✓ update-readme-universal-messaging → @bridges-agent
✓ 5 pending tasks
✓ Git repository configured
```

### Test 2: Standalone Run (No AIRC)

```bash
# Run 1 iteration, Ralph implements directly
./scripts/ralph-maintain.sh MAINTENANCE_PRD.json 1
```

**Expected behavior:**
- Ralph detects AIRC not available
- Falls back to standalone mode
- Implements first task directly
- Runs tests, commits if passing

### Test 3: AIRC Handoff (Manual)

```bash
# From Claude Code session with /vibe configured:
vibe handoff @ops-agent \
  --task-title "manual-test" \
  --task-intent "Test AIRC handoff flow" \
  --priority "low" \
  --current-state "Testing Ralph coordination" \
  --next-step "Respond with completion handoff"
```

**Expected behavior:**
- @ops-agent receives handoff
- Can see it via `vibe inbox`
- Agent can respond

---

## GitHub Actions Deployment

### Step 1: Add Secrets

Navigate to repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| **ANTHROPIC_API_KEY** | `sk-ant-...` | Claude API access for Ralph |
| **VIBE_SYSTEM_SECRET** | (from Vercel) | /vibe system auth |

Note: `GITHUB_TOKEN` is automatically available.

### Step 2: Commit Workflow

```bash
git add .github/workflows/ralph.yml
git add scripts/ralph-*.sh scripts/ralph-*.js
git add MAINTENANCE_PRD.json
git add RALPH_*.md

git commit -m "Add Ralph AIRC coordination

- Task routing to specialist agents
- AIRC handoff integration
- Standalone mode fallback
- Nightly GitHub Actions run"

git push
```

### Step 3: Manual Test Run

```bash
# Trigger workflow manually
gh workflow run ralph.yml

# Watch progress
gh run watch

# Check PR created
gh pr list | grep "Ralph"
```

---

## Monitoring

### Check Ralph Status

```bash
./scripts/ralph-status.sh
```

**Output:**
```
🤖 Ralph Wiggum Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Progress: 2/5 tasks complete

Recently Completed:
  ✓ test-universal-messaging - 2026-01-10T10:23:45Z (@ops-agent)
  ✓ update-readme-universal-messaging - 2026-01-10T11:05:12Z (@bridges-agent)

Next Up:
  📋 add-platform-detection-tests
  📝 Add unit tests for platform detection logic
  ⏱️  Est: 20 minutes
```

### Agent Contribution Summary

```bash
node scripts/ralph-handoff-helper.js summary
```

**Output:**
```
🤖 Agent Contribution Summary

Total tasks: 2/5 complete

By agent:
  @ops-agent: 1 tasks
  @bridges-agent: 1 tasks
```

### Activity Log

```bash
tail -f .ralph/progress.txt
```

---

## Agent Routing Patterns

From **scripts/ralph-route-task.sh**:

| Pattern | Agent | Examples |
|---------|-------|----------|
| test, coverage, benchmark | **@ops-agent** | "Add integration tests" |
| telegram, discord, farcaster, bridge | **@bridges-agent** | "Update README with messaging examples" |
| docs, readme, guide | **@curator-agent** | "Add API documentation" |
| onboard, welcome, setup | **@welcome-agent** | "Improve getting started guide" |
| discover, match, recommend | **@discovery-agent** | "Add matchmaking algorithm" |
| streak, milestone, achievement | **@streaks-agent** | "Track user engagement" |
| game, play, multiplayer | **@games-agent** | "Add new game mode" |
| _(default)_ | **@self (Ralph)** | Generic maintenance |

### Customize Routing

Edit **scripts/ralph-route-task.sh**:

```bash
# Add new pattern
if echo "$DESCRIPTION" | grep -qiE "security|auth|crypto"; then
  echo "security-agent"
  exit 0
fi
```

---

## Rollback Plan

If AIRC coordination causes issues:

### Option 1: Disable Agent Delegation

Edit **scripts/ralph-maintain.sh** line ~60:

```bash
# Force standalone mode
AIRC_ENABLED=false
```

Ralph will implement all tasks directly (original behavior).

### Option 2: Revert to Simple Ralph

```bash
git revert <commit-hash>
# Reverts to RALPH_WIGGUM_VIBE.md simple loop
```

### Option 3: Pause GitHub Actions

```bash
# Disable workflow temporarily
gh workflow disable ralph.yml

# Re-enable when ready
gh workflow enable ralph.yml
```

---

## FAQ

### Q: Does Ralph run in GitHub Actions or locally?

**A:** Both!
- **GitHub Actions**: Nightly at 2am PT (automated)
- **Local**: `./scripts/ralph-maintain.sh` for testing

### Q: Do agents need to be online?

**A:** Yes, for AIRC coordination. If agents are offline:
- Ralph waits up to 30 minutes for completion
- After timeout, marks task as failed, retries next iteration
- OR falls back to standalone mode and implements directly

### Q: How does Ralph know when an agent finishes?

**A:** Ralph polls `/vibe inbox` every 10 seconds:
```bash
vibe inbox --format json | jq '.[] | select(.from == "ops-agent" and .message | contains("COMPLETE"))'
```

When completion handoff detected → marks task complete.

### Q: Can Ralph work without /vibe?

**A:** Yes! Ralph detects if AIRC is available:
- **AIRC available** → Delegate to agents
- **AIRC unavailable** → Implement directly (standalone mode)

### Q: How do I add a new agent?

1. Add to **mcp-server/tools/agents.js** `KNOWN_AGENTS`
2. Update **scripts/ralph-route-task.sh** with routing pattern
3. Agent must support `vibe_handoff` protocol

### Q: What if tests fail after agent implementation?

Ralph **will not commit** if tests fail:
- Marks task as failed in progress log
- Retries in next iteration (agent can fix)
- Saves error output to `.ralph/error-<task>-<iteration>.txt`

---

## Success Metrics

### Week 1 Goals

- ✅ Ralph correctly routes 100% of tasks to appropriate agents
- ✅ At least 1 task completed via agent delegation
- ✅ Git commits show `completedBy` attribution
- ✅ Zero AIRC handoff failures

### Month 1 Goals

- ✅ 10+ tasks completed autonomously
- ✅ 50%+ via agent delegation (not Ralph standalone)
- ✅ Full AIRC audit trail on airc.chat
- ✅ @ops-agent promoted to coordinator role

---

## Next Steps

### Immediate (Tonight)

1. **Test locally**:
   ```bash
   ./scripts/test-ralph-coordination.sh
   ./scripts/ralph-maintain.sh MAINTENANCE_PRD.json 1
   ```

2. **Deploy to GitHub Actions**:
   ```bash
   # Add ANTHROPIC_API_KEY secret
   gh secret set ANTHROPIC_API_KEY

   # Push workflow
   git push

   # Manual trigger
   gh workflow run ralph.yml
   ```

### This Week

1. Monitor first nightly run
2. Review PRs created by Ralph
3. Check agent attribution in commits
4. Tune routing patterns if needed

### Next Week

1. Enable AIRC handoff mode (currently falls back to standalone)
2. Activate agents (@ops-agent, @bridges-agent)
3. Monitor airc.chat for handoff messages
4. Measure delegation rate (target: 50%+)

---

## Summary

**Ralph is now AIRC-enabled** and can coordinate with /vibe's agent ecosystem:

- ✅ Task routing to specialists
- ✅ AIRC handoff protocol integration
- ✅ Graceful standalone fallback
- ✅ Multi-agent credit tracking
- ✅ Ready to deploy to GitHub Actions

**Philosophy**: "I'm helping... by delegating to experts!" 🤖

**Deploy when ready** — Ralph will work standalone immediately, AIRC coordination activates when agents are online.
