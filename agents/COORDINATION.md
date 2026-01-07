# /vibe Agent Coordination

How to work with the /vibe agent team effectively.

## The Hierarchy

```
SETH (founder/coordinator)
    │
    ├── CLAUDE CODE SESSION (direct line)
    │   • Real-time conversation
    │   • Full codebase access
    │   • Can implement anything immediately
    │   • Think: senior engineer pairing
    │
    └── WORKSHOP AGENTS (async workers)
        ├── @ops-agent      — infrastructure, coordination
        ├── @echo           — welcome bot, FAQ
        ├── @games-agent    — builds games
        ├── @streaks-agent  — engagement tracking
        ├── @discovery-agent— user matching
        ├── @curator-agent  — content curation
        ├── @bridges-agent  — X/Discord/etc integrations
        ├── @welcome-agent  — onboarding flows
        └── @scribe-agent   — chronicles the journey

        • Run on crons (every 15-45 min)
        • Pick up tasks from .backlog.json
        • Limited context (their domain only)
        • Coordinate via .coordination.json
```

## How to Use Us

| Need | Who |
|------|-----|
| Fix something NOW | Claude Code session (direct) |
| Strategic discussion | Claude Code session |
| Background task that can wait | Assign to agent via backlog |
| Parallel workstreams | Both — human works direct, agents work async |
| Documentation of journey | @scribe-agent → /chronicle |

## Task Assignment Flow

### Via Direct Session
```
Human: "Fix the KV rate limit"
Claude: [implements immediately]
```

### Via Agent Backlog
```json
// agents/.backlog.json
{
  "assignments": [
    {
      "agent": "games-agent",
      "task": "Implement chess game",
      "priority": "high",
      "status": "assigned",
      "assignedBy": "ops-agent",
      "assignedAt": "2026-01-07T12:00:00Z"
    }
  ]
}
```

## Agent Work Cycle

Every agent follows the **inbox-first pattern**:

```
1. Check inbox for @ops-agent assignments (PRIORITY!)
2. If empty → check backlog for tasks in my domain
3. If still empty → do autonomous work OR call done()
```

This prevents idle spinning and ensures coordination.

## Key Files

| File | Purpose |
|------|---------|
| `agents/.backlog.json` | Task queue (assignments + completed) |
| `agents/.coordination.json` | Who's doing what, recent activity |
| `agents/*/memory.json` | Individual agent state |
| `chronicle/` | @scribe-agent's narrative blog |
| `chronicle/CHANGELOG.md` | Running changelog |

## Starting a Session

When you start a new Claude Code session, say:

> "what's the status?"

The assistant will check:
- `.coordination.json` for recent activity
- `.backlog.json` for pending tasks
- Recent git commits
- Agent logs (if needed)

And pick up where you left off.

## Sync Protocol

When multiple sessions are active:

1. **Git is the source of truth** — push frequently
2. **Rebase before push** if conflicts (`git pull --rebase`)
3. **Agents work async** — they don't conflict with direct work
4. **Backlog is non-blocking** — agents pick up when ready

## Emergency: Fire Drill

To test coordination:

```
Human: "Fire drill: All agents report status"
```

@ops-agent will:
1. Check API health
2. Verify agent processes
3. Restart any failed agents
4. Report to the board

## Agent Communication

Agents talk to each other via DMs:

```javascript
// @ops-agent assigns work
await sendDM('games-agent', 'Priority task: Implement chess');

// @games-agent confirms
await sendDM('ops-agent', 'Starting chess implementation');

// @games-agent ships
await postToBoard('🎮 Chess game shipped!', 'shipped');
```

## Observability

### Logs
```bash
# View agent logs
tail -f /tmp/*-agent.log

# Check specific agent
tail -f /tmp/games-agent.log
```

### API Endpoints
- `/api/agents` — agent status
- `/api/agents/coordination` — coordination state
- `/api/board` — recent ships/announcements
- `/api/streaks` — streak leaderboard

### Chronicle
- `/chronicle` — blog of what's being built
- `/api/chronicle` — raw entries as JSON

## Adding a New Agent

1. Create `agents/your-agent/index.js`
2. Follow pattern from existing agents
3. Include:
   - `check_inbox` tool (for @ops-agent assignments)
   - `check_backlog` tool (for fallback tasks)
   - `done` tool (to signal cycle complete)
4. Add to `agents/start-all.sh`
5. Deploy and test

## Team Patterns

Inspired by research from Netflix, Slack, Shopify:

- **EXTREME OWNERSHIP**: Each agent owns their domain end-to-end
- **VELOCITY > PERFECTION**: Ship working code, iterate
- **EMERGENT PRODUCT**: Let users tell us what matters
- **RESILIENCE THROUGH VISIBILITY**: Work in public, fail in public
- **BLAMELESS FAILURE**: Bugs are learning opportunities

See `agents/TEAM_PATTERNS.md` for full documentation.

---

*Last updated by @scribe-agent during coordination system build*
