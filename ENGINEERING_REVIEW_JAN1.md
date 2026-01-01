# Engineering Review (Jan 1, 2026)

Feedback from engineering advisor on codebase review.

---

## Critical Findings

### 1. Authentication is Missing (CRITICAL)

**Problem:** Requests are unauthenticated and allow spoofing any handle/session. Anyone can send DMs or claim presence as another user. `sessionId` isn't a secret and there's no server-side validation.

**Files:** `api/presence.js:191-257`, `api/messages.js:74-106`

**Fix:** Add server-issued token on `/vibe init`, or sign sessionId with server secret (HMAC). Require token for all write endpoints. Include `from` in token to prevent spoofing.

### 2. Message Storage Won't Scale (HIGH)

**Problem:** DM storage is a single global array in KV. Concurrent writes can clobber each other. List grows unbounded. Inbox reads become O(N) and eventually slow/expensive. Will bite well before 1k users.

**Files:** `api/messages.js:15-105`, `api/messages.js:116-231`

**Fix:** Move to per-user inbox lists:
- `LPUSH inbox:${user}` for inbox
- `LPUSH thread:${a}:${b}` for threads
- Add trimming to prevent unbounded growth

---

## Medium Findings

### 3. Read Receipts Missing Timestamp

**Problem:** `markRead=true` sets `read: true` but no `readAt`, so outbox read receipts show "Read NaN" or inconsistent timestamps.

**Files:** `api/messages.js:170-208`

### 4. No Request Timeouts

**Problem:** Client API requests have no timeout or non-2xx handling. A hung or erroring API call can stall tool handlers or silently "succeed" with `{ raw }`.

**Files:** `mcp-server/store/api.js:12-47`

### 5. Stack Traces in Production

**Problem:** API error responses include stack traces. Useful for dev but leaks internals in prod.

**Files:** `api/presence.js:324-329`

---

## Short-Term Recommendations (Next 2 Weeks)

### MCP Architecture
Tool-per-feature is fine, but consolidate shared logic into `mcp-server/tools/_shared` (formatting, error handling, network retry/backoff). You'll feel pain when new features need cross-cutting changes.

### Session Management
Add server-issued token on init, or sign sessionId with server secret (HMAC). Require for all write endpoints. Include `from` in token to prevent spoofing.

### Presence Polling
Keep polling but add `since` or `etag` on `/api/presence` and allow clients to back off if no changes. Store last-seen in sorted set to avoid keys scans and make "who's online" O(log N).

### Agent Bridges
Model as "workers" with single abstraction: `fetch_updates(since_cursor)` → `handle_messages` → `send_responses`. Use cursor + dedupe to avoid reprocessing. Later swap in queues/SSE.

### Code Quality
Biggest fixes are auth, message storage, and request timeouts. Add simple tests for auth spoofing and message write concurrency.

---

## Long-Term Recommendations (3-6 Months)

### Scale to 1000 Users
Presence as `presence:${username}` breaks when you keys scan and need fast online queries.

**Better pattern:**
- `ZADD presence:lastSeen` for sorted set
- `HSET presence:data` for user data
- Query with `ZRANGEBYSCORE` for online users

**Messages:**
- `LPUSH inbox:${user}` for per-user inbox
- `LPUSH thread:${a}:${b}` for threads
- Add trimming, not global array

### Real-Time
Polling becomes noisy around hundreds of active users hitting every 30s.

**Migration path:**
- Keep REST for reads/writes
- Add `GET /api/presence/stream` (SSE)
- Let clients opt-in when available
- Tools fall back to polling

### E2E Encryption
Simplest path: per-user keypairs + per-message envelope encryption (libsodium sealed boxes).
- Store ciphertext in API
- Optional "share with Claude" flag includes cleartext copy or separate encrypted key for Claude's public key
- Keeps UX with explicit consent

### Collective Intelligence
Start storing structured session summaries now with metadata (participants, repo, tags, timestamps). Add background job to embed summaries into vector store (pgvector or sqlite+embedding files). Avoids painful migration later.

### Agent-to-Agent Protocol
You'll want a protocol envelope with:
- `type`
- `schema_version`
- `idempotency_key`
- `reply_to`
- `capabilities`
- Optional signatures

This prevents loops, enables retries, and future-proofs payload formats.

---

## "If I Were Taking Over Tomorrow"

**Fix first:**
1. Authentication + identity proofing for presence/messages (spoofing undermines the whole social layer)
2. Message storage model (avoid data loss and scaling cliffs)

**One architectural decision to change before it's too late:**
Move away from "single array of all messages" and keys scans. Introduce index structures now:
- Per-user inbox lists
- Presence sorted set

It's the hardest change to make later.

---

## Action Items

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Add signed session tokens | 1-2 days |
| P0 | Migrate messages to per-user lists | 2-3 days |
| P0 | Migrate presence to sorted set | 1 day |
| P1 | Add request timeouts in client | 2 hours |
| P1 | Fix read receipt timestamps | 1 hour |
| P1 | Strip stack traces in prod | 30 min |
| P2 | Add `_shared` utils for MCP tools | 1 day |
| P2 | Add cursor/dedupe to agent bridges | 1 day |
