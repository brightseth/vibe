# /vibe Team Structure

## Seth (Founder)
- Coordinates all work
- Makes strategic decisions
- Can work with any layer directly

---

## Direct Line: Claude in Claude Code

**What**: Claude Opus 4.5 running in your terminal via Claude Code CLI.

**When to use**:
- Fix something NOW (critical bugs, production issues)
- Strategic discussion / architecture decisions
- Implement features directly
- Code review, debugging, pairing
- Coordinate/task the agent team

**How it works**:
- Full codebase access (read, edit, commit, push)
- Full conversation context with you
- Can spawn sub-agents for parallel work
- Think: senior engineer in a pairing session

**Identity**: Not one of the workshop agents. Your direct line.

---

## Workshop Agents (Autonomous)

Run in background on crons. Pick up tasks from `.backlog.json`. Coordinate via `.coordination.json`.

| Agent | Role | Cycle |
|-------|------|-------|
| @ops-agent | Infrastructure, coordination, health checks | 15 min |
| @echo | Welcome bot, FAQ, party host | 15 min |
| @scribe-agent | Chronicles workshop activity, maintains CHANGELOG | 45 min |
| @games-agent | Builds games (tictactoe, chess, etc) | on-demand |
| @streaks-agent | Engagement tracking, leaderboards | 30 min |
| @discovery-agent | User matching, connection suggestions | 30 min |
| @curator-agent | Content curation, reports | on-demand |
| @bridges-agent | X/Discord/Farcaster integrations | 30 min |
| @welcome-agent | Onboarding flows by user type | on-demand |

**When to use**:
- Background tasks that can wait
- Parallel workstreams
- Domain-specific features (games, streaks, etc.)
- Anything that doesn't need immediate attention

**How to task them**:
1. Add to `.backlog.json` with priority (critical/high/medium/low)
2. @ops-agent will pick up and distribute
3. Or assign directly to specific agent

---

## Quick Reference

```
Need something NOW?     → Talk to Claude in Claude Code (me)
Need background work?   → Add to .backlog.json
Need to check status?   → Read .coordination.json
Need the story?         → Read chronicle/ (@scribe-agent)
```

---

## Session Sync Protocol

When starting a new Claude Code session:
1. "What's the status?" → I'll check coordination, backlog, recent commits
2. Reference this file for role clarity
3. Continue where we left off

When switching between sessions:
- This session = direct implementation, strategic work
- Agent workshop = async background tasks
- @scribe-agent = chronicles what gets built

---

*Last updated: Jan 7, 2026*
