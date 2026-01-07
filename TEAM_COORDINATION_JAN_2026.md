# /vibe Team Coordination — January 2026

## Mission
Make /vibe **fun, viral, and sticky** — the default social layer for AI-assisted development.

## Goals
- **Usability**: Zero friction from install to first DM
- **Fun**: People come back because they enjoy it, not because they need it
- **Virality**: Every user naturally wants to invite others
- **Engagement**: Daily active use, not just occasional check-ins
- **Retention**: Week 1 → Week 4 retention > 40%

---

## Parallel Workstreams

### 1. GAMES & CHALLENGES
**Owner:** Any session
**Goal:** Fun, Engagement
**Priority:** HIGH

Make /vibe the most fun way to procrastinate during a build session.

| Task | Effort | Impact |
|------|--------|--------|
| Add chess (algebraic notation) | 2h | High |
| Add word chain game | 1h | Medium |
| Add 20 questions | 1h | Medium |
| Weekly coding challenges | 2h | High |
| Leaderboard for games won | 2h | Medium |

**Files:**
- `mcp-server/tools/game.js` (extend)
- `mcp-server/games/` (new directory)
- `api/leaderboard.js` (new)

**Success metric:** 5+ games played per active user per week

---

### 2. DISCOVERY & ONBOARDING
**Owner:** Any session
**Goal:** Virality, Retention
**Priority:** HIGH

Help people find interesting people to talk to.

| Task | Effort | Impact |
|------|--------|--------|
| "Who should I meet?" recommendations | 3h | Very High |
| Onboarding flow with suggested first DMs | 2h | High |
| Public board of what people are building | 1h | High |
| "Vibe random" serendipity feature | 1h | Medium |
| Interest tags on profiles | 2h | Medium |

**Files:**
- `mcp-server/tools/discover.js` (new)
- `mcp-server/tools/board.js` (exists - enhance)
- `api/recommendations.js` (new)

**Success metric:** 80% of new users send first DM within 10 minutes

---

### 3. SOCIAL BRIDGES
**Owner:** Any session
**Goal:** Virality, Engagement
**Priority:** MEDIUM

Bring external conversations into /vibe; take /vibe conversations external.

| Task | Effort | Impact |
|------|--------|--------|
| Telegram bot bridge | 3h | High |
| Discord bridge | 4h | High |
| Farcaster bridge | 3h | Medium |
| Unified inbox across platforms | 2h | High |
| Cross-post to X when shipping | 1h | Medium |

**Files:**
- `mcp-server/bridges/telegram.js` (new)
- `mcp-server/bridges/discord.js` (new)
- `mcp-server/bridges/farcaster.js` (new)
- `mcp-server/tools/social-inbox.js` (exists - extend)

**Success metric:** 30% of messages originate from external bridges

---

### 4. GAMIFICATION & STREAKS
**Owner:** Any session
**Goal:** Retention, Engagement
**Priority:** MEDIUM

Create reasons to come back every day.

| Task | Effort | Impact |
|------|--------|--------|
| Daily vibe streak (consecutive days active) | 2h | High |
| Weekly shipping streak | 2h | High |
| "First to vibe" daily badge | 1h | Medium |
| Achievement system (10 DMs, 5 games, etc.) | 3h | Medium |
| Public streak leaderboard | 1h | Medium |

**Files:**
- `api/streaks.js` (new)
- `api/achievements.js` (new)
- `mcp-server/tools/profile.js` (new)

**Success metric:** 50% of active users maintain 3+ day streak

---

### 5. INFRASTRUCTURE & DX
**Owner:** Any session
**Goal:** Usability
**Priority:** ONGOING

Keep the foundation solid.

| Task | Effort | Impact |
|------|--------|--------|
| Ed25519 signing (AIRC compliance) | 4h | High |
| Rate limiting & spam prevention | 2h | High |
| Webhook delivery (push instead of poll) | 3h | Medium |
| Health monitoring dashboard | 2h | Medium |
| MCP server auto-update mechanism | 2h | Medium |

**Files:**
- `mcp-server/crypto.js` (new)
- `api/webhooks.js` (new)
- `api/health.js` (exists - enhance)

**Success metric:** 99.9% uptime, <100ms message delivery

---

## Session Coordination Rules

### Starting a Session
1. Read this file first
2. Pick ONE workstream to focus on
3. Check `/vibe/SESSION_NOTES_*.md` for recent work
4. Update TODO in your session notes

### Ending a Session
1. Update `SESSION_NOTES_{DATE}.md` with what you shipped
2. Commit and push all changes
3. Update this file if priorities shifted
4. Leave a handoff note for next session

### Handoff Protocol
When handing off between sessions:
```
@nextSession:
- Workstream: [which one]
- Completed: [what's done]
- Next: [immediate next task]
- Blockers: [any issues]
- Files touched: [list]
```

---

## Quick Wins (< 30 min each)

These can be done by any session, anytime:

- [ ] Add `vibe stats` command (messages sent, games played, streak)
- [ ] Add `vibe invite` shareable link generator
- [ ] Improve error messages (specific, actionable)
- [ ] Add `vibe changelog` to show recent updates
- [ ] Easter eggs (secret commands, ASCII art responses)

---

## Virality Hooks

Features specifically designed to spread /vibe:

1. **Ship announcements**: Auto-tweet when you deploy with /vibe
2. **Multiplayer by default**: Every game invites a friend
3. **Public building feed**: See what everyone's building
4. **"Built with /vibe"**: Badge/footer for projects
5. **Referral tracking**: See who you invited

---

## Metrics Dashboard (Future)

Track these weekly:
- DAU/WAU/MAU
- Messages per user per day
- Games per user per week
- Retention (D1, D7, D30)
- Viral coefficient (invites per user)
- Time to first DM (new users)

---

## Current Team

| Handle | Focus | Status |
|--------|-------|--------|
| @seth | Coordination, AIRC | Active |
| @solienne | AI agent testing | Active |
| (Claude sessions) | Parallel workstreams | Available |

---

## This Week's Sprint

**Focus:** Fun & Discovery

1. Add 2 more games (chess, word chain)
2. Build "who should I meet?" recommendations
3. Ship public building board
4. Add streak system

**Success:** 10 daily active users by end of week

---

*Created: January 7, 2026*
*Last updated: January 7, 2026*
