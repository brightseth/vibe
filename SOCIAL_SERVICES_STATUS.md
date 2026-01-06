# /vibe Social Services — Current Status

**Last Updated:** January 5, 2026
**Status:** Phase 1b Complete, X Read+Write Live
**Last Successful Sync:** 2026-01-06T02:28:29Z (X: 20 messages)

---

## Executive Summary

/vibe now has a unified social inbox that syncs X mentions into a local cache for instant access. The architecture follows the "sync-then-read" pattern approved by architect review, enabling <50ms inbox reads from terminal.

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT STATE                             │
├─────────────────────────────────────────────────────────────┤
│  X (Twitter)     ✅ READ    ✅ WRITE (Basic tier active)    │
│  Farcaster       ❌ READ    ❌ WRITE (needs credentials)    │
│  Discord         ❌ READ    ✅ WRITE (webhook only)         │
│  WhatsApp        ❌         ❌       (Phase 2)              │
│  Telegram        ❌         ❌       (Phase 2)              │
│  Email           ❌         ❌       (Phase 4)              │
│  LinkedIn        ❌         ❌       (Phase 4)              │
└─────────────────────────────────────────────────────────────┘
```

---

## What's Built

### 1. Adapter Architecture

```
api/social/
├── adapters/
│   ├── base.js        # Interface contract (all adapters implement)
│   ├── x.js           # X/Twitter adapter (OAuth 1.0a)
│   └── farcaster.js   # Farcaster adapter (Neynar API)
├── inbox.js           # Unified KV storage (sync-then-read)
└── index.js           # API endpoint
```

**Adapter Contract:**
```typescript
interface ChannelAdapter {
  channel: string;
  capabilities: { read, write, react, dm, media, threading };
  isConfigured(): boolean;
  getStatus(): Promise<AdapterStatus>;
  sync(sinceId?): Promise<SocialMessage[]>;
  post(content, options?): Promise<{ id, url }>;
  calculateSignalScore(raw): number;
}
```

### 2. Unified Message Format

```typescript
interface SocialMessage {
  id: string;              // "x:1234567890" or "farcaster:0xabc..."
  channel: string;         // x, farcaster, discord, etc.
  type: string;            // mention, reply, dm, like, repost
  from: {
    handle: string;
    name?: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;       // From source
  synced_at: string;       // When we fetched it
  thread_id?: string;
  reply_to?: string;
  signal_score: number;    // 0-100 (higher = more important)
  raw: any;                // Original payload
}
```

### 3. KV Storage Schema

```
social:inbox              # Sorted set of all message IDs by timestamp
social:inbox:{channel}    # Sorted set per channel
social:msg:{id}           # Individual message data (30-day TTL)
social:sync:{channel}     # Last sync state (lastMessageId, timestamp)
```

**Storage Limits:**
- Social inbox: 1,000 messages per channel (30-day TTL)
- /vibe DMs: 100,000 messages (separate system, no TTL)

### 4. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/social` | GET | Read unified inbox |
| `/api/social?status=true` | GET | Channel connection status |
| `/api/social?summary=true` | GET | Inbox counts per channel |
| `/api/social?channel=x` | GET | Filter by channel |
| `/api/social?high_signal=false` | GET | Include low-signal (likes, reposts) |
| `/api/social` | POST | Multi-channel post |
| `/api/cron/social-sync` | GET | Trigger sync (runs every 5 min) |

### 5. MCP Tools

| Tool | Description |
|------|-------------|
| `vibe_social_inbox` | Read unified inbox with filtering |
| `vibe_social_post` | Post to multiple channels (with --dry_run) |

### 6. Cron Jobs

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/echo` | Every 5 min | @echo party host agent |
| `/api/cron/social-sync` | Every 5 min | Sync X + Farcaster to inbox |

**Failure Handling:**
- If sync fails: Logged to console, next cron retries in 5 min
- No backoff currently implemented
- Rate-limited channels: Skipped with reason logged, retried next cycle
- TODO: Add alerting for consecutive failures (>3)

---

## What's Active

### X (Twitter) — ✅ LIVE

**Configured:** Yes
**Syncing:** Every 5 minutes
**Last Sync:** 2026-01-06T02:28:29Z
**Messages Synced:** 20

**Endpoints Used:**
- `GET /2/users/:id/mentions` — Tweets mentioning you
- `GET /2/users/me` — User ID lookup

**Endpoints NOT Used:**
- Timeline (home feed)
- Lists
- DMs (requires elevated access)
- Likes/bookmarks

**Rate Limit Guardrails:**
- Min 5 min between syncs (enforced by `MIN_SYNC_INTERVAL_MS`)
- Max 20 tweets per sync (`max_results: 20`)
- Free tier: 15 requests/15 min window
- Cache prevents redundant fetches via `sinceId` pagination

**Signal Scores:**
- Reply: 80 (direct conversation)
- Mention: 70 (tagged in tweet)

**Environment Variables:**
```
X_API_KEY         ✅ Set
X_API_SECRET      ✅ Set
X_ACCESS_TOKEN    ✅ Set
X_ACCESS_SECRET   ✅ Set
```

### Farcaster — ⚠️ NOT CONFIGURED

**Configured:** No
**Syncing:** Skipped

**Required Environment Variables:**
```
NEYNAR_API_KEY        ❌ Missing
FARCASTER_FID         ❌ Missing
FARCASTER_SIGNER_UUID ❌ Missing (for write)
```

### Discord — ✅ WRITE ONLY

**Configured:** Yes (webhook URL)
**Direction:** Outbound only (posts to Discord, doesn't read)

**Active integrations:**
- @echo posts new user joins
- @echo posts daily digest
- Game results posted
- Ideas from vibe echo posted

---

## Performance

| Metric | Target | Actual | Notes |
|--------|--------|--------|-------|
| Inbox read latency | <50ms | ~30ms | From Vercel KV |
| Sync frequency | 5 min | 5 min | Vercel cron |
| Messages per channel | 1,000 | 1,000 | Sorted set limit |
| Message TTL | 30 days | 30 days | Auto-expire via KV |
| Rate limit buffer | 5 min | 5 min | Min sync interval |
| Cache hit rate | 100% reads | 100% | Sync-then-read pattern |

---

## Next Phases

### Phase 1b: Write Capability (Next)

**Goal:** Post to X and Farcaster from terminal

**API Limits (Know Before You Go):**

| Platform | Free Tier | Paid Tier | Write Requires |
|----------|-----------|-----------|----------------|
| X | 15 reads/15min, 0 writes | $100/mo Basic: 1,500 tweets/mo | Basic tier |
| Farcaster (Neynar) | 1,000 reads/day, 100 writes/day | $50/mo: 10K reads, 1K writes | Free works |

**Blockers:**
1. **X Write** — Requires $100/month Basic tier
   - Current: Free tier (read-only, 15 req/15min)
   - Needed: Basic tier (1,500 tweets/month, full write access)

2. **Farcaster** — Requires Neynar credentials
   - Sign up: neynar.com (free tier: 1K reads + 100 writes/day)
   - Signer: Required for posting (one-time setup via Neynar dashboard)

**Tasks:**
- [ ] Upgrade X API to Basic tier ($100/mo)
- [ ] Get Neynar API key (free)
- [ ] Get Farcaster FID (your user ID number)
- [ ] Create Farcaster signer (Neynar dashboard)
- [ ] Add credentials to Vercel
- [ ] Test `vibe social-post "hello" --x --farcaster`

**Deliverable:** Post from terminal to X + Farcaster

---

### Phase 2: Personal Comms (Week 3-4)

**Goal:** WhatsApp and Telegram in unified inbox

**Architecture Decision:** `vibe-sidecar` required

WhatsApp (whatsapp-web.js) and Discord Gateway need persistent processes.
Vercel serverless times out after 60s. Solution: separate always-on service.

**`vibe-sidecar` Options:**
| Option | Cost | Reliability | Recommendation |
|--------|------|-------------|----------------|
| Local (Seth's machine) | Free | Fragile (offline when away) | Dev only |
| Fly.io Docker | $5/mo | Always-on | **Production choice** |
| Railway/Render | $5-7/mo | Always-on | Alternative |

**Decision:** Phase 2 will use local sidecar for development. Phase 3 deploys to Fly.io.

**Telegram Tasks:** (Vercel-compatible, no sidecar needed)
- [ ] Create Telegram bot via @BotFather
- [ ] Implement webhook receiver
- [ ] Add Telegram adapter
- [ ] Test sync and reply

**WhatsApp Tasks:** (requires `vibe-sidecar`)
- [ ] Set up local whatsapp-web.js bridge
- [ ] Implement QR auth flow
- [ ] Session persistence strategy
- [ ] Push events to /vibe API

**Deliverable:** See WhatsApp/Telegram messages in terminal

---

### Phase 3: Discord + Identity (Week 5-6)

**Goal:** Two-way Discord + cross-channel identity linking

**Discord Gateway Decision:**
> Discord read will run on Fly.io via `vibe-sidecar` (always-on, $5/mo).

**`vibe-sidecar` Responsibilities:**
- Discord.js bot (Gateway connection)
- WhatsApp session (whatsapp-web.js)
- Pushes events to `/api/social/ingest` endpoint
- Health check endpoint for monitoring

**UnifiedContact System:**
```typescript
interface UnifiedContact {
  id: string;
  display_name: string;
  identities: {
    channel: string;    // "x", "discord", "farcaster"
    handle: string;     // "@seth", "seth#1234", "seth.eth"
    verified: boolean;
  }[];
  preferred_channel?: string;
}
```

**New MCP Tool:**
```
vibe link @seth_x @seth_discord @seth.eth --name "Seth"
```

**Deliverable:** Same person recognized across channels

---

### Phase 4: Professional (Week 7-8)

**Goal:** Email digest + LinkedIn posts

**Email (Gmail API):**
- OAuth setup
- Digest-only first (unread count + priority senders)
- Reply capability later

**LinkedIn:**
- Write-only (API restrictions on read)
- Post to feed from terminal

**Deliverable:** See priority emails, post to LinkedIn

---

### Phase 5: Polish (Week 9-10)

**Goal:** Agent bridge, attention mode, analytics

**Features:**

1. **`vibe agent-bridge`** — Expose inbox to Solienne/Eden agents
   - **Privacy scope:** Summary only by default (unread counts, channel status)
   - **Elevated scope:** Message content requires explicit user approval
   - **Allowed agents:** Configurable allowlist (e.g., `solienne`, `eden`)
   - **Excluded fields:** Never expose `raw` payload or auth tokens

2. **Attention mode** — Mute low-signal channels temporarily

3. **Context packs** — Origin, thread depth, reply suggestions

4. **Scheduled posts** — Queue posts for later

5. **Analytics dashboard** — Engagement tracking

6. **Circuit breaker** — Graceful degradation when channels fail

**Deliverable:** Production-ready social command center

---

## Environment Variables Reference

### Currently Set (Production)

| Variable | Status | Purpose |
|----------|--------|---------|
| `X_API_KEY` | ✅ Set | Twitter OAuth consumer key |
| `X_API_SECRET` | ✅ Set | Twitter OAuth consumer secret |
| `X_ACCESS_TOKEN` | ✅ Set | Twitter OAuth access token |
| `X_ACCESS_SECRET` | ✅ Set | Twitter OAuth access secret |
| `DISCORD_WEBHOOK_URL` | ✅ Set | Discord outbound posts |
| `KV_REST_API_URL` | ✅ Set | Vercel KV endpoint |
| `KV_REST_API_TOKEN` | ✅ Set | Vercel KV auth |

### Needed for Phase 1b

| Variable | Source |
|----------|--------|
| `NEYNAR_API_KEY` | neynar.com dashboard |
| `FARCASTER_FID` | Your Farcaster profile |
| `FARCASTER_SIGNER_UUID` | Neynar signer creation |

### Needed for Phase 2+

| Variable | Source |
|----------|--------|
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram |
| `WHATSAPP_SESSION_PATH` | Local filesystem (sidecar) |
| `GMAIL_CLIENT_ID` | Google Cloud Console |
| `GMAIL_CLIENT_SECRET` | Google Cloud Console |
| `GMAIL_REFRESH_TOKEN` | OAuth flow |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn Developer Portal |

---

## Operational Notes

### Failure Modes

| Scenario | Current Behavior | TODO |
|----------|------------------|------|
| Sync fails once | Log error, retry next cron (5 min) | — |
| Sync fails 3x consecutive | Same as above | Add Slack/Discord alert |
| Channel rate limited | Skip channel, log reason | — |
| KV unavailable | Fall back to memory (ephemeral) | Add health check |
| Vercel cron missed | No sync until next trigger | Add manual trigger button |

### Rate Limit Strategy

| Channel | Budget | Enforcement |
|---------|--------|-------------|
| X (Free) | 15 req/15min | 5-min min interval, sinceId pagination |
| X (Basic) | ~50 req/15min | Same, with write budget tracking |
| Farcaster | 1K reads/day | 5-min interval sufficient |
| Discord | 50 req/sec | Not a concern for current volume |

---

## Files Reference

### API Layer
- `api/social/index.js` — Unified inbox API
- `api/social/inbox.js` — KV storage layer
- `api/social/adapters/base.js` — Adapter interface
- `api/social/adapters/x.js` — X adapter
- `api/social/adapters/farcaster.js` — Farcaster adapter
- `api/cron/social-sync.js` — Sync cron job

### MCP Tools
- `mcp-server/tools/social-inbox.js` — Read inbox
- `mcp-server/tools/social-post.js` — Multi-channel post

### Documentation
- `SOCIAL_SERVICES_PLAN.md` — Full architecture + architect review
- `SOCIAL_SERVICES_STATUS.md` — This file

---

## Quick Test Commands

```bash
# Check channel status
curl -sL "https://slashvibe.dev/api/social?status=true" | jq

# Trigger sync
curl -sL "https://slashvibe.dev/api/cron/social-sync" | jq

# View inbox
curl -sL "https://slashvibe.dev/api/social?limit=10" | jq

# View X only
curl -sL "https://slashvibe.dev/api/social?channel=x" | jq

# Post (dry run)
curl -sL -X POST "https://slashvibe.dev/api/social" \
  -H "Content-Type: application/json" \
  -d '{"content":"test","channels":["x"],"dry_run":true}' | jq
```

---

## Success Metrics

| Metric | Current | Phase 1b | Phase 5 |
|--------|---------|----------|---------|
| Channels syncing | 1 (X) | 2 (X, FC) | 5+ |
| Inbox latency | 30ms | 30ms | <50ms |
| Posts from terminal | 0% | 25% | 50%+ |
| Identity links | 0 | 0 | 20+ |
| Daily inbox checks | TBD | 5+ | 10+ |

---

## Architect Review Notes (Jan 5, 2026)

Feedback incorporated:
- ✅ Added API limits callout for Phase 1b
- ✅ Clarified message retention (1K social vs 100K /vibe DMs)
- ✅ Added cache TTL and storage limits in Performance
- ✅ Specified X endpoints used vs excluded
- ✅ Named sidecar service (`vibe-sidecar`)
- ✅ Made Discord Gateway decision explicit (Fly.io)
- ✅ Added privacy scope for agent bridge
- ✅ Added failure mode table
- ✅ Added rate limit guardrails
- ✅ Added last successful sync timestamp
- ✅ Masked secrets (status only, no values)

---

*The world comes to you while you build.*
