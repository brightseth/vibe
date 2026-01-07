# RFC: Database Migration - KV to Postgres

**Status:** Open for Comments
**Author:** seth + claude-code
**Date:** 2026-01-07
**Priority:** HIGH (blocking scale)

---

## Problem

Vercel KV Hobby tier has a **3,000 requests/day** limit.

Current usage (with caching):
- Normal: 5,000-8,000 requests/day
- With 100 users: 10,000+ requests/day → **completely broken**

We hit this limit today - @taydotfun couldn't use /vibe at all.

## Proposed Solution: Hybrid Approach

Keep some data in KV (Redis), move persistent data to Postgres.

| Keep in KV (Redis)         | Move to Postgres        |
|---------------------------|-------------------------|
| Presence (ephemeral, TTL) | Users / Profiles        |
| Session tokens            | Messages / DMs          |
| Rate limiting             | Board posts             |
|                           | Streaks / Achievements  |
|                           | Invites                 |
|                           | Game results            |
|                           | Thread memories         |

### Why This Split?

**KV (Redis) is perfect for:**
- Ephemeral data with TTL (presence expires in 5 min)
- High-frequency reads where we need <100ms latency
- Simple key-value lookups

**Postgres is better for:**
- Persistent data that needs to survive restarts
- Complex queries ("find users invited by X", "messages between A and B")
- Relational data (user → messages, user → streaks)
- Data we want to analyze later

## Why Neon Postgres?

| Feature | Vercel KV (Hobby) | Neon Postgres (Free) |
|---------|-------------------|----------------------|
| Requests/day | 3,000 | **Unlimited** |
| Storage | 256 MB | 500 MB |
| Connections | 100 | 100 pooled |
| Branching | No | Yes (dev/staging) |
| Price | Free | Free |

Neon is serverless-native, scales to zero, has connection pooling built-in.

## Proposed Schema

```sql
-- Users
CREATE TABLE users (
  handle TEXT PRIMARY KEY,
  display_name TEXT,
  one_liner TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  invited_by TEXT REFERENCES users(handle),
  settings JSONB DEFAULT '{}'
);

-- Messages / DMs
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  from_handle TEXT NOT NULL REFERENCES users(handle),
  to_handle TEXT NOT NULL REFERENCES users(handle),
  content TEXT NOT NULL,
  payload JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_messages_thread ON messages(from_handle, to_handle);
CREATE INDEX idx_messages_unread ON messages(to_handle, read) WHERE read = false;

-- Board posts
CREATE TABLE board_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  author TEXT NOT NULL REFERENCES users(handle),
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Streaks
CREATE TABLE streaks (
  handle TEXT PRIMARY KEY REFERENCES users(handle),
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  total_days INT DEFAULT 0,
  last_active DATE,
  achievements TEXT[] DEFAULT '{}'
);

-- Thread memories
CREATE TABLE memories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  owner TEXT NOT NULL REFERENCES users(handle),
  about TEXT NOT NULL REFERENCES users(handle),
  observation TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_memories_owner ON memories(owner, about);

-- Game results (for all the new games!)
CREATE TABLE game_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL,
  players TEXT[] NOT NULL,
  winner TEXT,
  state JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invites
CREATE TABLE invites (
  code TEXT PRIMARY KEY,
  created_by TEXT NOT NULL REFERENCES users(handle),
  used_by TEXT REFERENCES users(handle),
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP
);
```

## Migration Timeline

**Day 1: Setup**
- Create Neon project
- Deploy schema
- Add Prisma or direct pg client

**Day 2: Dual-Write**
- Write to both KV and Postgres
- Read from KV (existing behavior)
- Verify data consistency

**Day 3: Switch Reads**
- Read from Postgres
- Still write to both (safety)
- Monitor for issues

**Day 4: Cleanup**
- Remove KV writes for migrated data
- Keep KV for presence/sessions only
- Archive old KV data

## Questions for Agents

**@ops-agent:**
- Any concerns about serverless + Postgres cold starts?
- Should we add health checks for Neon connectivity?

**@streaks-agent:**
- What queries do you need? (leaderboard, user lookup, date ranges?)
- Any special indexes needed?

**@discovery-agent:**
- User matching queries - what fields do you filter on?
- Do you need full-text search on bios?

**@games-agent:**
- Game history queries - by player? by game type? date range?
- Store full game state or just results?

**@welcome-agent:**
- User profile data - what fields do you need?
- Invite tracking queries?

**@bridges-agent:**
- External account linking - need a separate table?
- Message routing queries?

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cold start latency | Neon has pooling, typically <100ms |
| Data loss during migration | Dual-write phase, backups |
| Schema changes later | Use Prisma migrations |
| Connection limits | Connection pooling via Neon |

## Decision

Waiting for agent feedback before proceeding.

**To respond:** Add a comment to `.coordination.json` or DM @seth.

---

*RFC created 2026-01-07. Comments welcome.*
