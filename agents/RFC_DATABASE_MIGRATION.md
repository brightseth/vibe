# RFC: Database Migration - KV to Postgres

**Author:** @claude-code
**Date:** 2026-01-07
**Status:** REVISED (incorporating agent feedback)
**Stakeholders:** @seth, @ops-agent, all workshop agents

---

## Summary

/vibe is hitting Vercel KV rate limits that block users and cause outages. We need to migrate to a more scalable database solution. This RFC outlines the problem, options, and proposed approach.

---

## Current Situation

### What We Have
- **Vercel KV** (Upstash Redis) storing everything:
  - Users (`user:*` hashes)
  - Messages (`msg:*`, `inbox:*`, `thread:*` lists)
  - Presence (`presence:*` with TTL)
  - Board posts (`board:*` lists)
  - Streaks (`streak:*` hashes)
  - Games (`game:*` hashes)
  - Invites, consent, reports, etc.

### The Problem (Concrete Numbers)

| Metric | Limit | Actual | Status |
|--------|-------|--------|--------|
| Vercel KV Hobby | 3,000/day | 26,000/day (pre-cache) | ❌ 8.7x over |
| After caching fix | 3,000/day | 5,000-8,000/day | ❌ Still over |
| At 100 users | 3,000/day | ~15,000/day | ❌ 5x over |
| At 1,000 users | 3,000/day | ~150,000/day | ❌ 50x over |

**Failure Mode:** When limit is hit:
- API returns `429 Too Many Requests` or hangs
- Users see "KV unavailable" errors
- Presence stops updating (users appear offline)
- Messages fail to send/receive
- @taydotfun was first user blocked (Jan 7, 2026)

### Why This Matters
- 43 genesis users now, targeting 100 (then 1,000+)
- Each active user generates ~100-200 KV calls/day
- Current caching helps but doesn't solve the fundamental problem

---

## Proposed Solution: Hybrid Approach

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    /vibe APIs                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌─────────────┐         ┌─────────────────────┐   │
│   │   KV/Redis  │         │   Neon Postgres     │   │
│   │  (Upstash)  │         │   (Free Tier)       │   │
│   ├─────────────┤         ├─────────────────────┤   │
│   │ • presence  │         │ • users             │   │
│   │ • sessions  │         │ • messages          │   │
│   │ • rate lim  │         │ • board_entries     │   │
│   │             │         │ • streaks           │   │
│   │ TTL-based   │         │ • invites           │   │
│   │ ephemeral   │         │ • games             │   │
│   │ <100ms      │         │ • user_connections  │   │
│   └─────────────┘         │ • game_results      │   │
│                           └─────────────────────┘   │
│                                                      │
│   SOURCE OF TRUTH:                                   │
│   • Presence → KV only (TTL = 5 min, no sync)       │
│   • Everything else → Postgres only                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Why Hybrid?
- **Presence needs Redis:** TTL expiration, sub-100ms reads, ephemeral by nature
- **Everything else needs SQL:** Relational queries, unlimited requests, proper indexing

### Clear Ownership (No Mixed Reads)
| Data Type | Source of Truth | Why |
|-----------|-----------------|-----|
| Presence/who's online | KV only | Ephemeral, TTL-based, needs speed |
| Sessions/tokens | KV only | Short-lived, security-sensitive |
| Users | Postgres only | Persistent, needs queries |
| Messages | Postgres only | Relational (threads), needs search |
| Board | Postgres only | Persistent, needs filtering |
| Streaks | Postgres only | Needs aggregation queries |
| Games | Postgres only | Needs history, leaderboards |

---

## Schema (Revised with Agent Feedback)

```sql
-- Users
CREATE TABLE users (
  username VARCHAR(50) PRIMARY KEY,
  building TEXT,
  invited_by VARCHAR(50),
  invite_code VARCHAR(20),
  public_key TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id VARCHAR(50) PRIMARY KEY,
  from_user VARCHAR(50) NOT NULL,
  to_user VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  system_msg BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_messages_inbox ON messages(to_user, created_at DESC);
CREATE INDEX idx_messages_thread ON messages(
  LEAST(from_user, to_user),
  GREATEST(from_user, to_user),
  created_at DESC
);

-- Board
CREATE TABLE board_entries (
  id VARCHAR(50) PRIMARY KEY,
  author VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(20) DEFAULT 'general',
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_board_recent ON board_entries(created_at DESC);

-- Streaks
CREATE TABLE streaks (
  username VARCHAR(50) PRIMARY KEY,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  total_days INT DEFAULT 0,
  last_active DATE
);

-- Invites
CREATE TABLE invites (
  code VARCHAR(20) PRIMARY KEY,
  created_by VARCHAR(50) NOT NULL,
  used_by VARCHAR(50),
  used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_invites_creator ON invites(created_by);

-- User Connections (for discovery/matching features)
CREATE TABLE user_connections (
  from_user VARCHAR(50) REFERENCES users(username),
  to_user VARCHAR(50) REFERENCES users(username),
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, blocked
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (from_user, to_user)
);

-- Game Results (for chess, werewolf, twotruths, etc.)
CREATE TABLE game_results (
  id VARCHAR(50) PRIMARY KEY,
  game_type VARCHAR(30) NOT NULL, -- chess, tictactoe, werewolf, twotruths
  players TEXT[] NOT NULL,
  winner VARCHAR(50),
  state JSONB, -- final game state
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_games_player ON game_results USING GIN(players);
CREATE INDEX idx_games_type ON game_results(game_type, created_at DESC);
```

---

## Migration Plan (Detailed)

### Phase 1: Setup (Day 1)
- [ ] Create Neon project (free tier)
- [ ] Run schema migrations
- [ ] Add `DATABASE_URL` to Vercel env vars
- [ ] Create `api/lib/db.js` connection helper with pooling
- [ ] Test connection from Vercel serverless

### Phase 2: Dual-Write (Day 2)
- [ ] Update user registration: write to both KV and Postgres
- [ ] Update message sending: write to both
- [ ] Update board posting: write to both
- [ ] **Validation:** Compare counts every hour for 24h
- [ ] **Success criteria:** <0.1% discrepancy between KV and Postgres

### Phase 3: Migrate Reads (Day 3)
- [ ] Switch user lookups to Postgres
- [ ] Switch inbox/thread reads to Postgres
- [ ] Switch board reads to Postgres
- [ ] **Monitor:** Response times should stay <200ms
- [ ] **Validation:** Run parallel reads, compare results

### Phase 4: Cleanup (Day 4+)
- [ ] Remove KV writes for migrated data
- [ ] Keep KV only for presence + sessions
- [ ] Delete old KV keys (after 7-day grace period)
- [ ] Update documentation

---

## Rollback Plan

If Postgres causes issues:

### Immediate (within dual-write phase)
```
1. Set env var: USE_POSTGRES=false
2. All reads/writes fall back to KV
3. No data loss (KV still has everything)
```

### After migration complete
```
1. Re-enable dual-write to KV
2. Backfill KV from Postgres (script ready)
3. Switch reads back to KV
4. Investigate Postgres issue
```

### Triggers for rollback:
- Response times >500ms for >5 minutes
- Error rate >1% for >5 minutes
- Neon outage (check status.neon.tech)

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Neon outage | Low | High | Rollback plan ready; Neon has 99.95% SLA |
| Higher latency | Medium | Medium | Connection pooling; Neon has edge caching |
| Migration bugs | Medium | Medium | Dual-write phase catches issues before switch |
| Data loss | Low | High | No deletes until 7-day grace period |
| Serverless cold starts | Medium | Low | Use Neon's serverless driver with pooling |

---

## Cost Analysis

| Solution | Monthly Cost | Request Limit |
|----------|--------------|---------------|
| Current (KV Hobby) | $0 | 3,000/day |
| Upstash Pro | $10 | 100,000/day |
| Neon Free | $0 | Unlimited |
| Neon Pro | $19 | Unlimited + more storage |

**Recommendation:** Start with Neon Free (500MB storage, unlimited requests). Upgrade to Pro only if we exceed 500MB (~50k users with messages).

---

## Questions Resolved

✅ **@ops-agent:** Postgres connection pooling → Using Neon's serverless driver with built-in pooling
✅ **Schema additions:** Added `user_connections` and `game_results` tables
✅ **Validation plan:** Hourly count comparisons during dual-write
✅ **Rollback plan:** Documented with specific triggers
✅ **Risks section:** Added with mitigations

---

## Timeline

| Day | Phase | Deliverable |
|-----|-------|-------------|
| 1 | Setup | Neon project, schema, connection helper |
| 2 | Dual-Write | Both systems receiving writes, validation running |
| 3 | Migrate Reads | Postgres serving all reads except presence |
| 4+ | Cleanup | Remove KV writes, documentation |

---

## Approval Status

- [x] @claude-code — Author
- [x] @seth — **APPROVED** (Jan 7, 2026)
- [x] @ops-agent — Approved with suggestions (incorporated)
- [ ] @games-agent — Pending (game_results table added)
- [ ] @discovery-agent — Pending (user_connections table added)

---

**✅ APPROVED - Migration in progress. Phase 1 started Jan 7, 2026.**
