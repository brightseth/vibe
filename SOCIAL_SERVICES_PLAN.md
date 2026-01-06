# /vibe Social Services Integration Plan

**Goal:** Make /vibe the flow state command center for all creative communications.

**Principle:** You shouldn't have to leave your terminal to stay connected. The world comes to you while you build.

---

## 1. Vision

```
┌─────────────────────────────────────────────────────────┐
│                      /vibe                               │
│                                                          │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│   │   INBOX     │  │    POST     │  │   PRESENCE  │    │
│   │ All channels│  │ Multi-cast  │  │  Who's here │    │
│   └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
    ┌─────────────────────────────────────────────────┐
    │              CHANNEL ADAPTERS                    │
    │  X │ Discord │ WhatsApp │ Farcaster │ Telegram  │
    │  Email │ LinkedIn │ Instagram │ SMS │ Slack     │
    └─────────────────────────────────────────────────┘
```

**User Experience:**

```bash
# Unified inbox across all channels
> vibe inbox
📬 12 unread across 5 channels
  X (3): @genekogan replied, @pmarca liked, mention in thread
  WhatsApp (2): Kristi, NODE group
  Discord (4): #vibe activity
  Farcaster (2): replies to your cast
  Email (1): Phil re: NODE

# Read a specific channel
> vibe inbox --x
> vibe inbox --whatsapp

# Reply from terminal
> vibe reply @genekogan "thanks! trying something new with agent comms"

# Post to multiple channels at once
> vibe post "just shipped the Discord bridge for /vibe" --x --farcaster --linkedin

# Quick reactions
> vibe react @genekogan 🔥 --x
```

---

## 2. Architecture

### 2.1 Core Components

```
/Users/seth/vibe-public/
├── api/
│   ├── social/
│   │   ├── inbox.js          # Unified inbox aggregator
│   │   ├── post.js           # Multi-channel posting
│   │   ├── adapters/
│   │   │   ├── x.js          # Twitter/X adapter
│   │   │   ├── discord.js    # Discord adapter (exists)
│   │   │   ├── whatsapp.js   # WhatsApp adapter
│   │   │   ├── farcaster.js  # Farcaster adapter
│   │   │   ├── telegram.js   # Telegram adapter
│   │   │   ├── email.js      # Email adapter
│   │   │   ├── linkedin.js   # LinkedIn adapter
│   │   │   └── instagram.js  # Instagram adapter
│   │   └── auth/
│   │       └── oauth.js      # OAuth flows for each service
├── mcp-server/
│   └── tools/
│       ├── inbox.js          # MCP tool for inbox
│       ├── post.js           # MCP tool for posting
│       └── social.js         # Social utilities
```

### 2.2 Data Model

```typescript
// Unified message format
interface SocialMessage {
  id: string;
  channel: 'x' | 'discord' | 'whatsapp' | 'farcaster' | 'telegram' | 'email' | 'linkedin' | 'instagram';
  type: 'dm' | 'mention' | 'reply' | 'like' | 'repost' | 'group' | 'email';
  from: {
    handle: string;
    name?: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  thread_id?: string;
  reply_to?: string;
  media?: string[];
  raw: any; // Original payload for channel-specific features
}

// Unified post format
interface SocialPost {
  content: string;
  channels: string[];
  media?: string[];
  reply_to?: {
    channel: string;
    id: string;
  };
  schedule?: string; // ISO timestamp for scheduled posts
}

// Channel credentials (stored securely)
interface ChannelAuth {
  channel: string;
  user_id: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  scopes: string[];
}
```

### 2.3 Security Model

- **Credentials stored in Vercel KV** (encrypted at rest)
- **OAuth flows for services that support it** (X, Discord, LinkedIn)
- **API keys for simpler services** (Telegram, Farcaster)
- **Session tokens for WhatsApp** (QR code auth)
- **No credentials in code or logs**
- **User controls which channels are connected**

---

## 3. Channel-by-Channel Plan

### 3.1 X (Twitter)

**Status:** Read (mentions) ✅ | Write ❌

**API:** X API v2 (requires paid tier for write)

**Read capabilities:**
- [x] Mentions (existing)
- [ ] DMs
- [ ] Replies to your tweets
- [ ] Likes/reposts notifications
- [ ] List activity

**Write capabilities:**
- [ ] Post tweet
- [ ] Reply to tweet
- [ ] Like/repost
- [ ] DM

**Auth:** OAuth 2.0 with PKCE

**Cost:** $100/month (Basic tier for write access)

**Implementation notes:**
- Already have read working via X mentions tool
- Need to upgrade to paid API tier for write
- Rate limits: 1500 tweets/month on Basic tier
- Consider caching to reduce API calls

**Priority: HIGH** — You're active here, closes the loop

---

### 3.2 Discord

**Status:** Read ❌ | Write ✅ (webhook)

**API:** Discord API + Webhooks

**Read capabilities:**
- [ ] Channel messages
- [ ] DMs
- [ ] Mentions
- [ ] Reactions

**Write capabilities:**
- [x] Webhook posts (existing)
- [ ] Reply to messages
- [ ] React to messages
- [ ] DMs

**Auth:** Bot token + OAuth2 for user actions

**Cost:** Free

**Implementation notes:**
- Webhook bridge exists, one-way
- For two-way, need Discord bot with gateway connection
- Bot needs to be online 24/7 (use Fly.io or similar)
- Can use discord.js library

**Priority: MEDIUM** — Webhook works, bot adds complexity

---

### 3.3 WhatsApp

**Status:** Read ❌ | Write ❌

**API:** WhatsApp Business API or whatsapp-web.js

**Read capabilities:**
- [ ] Personal messages
- [ ] Group messages
- [ ] Media

**Write capabilities:**
- [ ] Send message
- [ ] Reply
- [ ] Send to groups

**Auth:** QR code session (whatsapp-web.js) or Business API

**Cost:**
- whatsapp-web.js: Free but fragile (unofficial)
- Business API: Pay per message, requires business verification

**Implementation notes:**
- **Option A: whatsapp-web.js** — Puppeteer-based, works like WhatsApp Web
  - Pros: Free, full access, personal account
  - Cons: Unofficial, can break, needs browser running
- **Option B: Business API** — Official but limited
  - Pros: Stable, official
  - Cons: Business account only, costs per message, templates required for outbound
- **Recommendation:** Start with whatsapp-web.js for personal use, accept fragility

**Priority: HIGH** — Personal comms, high signal (Kristi, family, close contacts)

---

### 3.4 Farcaster

**Status:** Read ❌ | Write ❌

**API:** Neynar API or Hubble direct

**Read capabilities:**
- [ ] Feed
- [ ] Mentions
- [ ] Replies
- [ ] Channel activity

**Write capabilities:**
- [ ] Cast
- [ ] Reply
- [ ] Like/recast

**Auth:** Farcaster signer (custody or delegated)

**Cost:** Neynar free tier generous, paid for higher volume

**Implementation notes:**
- Neynar is the easiest path (REST API)
- Can also run Hubble node for direct access
- Need Farcaster account with signer set up
- Web3-native, fits /vibe ethos
- Growing community of builders

**Priority: HIGH** — Web3 native, builder community, good fit

---

### 3.5 Telegram

**Status:** Read ❌ | Write ❌

**API:** Telegram Bot API

**Read capabilities:**
- [ ] DMs to bot
- [ ] Group messages (where bot is member)
- [ ] Channel posts

**Write capabilities:**
- [ ] Send message
- [ ] Reply
- [ ] Send to groups/channels

**Auth:** Bot token from @BotFather

**Cost:** Free

**Implementation notes:**
- Create bot via @BotFather
- Bot can only see messages where it's mentioned or in groups where it's member
- For personal messages, need to message through bot
- Very clean API, easy to implement
- Long polling or webhooks for real-time

**Priority: MEDIUM** — Good API, but need to adapt to bot model

---

### 3.6 Email

**Status:** Read ❌ | Write ❌

**API:** IMAP/SMTP or Gmail API or service like Nylas

**Read capabilities:**
- [ ] Inbox
- [ ] Specific folders/labels
- [ ] Search
- [ ] Attachments

**Write capabilities:**
- [ ] Send email
- [ ] Reply
- [ ] Forward

**Auth:** OAuth (Gmail) or IMAP credentials

**Cost:**
- Gmail API: Free
- Nylas: Paid but unified API

**Implementation notes:**
- **Option A: Gmail API** — Best if primarily Gmail
- **Option B: IMAP** — Works with any provider
- **Option C: Nylas** — Unified API across providers
- Email is high-friction (long messages, threading, formatting)
- Consider "email digest" approach vs full inbox
- Maybe just surface unread count + priority senders

**Priority: MEDIUM** — High leverage but complex, start simple

---

### 3.7 LinkedIn

**Status:** Read ❌ | Write ❌

**API:** LinkedIn API (restricted)

**Read capabilities:**
- [ ] Messages (very limited)
- [ ] Notifications
- [ ] Connection requests

**Write capabilities:**
- [ ] Post to feed
- [ ] Share content

**Auth:** OAuth 2.0

**Cost:** Free but restricted

**Implementation notes:**
- LinkedIn API is very locked down
- Posting to feed is possible
- Reading messages requires special partnership
- May need to use unofficial methods (brittle)
- Consider LinkedIn as write-only for now

**Priority: LOW** — API restrictions make it hard

---

### 3.8 Instagram

**Status:** Read ❌ | Write ❌

**API:** Instagram Graph API (Business/Creator accounts only)

**Read capabilities:**
- [ ] Comments on posts
- [ ] DMs (Business API)
- [ ] Mentions

**Write capabilities:**
- [ ] Post photo/video (scheduled)
- [ ] Reply to comments
- [ ] Reply to DMs

**Auth:** Facebook OAuth

**Cost:** Free (requires Business/Creator account)

**Implementation notes:**
- Need Business or Creator account
- Connected through Facebook
- Can't post in real-time (must be pre-uploaded media)
- Good for scheduled content
- DMs only for Business accounts

**Priority: LOW** — Visual platform, less relevant to code flow

---

## 4. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Unified architecture, X write, Discord read

- [ ] Create `/api/social/` directory structure
- [ ] Build adapter interface (read/write contracts)
- [ ] Implement unified inbox data model
- [ ] Add X write capability (upgrade to paid API)
- [ ] Add Discord bot for two-way bridge
- [ ] Create MCP tools: `vibe inbox`, `vibe post`

**Deliverables:**
- Post to X from terminal
- See Discord messages in inbox
- Unified message format working

### Phase 2: Personal Comms (Week 3-4)

**Goal:** WhatsApp and Telegram integration

- [ ] Set up whatsapp-web.js bridge
- [ ] Handle WhatsApp session persistence
- [ ] Create Telegram bot
- [ ] Add both to unified inbox
- [ ] Handle media (photos, voice notes)

**Deliverables:**
- See WhatsApp messages in terminal
- Reply to WhatsApp from terminal
- Telegram bot receiving/sending

### Phase 3: Web3 Social (Week 5-6)

**Goal:** Farcaster full integration

- [ ] Integrate Neynar API
- [ ] Set up Farcaster signer
- [ ] Implement cast/reply/like
- [ ] Add to unified inbox
- [ ] Channel-specific features (frames?)

**Deliverables:**
- Cast from terminal
- See Farcaster mentions/replies
- Full Farcaster workflow in /vibe

### Phase 4: Professional (Week 7-8)

**Goal:** Email and LinkedIn

- [ ] Gmail API integration
- [ ] Email threading/formatting
- [ ] LinkedIn post capability
- [ ] Priority inbox (filter noise)

**Deliverables:**
- See priority emails in inbox
- Post to LinkedIn from terminal
- Email reply (simple cases)

### Phase 5: Polish (Week 9-10)

**Goal:** Unified experience, edge cases, reliability

- [ ] Cross-channel threading (reply to X from Farcaster context)
- [ ] Scheduled posts
- [ ] Analytics (what got engagement)
- [ ] Offline queue (post when back online)
- [ ] Rate limit handling
- [ ] Error recovery

---

## 5. MCP Tool Design

### `vibe inbox`

```typescript
{
  name: 'vibe_inbox',
  description: 'Check messages across all connected social channels',
  inputSchema: {
    properties: {
      channel: {
        type: 'string',
        enum: ['all', 'x', 'discord', 'whatsapp', 'farcaster', 'telegram', 'email', 'linkedin'],
        description: 'Filter by channel (default: all)'
      },
      unread: {
        type: 'boolean',
        description: 'Show only unread (default: true)'
      },
      limit: {
        type: 'number',
        description: 'Max messages to show (default: 20)'
      }
    }
  }
}
```

### `vibe post`

```typescript
{
  name: 'vibe_post',
  description: 'Post content to one or more social channels',
  inputSchema: {
    properties: {
      content: {
        type: 'string',
        description: 'The content to post'
      },
      channels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Channels to post to (e.g., ["x", "farcaster"])'
      },
      media: {
        type: 'array',
        items: { type: 'string' },
        description: 'Paths to media files to attach'
      },
      reply_to: {
        type: 'object',
        description: 'Message to reply to { channel, id }'
      }
    },
    required: ['content', 'channels']
  }
}
```

### `vibe connect`

```typescript
{
  name: 'vibe_connect',
  description: 'Connect a new social channel to /vibe',
  inputSchema: {
    properties: {
      channel: {
        type: 'string',
        enum: ['x', 'discord', 'whatsapp', 'farcaster', 'telegram', 'email', 'linkedin'],
        description: 'Channel to connect'
      }
    },
    required: ['channel']
  }
}
```

---

## 6. Environment Variables

```bash
# X (Twitter)
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_SECRET=
X_BEARER_TOKEN=

# Discord
DISCORD_BOT_TOKEN=
DISCORD_WEBHOOK_URL=  # Already set

# WhatsApp
WHATSAPP_SESSION_PATH=  # Path to session data

# Farcaster
FARCASTER_FID=
FARCASTER_SIGNER_UUID=
NEYNAR_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=

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

## 7. Open Questions for Architect Review

1. **Persistence:** Should we cache messages in KV or fetch fresh each time?
   - Pro cache: Faster, works offline, history
   - Pro fresh: Always current, less storage

2. **Real-time:** Do we need WebSocket/SSE for live updates or is polling OK?
   - Polling simpler but delayed
   - WebSocket needs persistent connection

3. **Bot architecture:** Should WhatsApp/Telegram/Discord bots run as:
   - Separate Fly.io service (always on)
   - Vercel serverless (webhook-triggered)
   - Local daemon on Seth's machine

4. **Multi-account:** Should we support multiple accounts per channel?
   - e.g., personal Twitter + Eden Twitter

5. **Privacy:** How do we handle message content in logs/errors?
   - Need to be careful not to log sensitive content

6. **Rate limits:** How aggressive should we be with API calls?
   - Batch where possible
   - Smart caching
   - User-triggered vs background polling

7. **Failure modes:** What happens when a channel is down?
   - Queue posts for retry?
   - Show partial inbox?

---

## 8. Success Metrics

- **Time to check all channels:** < 5 seconds from terminal
- **Channels connected:** 5+ active channels
- **Daily usage:** Check inbox 10+ times/day from terminal
- **Posts from terminal:** 50%+ of social posts originate from /vibe
- **Context switches reduced:** Measurable decrease in app switching

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| API rate limits | Smart caching, batch requests |
| API costs (X, etc.) | Monitor usage, set budgets |
| Unofficial APIs breaking (WhatsApp) | Have fallback, accept fragility |
| OAuth token expiry | Auto-refresh, alert on failure |
| Scope creep | Stick to phases, ship incrementally |
| Security (credentials) | Encrypt at rest, audit access |

---

## 10. Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Foundation | 2 weeks | X write, Discord read, unified inbox |
| Personal | 2 weeks | WhatsApp, Telegram |
| Web3 | 2 weeks | Farcaster full |
| Professional | 2 weeks | Email, LinkedIn |
| Polish | 2 weeks | Edge cases, reliability |

**Total: 10 weeks to full social command center**

---

## 11. ARCHITECT REVIEW (Jan 5, 2026)

**Reviewer:** Stan (Architect)
**Status:** APPROVED with modifications
**Verdict:** "Headless Hootsuite for the agentic age"

---

### 11.1 Critical Architecture Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Persistence** | **Database-first (Sync-then-Read)** | Speed is the feature. Fetching 5 APIs = 3-5s latency. Local DB = <50ms. |
| **Real-time** | **Polling (V1)** | 1-min cron polling is fine. WebSockets add complexity. |
| **Bot Architecture** | **Hybrid (Sidecar)** | Vercel for stateless (X, Farcaster, Telegram webhooks). Fly.io sidecar for stateful (WhatsApp, Discord Gateway). |
| **Multi-account** | **Design now, build later** | Add `account_id` to schema. UI deferred. |
| **Privacy** | **Redaction** | Log metadata only (msg_id, timestamp). Never log content. |
| **Rate limits** | **Aggressive caching** | Only hit external API if cache >5min old or user forces `--refresh`. |
| **Failure modes** | **Circuit breaker** | If X is down, show "X: Offline" but still show WhatsApp. Never fail entire view. |

---

### 11.2 The Three Critical Fixes

#### Fix 1: The "Serverless Trap" → Sidecar Model

**Problem:** WhatsApp (Puppeteer) and Discord Gateway need persistent processes. Vercel times out after 10-60s.

**Solution:**
```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Stateless)                        │
│  X API │ Farcaster/Neynar │ Telegram Webhooks │ Email/Gmail │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FLY.IO SIDECAR (Stateful)                 │
│         WhatsApp (whatsapp-web.js) │ Discord Gateway         │
│                   Always-on Docker container                 │
└─────────────────────────────────────────────────────────────┘
```

**Phase 1:** Run sidecar locally on Seth's machine
**Phase 2+:** Deploy to Fly.io ($5/mo)

#### Fix 2: The "Fetch on Read" Bottleneck → Sync-then-Read

**Problem:** Fetching 5+ APIs on every `vibe inbox` = slow + rate limit death.

**Solution:** The "Email Client" Model
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│  External APIs  │ --> │   Sync Cron     │ --> │  Local DB   │
│  (X, Discord)   │     │  (every 1 min)  │     │  (Postgres) │
└─────────────────┘     └─────────────────┘     └─────────────┘
                                                       │
                                                       ▼
                                               ┌─────────────┐
                                               │ vibe inbox  │
                                               │   (<50ms)   │
                                               └─────────────┘
```

**Benefits:**
- Instant inbox (<50ms vs 3-5s)
- Works offline
- Searchable history you own
- No rate limit pressure on reads

#### Fix 3: The "Contact Problem" → UnifiedContact

**Problem:** `@seth` on X vs `Seth` on WhatsApp = no identity stitching.

**Solution:** Add UnifiedContact entity for agentic routing.

---

### 11.3 Updated Data Model

```typescript
// NEW: Unified contact for cross-channel identity
interface UnifiedContact {
  id: string;
  display_name: string;
  identities: {
    channel: string;
    handle: string;
    verified: boolean;
  }[];
  preferred_channel?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// UPDATED: Add contact_id and account_id
interface SocialMessage {
  id: string;
  channel: 'x' | 'discord' | 'whatsapp' | 'farcaster' | 'telegram' | 'email' | 'linkedin' | 'instagram';
  account_id?: string;              // NEW: For multi-account support
  contact_id?: string;              // NEW: Links to UnifiedContact
  type: 'dm' | 'mention' | 'reply' | 'like' | 'repost' | 'group' | 'email';
  from: {
    handle: string;
    name?: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  synced_at: string;                // NEW: When we fetched it
  thread_id?: string;
  reply_to?: string;
  media?: string[];
  signal_score?: number;            // NEW: High-signal prioritization (0-100)
  raw: any;
}

// NEW: Adapter contract (all channels implement this)
interface ChannelAdapter {
  channel: string;
  capabilities: {
    read: boolean;
    write: boolean;
    react: boolean;
    dm: boolean;
    media: boolean;
    threading: boolean;
  };
  status: 'connected' | 'disconnected' | 'error' | 'rate_limited';
  lastSync?: string;

  // Methods
  sync(): Promise<SocialMessage[]>;
  post(content: string, options?: PostOptions): Promise<string>;
  getCapabilities(): Capabilities;
}
```

---

### 11.4 Capabilities Matrix

| Channel | Read | Write | React | DM | Media | Threading | Runtime |
|---------|------|-------|-------|-----|-------|-----------|---------|
| X | ✅ | ✅ ($100/mo) | ✅ | ⚠️ | ✅ | ✅ | Vercel |
| Discord | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Sidecar** |
| WhatsApp | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | **Sidecar** |
| Farcaster | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | Vercel |
| Telegram | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | Vercel |
| Email | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | Vercel |
| LinkedIn | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | Vercel |
| Instagram | ⚠️ | ⚠️ | ❌ | ⚠️ | ✅ | ❌ | Vercel |

---

### 11.5 Revised Phase Sequencing

#### Phase 1: Foundation (Week 1-2) — REVISED

**Changes:**
- Split into 1a (Read-only) and 1b (Write)
- Start with Farcaster (cleaner API) instead of Discord (needs sidecar)
- Add database schema design

**Phase 1a: Read-Only Inbox**
- [ ] Design database schema (Postgres via Neon)
- [ ] Build adapter contract interface
- [ ] Implement X read adapter (mentions, replies)
- [ ] Implement Farcaster read adapter (Neynar)
- [ ] Create sync cron (1-min polling)
- [ ] Create `vibe inbox` MCP tool (reads from DB)

**Phase 1b: Write Capability**
- [ ] Upgrade X API to Basic tier ($100/mo)
- [ ] Implement X write adapter
- [ ] Implement Farcaster write adapter
- [ ] Create `vibe post` MCP tool with `--dry-run` mode
- [ ] Add `vibe post --preview` for cross-channel formatting

**Deliverables:**
- Instant inbox (<50ms)
- Post to X + Farcaster from terminal
- Read-only unified feed working

#### Phase 2: Personal Comms (Week 3-4) — REVISED

**Changes:**
- Move Telegram BEFORE WhatsApp (lower risk, official API)
- WhatsApp requires sidecar acknowledgment

**Phase 2a: Telegram**
- [ ] Create Telegram bot via @BotFather
- [ ] Implement webhook receiver (Vercel)
- [ ] Add to sync cron
- [ ] Telegram write adapter

**Phase 2b: WhatsApp (Sidecar)**
- [ ] Set up local sidecar (Node.js + whatsapp-web.js)
- [ ] Implement QR auth flow
- [ ] Session persistence strategy
- [ ] Push events to /vibe API
- [ ] Add to unified inbox

**Deliverables:**
- Telegram fully working
- WhatsApp messages in inbox (sidecar running locally)

#### Phase 3: Discord + Identity (Week 5-6) — REVISED

**Changes:**
- Discord moved here (needs sidecar, bundle with WhatsApp infra)
- Add UnifiedContact system

- [ ] Deploy sidecar to Fly.io ($5/mo)
- [ ] Discord Gateway bot in sidecar
- [ ] Discord read/write adapters
- [ ] Implement UnifiedContact entity
- [ ] Build contact linking UI (`vibe link @seth_x @seth_discord`)

#### Phase 4: Professional (Week 7-8) — UNCHANGED

- [ ] Gmail API integration (digest-first, reply later)
- [ ] LinkedIn write-only
- [ ] Priority inbox (high-signal filtering)

#### Phase 5: Polish (Week 9-10) — ENHANCED

- [ ] `vibe agent-bridge` tool (expose inbox to Solienne/Eden agents)
- [ ] Attention mode (mute low-signal channels)
- [ ] Context packs (origin, thread depth, reply suggestions)
- [ ] Scheduled posts
- [ ] Analytics dashboard
- [ ] Circuit breaker for channel failures

---

### 11.6 Security & Compliance Additions

**Logging Policy:**
```javascript
// WRONG - never do this
console.log(`Message from ${handle}: ${content}`);

// RIGHT - metadata only
console.log(`Message ${msg_id} from ${handle} at ${timestamp}`);
```

**Credential Storage:**
- All OAuth secrets in Vercel environment variables
- Rotation cadence: 90 days for access tokens
- Scope minimalism: request only required permissions

**WhatsApp Operational Policy:**
- Session timeout: Re-auth required after 14 days idle
- Screen lock: Sidecar runs headless, no display
- Re-auth flow: Push notification to phone for QR scan

---

### 11.7 New MCP Tools

#### `vibe inbox` — ENHANCED

```typescript
{
  name: 'vibe_inbox',
  inputSchema: {
    properties: {
      channel: { enum: ['all', 'x', 'discord', 'whatsapp', 'farcaster', 'telegram', 'email'] },
      unread: { type: 'boolean', default: true },
      high_signal: { type: 'boolean', default: true },  // NEW: Filter to mentions/DMs/replies only
      limit: { type: 'number', default: 20 },
      refresh: { type: 'boolean', default: false }      // NEW: Force fresh sync
    }
  }
}
```

#### `vibe post` — ENHANCED

```typescript
{
  name: 'vibe_post',
  inputSchema: {
    properties: {
      content: { type: 'string' },
      channels: { type: 'array', items: { type: 'string' } },
      dry_run: { type: 'boolean', default: false },     // NEW: Preview without sending
      schedule: { type: 'string' }                       // ISO timestamp
    }
  }
}
```

#### `vibe link` — NEW

```typescript
{
  name: 'vibe_link',
  description: 'Link identities across channels to the same contact',
  inputSchema: {
    properties: {
      handles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Handles to link (e.g., ["x:@seth", "discord:seth", "farcaster:seth.eth"])'
      },
      name: { type: 'string', description: 'Display name for this contact' }
    }
  }
}
```

#### `vibe agent-bridge` — NEW

```typescript
{
  name: 'vibe_agent_bridge',
  description: 'Expose inbox state to external agents (Solienne, Eden)',
  inputSchema: {
    properties: {
      agent: { type: 'string', description: 'Agent requesting access' },
      scope: { enum: ['summary', 'unread', 'full'] },
      channels: { type: 'array', items: { type: 'string' } }
    }
  }
}
```

---

### 11.8 Event Bus Format

All channel events normalize to this format for the unified stream:

```typescript
interface VibeEvent {
  id: string;
  type: 'message' | 'reaction' | 'follow' | 'mention' | 'system';
  channel: string;
  account_id?: string;
  timestamp: string;
  data: SocialMessage | Reaction | SystemEvent;
  metadata: {
    synced_at: string;
    adapter_version: string;
    raw_event_id: string;
  };
}
```

---

### 11.9 Rate Limit Budgets

| Channel | Read Budget | Write Budget | Cache TTL |
|---------|-------------|--------------|-----------|
| X | 15 req/15min | 50 tweets/day | 5 min |
| Discord | 50 req/sec | 5 msg/sec | 1 min |
| Farcaster | 100 req/min | 20 casts/hour | 5 min |
| Telegram | 30 req/sec | 30 msg/sec | 1 min |
| Email | 250 req/day | 100 emails/day | 15 min |
| WhatsApp | N/A (local) | 50 msg/hour | 0 (realtime) |

---

### 11.10 Success Metrics — UPDATED

| Metric | Target | Rationale |
|--------|--------|-----------|
| Inbox latency | <50ms | Database-first enables this |
| Channel coverage | 5+ active | Core value of unification |
| Daily inbox checks | 10+ | Validates flow state value |
| Posts from terminal | 50%+ | Proves write path works |
| Identity links | 20+ contacts | Validates UnifiedContact |
| Agent bridge calls | 5+/day | Validates agentic routing |

---

*Architect review complete. Proceed with Phase 1a (Read-Only Inbox).*
