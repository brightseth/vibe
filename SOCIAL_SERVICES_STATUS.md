# /vibe Social Services — Current Status

**Last Updated:** January 5, 2026
**Status:** Phase 1a Complete, X Live

---

## Executive Summary

/vibe now has a unified social inbox that syncs X mentions into a local cache for instant access. The architecture follows the "sync-then-read" pattern approved by architect review, enabling <50ms inbox reads from terminal.

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT STATE                             │
├─────────────────────────────────────────────────────────────┤
│  X (Twitter)     ✅ READ    ❌ WRITE (needs $100/mo tier)   │
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

---

## What's Active

### X (Twitter) — ✅ LIVE

**Configured:** Yes (credentials in Vercel)
**Syncing:** Every 5 minutes
**Messages:** 20 synced (mentions + replies)

**Capabilities:**
- ✅ Read mentions
- ✅ Read replies
- ❌ Read DMs (requires elevated API access)
- ❌ Write tweets (requires $100/mo Basic tier)

**Signal Scores:**
- Reply: 80
- Mention: 70

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
NEYNAR_API_KEY        ❌ Missing (get from neynar.com)
FARCASTER_FID         ❌ Missing (your Farcaster ID number)
FARCASTER_SIGNER_UUID ❌ Missing (for write access)
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

| Metric | Target | Actual |
|--------|--------|--------|
| Inbox read latency | <50ms | ~30ms (from KV) |
| Sync frequency | 5 min | 5 min |
| Messages retained | 1000 | 1000 (30-day TTL) |
| Rate limit buffer | 5 min cache | 5 min |

---

## Next Phases

### Phase 1b: Write Capability (Next)

**Goal:** Post to X and Farcaster from terminal

**Blockers:**
1. **X Write** — Requires upgrading to X API Basic tier ($100/month)
   - Current tier: Free (read-only)
   - Needed: Basic tier (1,500 tweets/month)

2. **Farcaster** — Requires Neynar credentials
   - Sign up at neynar.com (free tier available)
   - Create a signer for write access

**Tasks:**
- [ ] Upgrade X API to Basic tier
- [ ] Get Neynar API key
- [ ] Get Farcaster FID
- [ ] Create Farcaster signer
- [ ] Add credentials to Vercel
- [ ] Test `vibe social-post "hello" --x --farcaster`

**Deliverable:** Post from terminal to X + Farcaster

---

### Phase 2: Personal Comms (Week 3-4)

**Goal:** WhatsApp and Telegram in unified inbox

**Architecture Decision:** Sidecar required

WhatsApp (whatsapp-web.js) and Discord Gateway need persistent processes.
Vercel serverless times out after 60s.

**Options:**
1. **Local sidecar** — Run on Seth's machine (free, fragile)
2. **Fly.io sidecar** — Always-on Docker ($5/mo)
3. **Defer** — Skip until Phase 3

**Telegram Tasks:**
- [ ] Create Telegram bot via @BotFather
- [ ] Implement webhook receiver
- [ ] Add Telegram adapter
- [ ] Test sync and reply

**WhatsApp Tasks:**
- [ ] Set up local whatsapp-web.js bridge
- [ ] Implement QR auth flow
- [ ] Session persistence strategy
- [ ] Push events to /vibe API

**Deliverable:** See WhatsApp/Telegram messages in terminal

---

### Phase 3: Discord + Identity (Week 5-6)

**Goal:** Two-way Discord + cross-channel identity linking

**Discord Gateway:**
- Deploy sidecar to Fly.io
- Implement Discord.js bot
- Sync channel messages to inbox
- Reply from terminal

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
- `vibe agent-bridge` — Expose inbox to Solienne/Eden agents
- Attention mode — Mute low-signal channels temporarily
- Context packs — Origin, thread depth, reply suggestions
- Scheduled posts
- Analytics dashboard
- Circuit breaker for channel failures

**Deliverable:** Production-ready social command center

---

## Environment Variables Reference

### Currently Set (Production)

```bash
# X (Twitter) - ✅ Active
X_API_KEY=dpmPQj53vh7zenGceNCAU5Y5j
X_API_SECRET=j4cRn...
X_ACCESS_TOKEN=3520-IwPt3o...
X_ACCESS_SECRET=aWPnJ0k9d...

# Discord - ✅ Active (webhook only)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# KV - ✅ Active
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

### Needed for Phase 1b

```bash
# Farcaster (Neynar)
NEYNAR_API_KEY=           # From neynar.com
FARCASTER_FID=            # Your Farcaster ID (e.g., 1234)
FARCASTER_SIGNER_UUID=    # For posting (create via Neynar)
```

### Needed for Phase 2+

```bash
# Telegram
TELEGRAM_BOT_TOKEN=       # From @BotFather

# WhatsApp (sidecar config)
WHATSAPP_SESSION_PATH=    # Local session storage

# Email
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=
```

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

*The world comes to you while you build.*
