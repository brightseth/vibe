# /vibe Postgres Migration & Product Infrastructure
**Status:** In Progress | **Date:** January 8, 2026 | **Author:** Seth + Claude

## Executive Summary

Migrating /vibe from Upstash KV to Neon Postgres to resolve rate limit issues (500k requests exceeded) and support product growth. Parallel effort to ship core user-facing features while completing infrastructure migration.

## Current State

### What's Working
- **460+ reserved handles** for artists, VIPs, Spirit agents (NODE, Art Blocks, Bright Moments)
- **Observatory dashboard** for monitoring agent activity
- **Admin tooling** for handle management
- **Active users** across multiple features (messaging, streaks, games, discovery)

### The Problem
- **KV rate limits hit** on handle reservation import (500k free tier exceeded)
- **Mixed architecture** - some endpoints use Postgres, some use KV, creating inconsistency
- **Cost concerns** - KV pricing scales poorly vs Postgres for our data model
- **Developer friction** - dual-write patterns, unclear which DB to use

## Architecture

### Current (Mixed)
```
User Request
    ↓
API Endpoints
    ├─→ Upstash KV (Redis) ← rate limited, expensive
    └─→ Neon Postgres     ← new, underutilized
```

### Target (Postgres-first)
```
User Request
    ↓
API Endpoints
    ↓
Neon Postgres (primary)
    ↓
(optional) KV for high-frequency cache only
```

### Schema Design
Already defined in `schema.sql`:
- `users` - Core user data
- `handles` - Registered /vibe identities
- `reserved_handles` - Pre-registered for artists/VIPs
- `messages` - DMs and threads
- `board_entries` - Community posts
- `streaks` - Daily active tracking
- `invites` - Invite codes
- `achievements` - Badge unlocks
- `game_results` - Multiplayer game history
- `memories` - Thread memories (vibe_remember)

### Why Postgres?
1. **Relational queries** - Complex joins for discovery, leaderboards, social graph
2. **ACID guarantees** - Message ordering, streak consistency
3. **Cost efficiency** - Neon free tier: 0.5GB storage, reasonable compute
4. **Better tooling** - Standard SQL, migrations, backups
5. **No rate limits** - At our scale (<1000 users), won't hit limits

## Migration Plan

### Phase 1: Core User Flows (Week 1) ✅ In Progress
**Priority: Unblock product development**

| Endpoint | Status | Complexity | Risk |
|----------|--------|------------|------|
| `api/register.js` | ❌ TODO | Medium | High - breaks onboarding |
| `api/users.js` | ❌ TODO | Low | High - core identity |
| `api/messages.js` | ⚠️ Partial | Medium | Medium - high volume |
| `api/messages/send.js` | ⚠️ Partial | Medium | Medium - high volume |

**Outcome:** Reserved handles can be claimed, messaging fully on Postgres

### Phase 2: Engagement Features (Week 2)
**Priority: Support daily active usage**

| Endpoint | Status | Complexity | Risk |
|----------|--------|------------|------|
| `api/streaks.js` | ❌ TODO | Low | Low - simple counter |
| `api/invites.js` | ❌ TODO | Low | Low - write-heavy |
| `api/games.js` | ⚠️ Partial | Medium | Low - already has PG code |

**Outcome:** Streaks, invites, games fully on Postgres

### Phase 3: Social Graph (Week 3)
**Priority: Improve discovery & retention**

| Endpoint | Status | Complexity | Risk |
|----------|--------|------------|------|
| `api/friends.js` | ❌ TODO | Medium | Low |
| `api/consent.js` | ❌ TODO | Low | Low |
| `api/serendipity.js` | ⚠️ Partial | Medium | Low |

**Outcome:** Connection management on Postgres

### Phase 4: Cleanup (Week 4)
- Remove KV fallbacks from migrated endpoints
- Update env var flags (`USE_POSTGRES_*` → default true)
- Archive KV data for backup
- Documentation updates

## Migration Strategy

### Per-Endpoint Pattern
```javascript
// 1. Check if data exists in Postgres
const pgData = await checkPostgres(handle);
if (pgData) return pgData;

// 2. Fallback to KV during migration
const kvData = await checkKV(handle);

// 3. Backfill to Postgres if found in KV
if (kvData) {
  await backfillToPostgres(kvData);
  return kvData;
}

// 4. Not found
return null;
```

### Data Backfill Strategy

**Critical: Must backfill existing KV data before switching reads**

#### Phase A: Historical Data Backfill (Before Dual-Write)
```bash
# Run once per data type before enabling Postgres reads
node scripts/backfill-messages.js     # ~1000 messages
node scripts/backfill-users.js        # ~100 users
node scripts/backfill-streaks.js      # ~50 active streaks
node scripts/backfill-invites.js      # ~200 invite codes
```

**Backfill validation:**
- Row count comparison (KV vs PG)
- Sample 10% of records, compare field-by-field
- Check latest records (last 24h) for currency
- Log any mismatches for manual review

#### Phase B: Dual-Write Period (1 week per data type)
```javascript
// Write to BOTH KV and Postgres
async function createMessage(from, to, text) {
  const message = { id: generateId(), from, to, text, created_at: Date.now() };

  // Write to both (Postgres first for fail-fast)
  try {
    await sql`INSERT INTO messages ...`;
  } catch (e) {
    console.error('PG write failed:', e);
    // Still write to KV to avoid data loss
  }

  try {
    await kv.hset('vibe:messages', message.id, JSON.stringify(message));
  } catch (e) {
    console.error('KV write failed:', e);
    // Continue - Postgres is source of truth
  }

  return message;
}
```

**Idempotency:** All writes use `INSERT ... ON CONFLICT DO UPDATE` to handle retries.

**Validation during dual-write:**
- Parallel reads: Query both KV and PG, compare results
- Alert on divergence >5% for any endpoint
- Daily reconciliation job to sync any missing rows

#### Phase C: Read Cutover
- Switch reads to Postgres only
- Keep KV writes active for 7 days (safety net)
- Monitor error rates, latency p95/p99

#### Phase D: KV Deprecation
- Stop KV writes
- Archive KV data to S3 for 30 days
- Remove KV dependencies from code

### Foreign Key Constraints

**Add referential integrity to prevent orphaned rows:**

```sql
-- After initial migration, add foreign keys
ALTER TABLE messages
  ADD CONSTRAINT fk_messages_from_user FOREIGN KEY (from_user) REFERENCES handles(handle) ON DELETE CASCADE,
  ADD CONSTRAINT fk_messages_to_user FOREIGN KEY (to_user) REFERENCES handles(handle) ON DELETE CASCADE;

ALTER TABLE board_entries
  ADD CONSTRAINT fk_board_author FOREIGN KEY (author) REFERENCES handles(handle) ON DELETE CASCADE;

ALTER TABLE achievements
  ADD CONSTRAINT fk_achievements_handle FOREIGN KEY (handle) REFERENCES handles(handle) ON DELETE CASCADE;
```

**Decision:** Add FKs after Phase A backfill completes, before dual-write starts.

### Query Pattern Validation

**Thread index optimization:**
```sql
-- Index uses LEAST/GREATEST for normalized user pairs
CREATE INDEX idx_messages_thread ON messages(
  LEAST(from_user, to_user),
  GREATEST(from_user, to_user),
  created_at DESC
);
```

**Required query pattern:**
```javascript
// CORRECT - matches index
const thread = await sql`
  SELECT * FROM messages
  WHERE LEAST(from_user, to_user) = LEAST(${user1}, ${user2})
    AND GREATEST(from_user, to_user) = GREATEST(${user1}, ${user2})
  ORDER BY created_at DESC
  LIMIT 50
`;

// WRONG - won't use index
const thread = await sql`
  SELECT * FROM messages
  WHERE (from_user = ${user1} AND to_user = ${user2})
     OR (from_user = ${user2} AND to_user = ${user1})
  ORDER BY created_at DESC
`;
```

**Validation:** Run `EXPLAIN ANALYZE` on all queries, verify index usage.

### Testing & Validation Strategy

**Pre-Migration (Backfill Validation):**
1. **Data parity tests** - Compare row counts KV vs PG per table
2. **Sample validation** - Field-by-field comparison on 10% of records
3. **Recency check** - Verify last 24h of data migrated correctly
4. **Foreign key validation** - Ensure all referenced handles exist

**During Dual-Write:**
1. **Parallel read testing** - Query both KV and PG, compare results
2. **Latency monitoring** - p50, p95, p99 for all endpoints
3. **Error rate tracking** - Alert if >1% write failures
4. **Divergence alerts** - Daily reconciliation, flag >5% mismatch

**Load Testing (Before Cutover):**
```bash
# Simulate 100 concurrent users
artillery quick --count 100 --num 50 https://www.slashvibe.dev/api/messages/inbox

# Target benchmarks:
# - p95 latency <200ms
# - Error rate <0.1%
# - Throughput >1000 req/min
```

**Post-Cutover Monitoring (7 days):**
- **Error budget:** <5 critical errors, <50 user-reported bugs
- **Performance:** Maintain p95 latency within 20% of baseline
- **Data integrity:** Zero data loss, zero silent failures

**Rollback Triggers:**
- Latency p95 >500ms sustained for >10min
- Error rate >5% on any endpoint
- Critical data loss incident
- >10 user-reported blocking bugs in 24h

### Rollback Plan
- Keep KV data for 30 days post-migration
- Feature flags per data type (`USE_POSTGRES_MESSAGES=true`)
- Can flip back to KV if critical bugs found (see rollback triggers above)
- Emergency rollback time: <5 minutes (flip env var, redeploy)

## Product Development (Parallel Track)

### While Migrating, Ship These Features:

**1. Registration Flow for Reserved Handles**
- Claim flow: Enter email → verify → claim reserved handle
- Onboarding: "What are you building?" → interests → suggested connections
- Profile setup: Avatar, bio, links

**2. Discovery Improvements**
- Better matching algorithm (interests + activity + social graph)
- "Someone you should meet" daily suggestions
- Explore page with filters (by interest, tier, recent activity)

**3. Inbox/Messaging UX Polish**
- Unread badges, read receipts
- Thread grouping by recency
- Quick reactions (🔥, ❤️, 👀)

**4. Profile Pages**
- Public profiles: `/profile/@handle`
- Show: bio, building, badge, streak, achievements
- Activity feed: recent messages, games, board posts

**5. Streaks & Gamification**
- Streak calendar view
- Achievement showcase on profile
- Leaderboards (streaks, achievements, activity)

## Technical Decisions & Tradeoffs

### Database Choice: Neon Postgres
**Pros:**
- Free tier sufficient for MVP (<1000 users)
- Serverless, auto-scaling
- WebSocket-based connection pooling (fast cold starts)
- ACID guarantees

**Cons:**
- Cold starts on free tier (~100ms first query)
- 0.5GB storage limit (need to monitor)

**Alternative considered:** Supabase (similar, more batteries-included)
**Decision:** Neon for lighter weight, already integrated

### Caching Strategy
**Now:** No caching, direct DB queries
**Future:** Redis/KV for high-frequency reads only
- Presence data (who's online)
- Recent board posts
- Hot profiles

**Decision:** Skip caching until we measure actual bottlenecks

### Query Optimization
**Indexes already defined** in schema.sql:
- `idx_messages_inbox` - for inbox queries
- `idx_messages_thread` - for conversation threads
- `idx_board_recent` - for board feed
- `idx_handles_tier` - for discovery by tier

**Future optimization:**
- Connection pooling tuning
- Read replicas if needed (Neon supports this)
- Materialized views for leaderboards

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data loss during migration | High | Low | Keep KV data 30 days, validation scripts |
| Performance regression | Medium | Medium | Benchmark before/after, rollback flags |
| Neon storage limits | Medium | Low | Monitor usage, upgrade if needed ($20/mo for 10GB) |
| Breaking changes to agents | Medium | Medium | Update agent configs, test in dev first |
| Migration takes longer than expected | Low | High | Ship product features in parallel, not blocked |

## Success Metrics

### Infrastructure
- ✅ Zero KV rate limit errors
- ✅ All endpoints use Postgres primary
- ✅ <200ms p95 latency for key queries
- ✅ Agent API calls use separate key for cost tracking

### Product
- 🎯 50+ artists claim reserved handles (first 2 weeks)
- 🎯 Daily active users maintain/grow during migration
- 🎯 Zero data loss incidents
- 🎯 Profile pages live and linked from directory

## Open Questions for Technical Advisor

**Addressed in this revision:**
- ✅ Backfill strategy now has 4-phase plan (A-D) with validation
- ✅ Idempotency via `INSERT ... ON CONFLICT DO UPDATE`
- ✅ Foreign keys added after backfill, before dual-write
- ✅ Query patterns documented for thread index (LEAST/GREATEST)
- ✅ Realistic cost estimates with storage projections
- ✅ Testing strategy with load tests, error budgets, rollback triggers

**Still seeking feedback on:**

1. **Migration velocity** - Should we migrate all endpoints in parallel (faster, riskier) or sequentially (safer, slower)? Recommend: Sequential per data type, but parallel for independent types (e.g., streaks + invites together).

2. **Caching strategy** - Skip caching entirely until we measure bottlenecks, or build KV cache layer now for presence/hot profiles? Recommend: Skip for now, add if p95 latency >200ms.

3. **Agent coordination** - Should agents write directly to Postgres (faster, requires connection pooling) or always via API endpoints (safer, easier to monitor)? Recommend: API endpoints for now, direct writes later if needed.

4. **Dual-write period** - Is 1 week per data type sufficient, or should we extend to 2 weeks for high-volume types (messages)? Recommend: 1 week for low-volume, 2 weeks for messages.

5. **Foreign key timing** - Add FKs immediately after backfill, or wait until after dual-write completes? Recommend: After backfill, before dual-write (catch issues early).

6. **Load testing timing** - Test before dual-write begins, or before cutover? Both? Recommend: Both - baseline before dual-write, regression test before cutover.

## Timeline

| Week | Infrastructure | Product |
|------|---------------|---------|
| 1 (Jan 8-14) | Users, messages, handles | Registration flow, profile pages |
| 2 (Jan 15-21) | Streaks, invites, games | Discovery improvements, inbox polish |
| 3 (Jan 22-28) | Social graph, cleanup | Leaderboards, achievement showcase |
| 4 (Jan 29+) | Remove KV fallbacks | Onboarding optimization |

**NODE Opening:** Jan 23-26 - Target to have 50+ artists onboarded for demos

## Resources

- **Schema:** `vibe-repo/schema.sql`
- **DB Helper:** `vibe-repo/api/lib/db.js`
- **Migration Script:** `vibe-repo/scripts/migrate-handles.js` (reference)
- **Admin UI:** https://www.slashvibe.dev/admin-handles.html
- **Observatory:** https://www.slashvibe.dev/observatory.html

## Cost Analysis

### Storage Estimation (Realistic)

**Current data (100 users):**
- Users/Handles: ~100 rows × 500 bytes = 50 KB
- Messages: ~1,000 messages × 1 KB avg = 1 MB
- Board: ~500 posts × 800 bytes = 400 KB
- Streaks: ~50 rows × 200 bytes = 10 KB
- Reserved handles: 460 × 500 bytes = 230 KB
- **Total: ~1.7 MB**

**Projected (1,000 users, 6 months):**
- Users/Handles: 1,000 × 500 bytes = 500 KB
- Messages: ~50,000 (50 messages/user) × 1 KB = 50 MB
- Board: ~5,000 posts × 800 bytes = 4 MB
- Streaks/Games/Achievements: ~2 MB
- **Total: ~56 MB**

**Upgrade trigger:**
- Neon Free: 0.5 GB (512 MB) storage limit
- **We hit 512 MB at ~10,000 active users or 500k messages**
- Estimated: 12-18 months at current growth

### Current (Mixed)
- Upstash KV: $0 (hit 500k request limit)
- Neon Postgres: $0 (free tier, ~2 MB used)
- Vercel: $0 (hobby plan)
- **Problem:** Can't scale KV without $20/mo jump, hit rate limits

### After Migration (Cost Projection)
- Upstash KV: Remove completely
- Neon Postgres:
  - **Year 1 (<1000 users):** $0 (free tier, <100 MB)
  - **Year 2 (1000-5000 users):** $20/mo (Launch plan, <10 GB)
  - **Year 3 (5000+ users):** $70+/mo (Scale plan)
- Vercel: $0 (hobby) → $20/mo (Pro) if serverless limits hit
- **Benefit:** Linear cost scaling, predictable, no surprise rate limits

### Agent API Costs (Anthropic Claude)
- Separate `vibe-agents-jan26` key for cost tracking
- **Current usage:** ~100k tokens/day across 8 agents
- **Estimated cost:** $15-30/mo on Sonnet (at $3/M input)
- **Optimization:** Can reduce agent verbosity, batch operations

---

**Next Steps:**
1. Get feedback on migration strategy
2. Begin Phase 1 (users + messages)
3. Ship registration flow in parallel
4. Monitor Postgres performance metrics
5. Daily check-ins on progress

**Contact:** Available for sync or async discussion
