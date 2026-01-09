# Response to Technical Advisor Review

**Date:** January 8, 2026
**Re:** Postgres Migration Spec Review

## Document Clarification

You reviewed: `agents/RFC_DATABASE_MIGRATION.md` (older agent team RFC)
**Please review:** `docs/POSTGRES_MIGRATION_SPEC.md` (current migration plan)

The new spec addresses all findings from your review.

## Findings Addressed

### ✅ Critical: Backfill Strategy
**Your finding:** "Dual-write plan never backfills existing KV data before switching reads"

**Resolution:** Added 4-phase migration strategy (Section: "Data Backfill Strategy"):
- **Phase A:** Historical data backfill (before dual-write)
  - One-time scripts per data type
  - Validation: row counts, 10% sample comparison, recency check
- **Phase B:** Dual-write period (1-2 weeks)
  - Write to both KV and Postgres
  - Idempotency via `INSERT ... ON CONFLICT DO UPDATE`
- **Phase C:** Read cutover (switch to Postgres reads)
- **Phase D:** KV deprecation (30-day archive)

**Location:** Lines 127-186

### ✅ High: Idempotency & Validation
**Your finding:** "No idempotency or row-level parity plan if one write fails"

**Resolution:**
1. **Idempotency:** All writes use `INSERT ... ON CONFLICT DO UPDATE`
2. **Validation during dual-write:**
   - Parallel reads (query both, compare)
   - Alert on >5% divergence
   - Daily reconciliation job
3. **Write failure handling:**
   - Postgres write fails → still write to KV (avoid data loss)
   - KV write fails → continue (Postgres is source of truth)

**Location:** Lines 146-176

### ✅ Medium: Thread Index Query Patterns
**Your finding:** "Thread index uses LEAST/GREATEST but spec doesn't mandate query shapes"

**Resolution:** Added "Query Pattern Validation" section with:
- Correct query pattern (matches index)
- Incorrect pattern (won't use index)
- Validation requirement: `EXPLAIN ANALYZE` on all queries

**Location:** Lines 207-239

### ✅ Medium: Foreign Keys
**Your finding:** "No foreign keys; user renames/deletes can leave orphaned rows"

**Resolution:** Added "Foreign Key Constraints" section:
- FK from `messages.from_user` → `handles.handle` (ON DELETE CASCADE)
- FK from `messages.to_user` → `handles.handle` (ON DELETE CASCADE)
- FK from `board_entries.author` → `handles.handle` (ON DELETE CASCADE)
- FK from `achievements.handle` → `handles.handle` (ON DELETE CASCADE)
- **Timing:** Add after Phase A backfill, before Phase B dual-write

**Location:** Lines 188-205

### ✅ Low: Cost Analysis Assumptions
**Your finding:** "Cost analysis understates upgrade trigger (no message size assumptions)"

**Resolution:** Replaced with realistic storage estimation:
- **Current:** ~1.7 MB (100 users)
- **6 months:** ~56 MB (1,000 users, 50k messages)
- **Upgrade trigger:** 512 MB at ~10,000 users or 500k messages
- **Timeline:** 12-18 months at current growth
- Multi-year cost projection included

**Location:** Lines 366-407

### ✅ Testing Strategy
**Your question:** "What testing/validation strategy (load, latency, parity)?"

**Resolution:** Added "Testing & Validation Strategy" section:
- Pre-migration: Data parity tests, sample validation
- During dual-write: Parallel reads, latency monitoring
- Load testing: Artillery benchmarks (100 concurrent, p95 <200ms)
- Post-cutover: 7-day error budget, performance monitoring
- Rollback triggers: Latency >500ms, error rate >5%, data loss

**Location:** Lines 241-281

## Timeline Clarification

- **Old RFC:** 4 days (unrealistic sprint)
- **New Spec:** 4 weeks (realistic, phased)
  - Week 1: Users + Messages
  - Week 2: Streaks + Invites + Games
  - Week 3: Social graph
  - Week 4: Cleanup

**Location:** Lines 397-406

## Remaining Open Questions

The updated spec includes 6 questions where I'd value your input (with my recommendations):

1. **Migration velocity** - Parallel vs sequential per data type?
2. **Caching strategy** - Build now or measure first?
3. **Agent coordination** - Direct DB writes or API endpoints?
4. **Dual-write period** - 1 week sufficient or 2 weeks for high-volume?
5. **Foreign key timing** - Before or after dual-write?
6. **Load testing timing** - When to run baseline vs regression tests?

**Location:** Lines 373-395

## Next Steps

1. Review `docs/POSTGRES_MIGRATION_SPEC.md` (not the old RFC)
2. Provide feedback on 6 remaining questions
3. Approve to proceed with Phase A (backfill scripts)

Thank you for the thorough review! All critical/high findings now addressed.
