# /vibe MVP Spec

**One line**: /vibe turns Claude Code into a social network.

---

## The Bet

Claude Code has 100k+ daily users and is growing fast. They all build alone.

If we can make the first 1,000 feel connected, word spreads. AI-native builders talk to each other. The product markets itself.

---

## MVP Success Criteria

**North Star**: Time from install to first message sent < 2 minutes.

**Week 1 Goal**: 50 active users who've sent at least one message.

**Week 4 Goal**: 500 installs, 100 weekly active (sent message or searched).

---

## The Flow (30 seconds to value)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. INSTALL (10 seconds)                                    │
│     curl -fsSL slashvibe.dev/install.sh | bash              │
│     → Pick username                                         │
│     → Auto-configures Claude Code                           │
│                                                             │
│  2. RESTART (5 seconds)                                     │
│     Restart Claude Code                                     │
│     → See welcome message                                   │
│     → See who's online                                      │
│                                                             │
│  3. CONNECT (15 seconds)                                    │
│     "message @stan: hey, what are you building?"            │
│     → Message delivered                                     │
│     → You're now part of the network                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**That's it.** Three steps. Under 2 minutes. You're vibing.

---

## The Three Primitives

### 1. Presence (who's here?)

When you install /vibe, you exist. Your status updates automatically based on your working directory.

```
> who's online?

🟢 @seth — building vibecodings
🟢 @stan — building vibe-check
🟡 @gene — last seen 2h ago

3 builders vibing
```

**How it works:**
- MCP server pings `/api/presence` on session start
- Sends: username, project (from cwd), timestamp
- Heartbeat every 5 minutes while active
- Status decays: 🟢 active → 🟡 away → ⚫ offline

**Data stored:**
```json
{
  "username": "seth",
  "project": "vibecodings",
  "status": "active",
  "lastSeen": 1735500000000
}
```

### 2. Messaging (reach anyone)

Direct messages between builders. Simple. No threads. No reactions. Just text.

```
> message @stan: how did you solve the file watching?

✉️ Sent to @stan
```

When Stan opens Claude Code:
```
📬 1 new message from @seth:
   "how did you solve the file watching?"

Reply: "message @seth: ..."
```

**How it works:**
- POST to `/api/messages` with {from, to, text}
- Recipient sees unread count on next `vibe_status` call
- Messages stored in Vercel KV, 30-day retention

**Data stored:**
```json
{
  "id": "msg_abc123",
  "from": "seth",
  "to": "stan",
  "text": "how did you solve the file watching?",
  "timestamp": 1735500000000,
  "read": false
}
```

### 3. Discovery (what's everyone building?)

Search across all sessions. Semantic search finds relevant work.

```
> search: authentication patterns

Found 12 sessions:
1. @seth — "Privy wallet auth" (Dec 27)
2. @gene — "JWT refresh flow" (Dec 26)
3. @stan — "Session persistence" (Dec 25)

Say "show #1" for details.
```

**How it works:**
- Sessions auto-captured via hook (no manual sharing)
- Embedded with OpenAI text-embedding-3-small
- Stored in Vercel KV with vector search
- Query returns top 5 by cosine similarity

**Data stored:**
```json
{
  "id": "session_xyz",
  "user": "seth",
  "summary": "Implemented Privy wallet auth for Spirit Protocol",
  "project": "spirit-protocol",
  "tech": ["next.js", "privy", "wagmi"],
  "embedding": [0.1, 0.2, ...],
  "timestamp": 1735500000000
}
```

---

## MVP Feature Set

### In MVP ✅

| Feature | Why |
|---------|-----|
| One-command install | Frictionless onboarding |
| Auto-config Claude | No manual JSON editing |
| Username registration | Identity |
| Who's online | Immediate social proof |
| Direct messaging | Core connection primitive |
| Unread message count | Pull to check messages |
| Session auto-capture | Zero-effort contribution |
| Semantic search | Discovery value |
| Welcome message | Onboarding delight |

### NOT in MVP ❌

| Feature | Why not |
|---------|---------|
| Builder profiles | Can add after people are messaging |
| DNA/patterns | Nice-to-have, not core |
| Topic channels | Complexity, needs critical mass |
| Read receipts | Scope creep |
| Message history | 30-day retention is enough |
| Rich media | Text is enough |
| Threads | Keep it simple |
| Reactions | Keep it simple |
| Block/mute | Handle manually at first |
| OAuth/verification | Username trust is fine for now |

---

## Install Flow (Detailed)

### Step 1: Run installer

```bash
curl -fsSL slashvibe.dev/install.sh | bash
```

### Step 2: Installer prompts for username

```
⚡ /vibe — turns Claude Code into a social network

Pick a username (lowercase, no spaces):
@_
```

User types: `seth`

### Step 3: Installer does everything

```
Welcome, @seth!

✓ Downloaded MCP server
✓ Configured Claude Code
✓ Registered @seth on the network

Restart Claude Code to start vibing.
```

**What installer does:**
1. Creates `~/.vibe/` directory
2. Downloads `mcp-server/index.js`
3. Saves username to `~/.vibe/config.json`
4. **Auto-edits Claude settings** to add MCP server
5. POSTs to `/api/presence` to register username
6. Done

### Step 4: User restarts Claude Code

On first prompt, Claude shows:

```
⚡ Welcome to /vibe, @seth!

🟢 2 builders online:
   @stan — vibe-check
   @gene — eden-api

Say "who's online?" or "message @someone" anytime.
```

---

## Technical Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Claude Code    │────▶│   MCP Server    │────▶│   /vibe API     │
│                 │     │   (local)       │     │   (Vercel)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   Vercel KV     │
                                                │   (Redis)       │
                                                └─────────────────┘
```

### MCP Server (local)

Three tools:
- `vibe_status` — Get presence + unread messages
- `vibe_message` — Send a message
- `vibe_query` — Search sessions

Runs as Node.js process, started by Claude Code.

### API (Vercel)

Four endpoints:
- `GET /api/presence` — List online users
- `POST /api/presence` — Update status
- `GET /api/messages?user=x` — Get inbox
- `POST /api/messages` — Send message

Plus Gigabrain (session storage):
- `POST /api/gigabrain/ingest` — Add session
- `POST /api/gigabrain/query` — Search sessions

### Storage (Vercel KV)

Keys:
- `presence:{username}` — User presence (TTL: 10 min)
- `messages:{username}` — User inbox (list)
- `sessions:{id}` — Session data
- `embeddings:{id}` — Session embedding

---

## Onboarding Copy

### Welcome message (shown once)

```
⚡ Welcome to /vibe, @{username}!

You just joined {count} other builders on the network.

🟢 Online now:
   @{user1} — {project1}
   @{user2} — {project2}

Try:
• "who's online?" — see who's building
• "message @{user1}: hey!" — say hi
• "search: {topic}" — find related work

Your sessions auto-capture. Your work helps others. Theirs helps you.

Happy building!
```

### Status check (ongoing)

```
⚡ /vibe status

🟢 3 builders online
📬 2 unread messages

Say "check messages" or "who's online?"
```

---

## Go-to-Market

### Phase 1: Seed (Week 1)
- Seth, Stan, Gene use daily
- Each invites 5 people personally
- Target: 20 active users
- Focus: Is the install smooth? Are people messaging?

### Phase 2: Friends (Week 2-3)
- Post in Claude Code Discord
- Tweet the install command
- Target: 100 installs, 50 active
- Focus: What breaks at scale? What do people ask for?

### Phase 3: Launch (Week 4)
- Hacker News post
- Product Hunt launch
- Target: 500 installs
- Focus: Viral coefficient (do users invite others?)

### Viral Mechanics

**Built-in sharing:**
- "I just got a message from @stan via /vibe — claude code's social network"
- Screenshot of terminal showing who's online
- "Found this via /vibe search" attribution

**Word of mouth triggers:**
- First message received (surprise delight)
- Discovery surfacing (magic moment)
- Seeing your session help someone else

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Install fails on some systems | Test on Mac, Linux, WSL. Fallback to manual instructions. |
| Nobody online when you join | Seed with bots initially. Show "recent" users not just "active". |
| Spam/abuse | Manual moderation at first. Username blocklist. |
| Claude Code changes MCP spec | Pin to known-working version. Monitor changelogs. |
| Vercel KV rate limits | Generous free tier. Upgrade if needed. |
| Privacy concerns | Clear data policy. 30-day retention. No session content stored (just summaries). |

---

## Success Metrics

### Leading Indicators
- Install completion rate (target: >80%)
- Time to first message (target: <5 min)
- Messages sent per user per week (target: >3)

### Lagging Indicators
- Weekly active users (sent message or searched)
- Retention (% return within 7 days)
- Viral coefficient (invites per user)

### North Star
**Weekly messages sent across network.**

If people are messaging, everything else follows.

---

## Timeline

**Week 1**: Ship MVP
- Bulletproof install script
- Three MCP tools working
- API endpoints live
- 20 seed users

**Week 2**: Polish
- Fix bugs from seed users
- Improve welcome flow
- Add "recent users" (not just active)
- 50 users

**Week 3**: Grow
- Discord/Twitter push
- Onboarding improvements
- 100 users

**Week 4**: Launch
- HN/PH launch
- Press outreach
- 500 users

---

## The Ask

**For advisors:**

1. Does the install flow feel right? Any friction points?
2. Is presence + messaging + discovery the right MVP scope?
3. What's missing that would kill adoption?
4. Who are the first 50 users we should personally invite?
5. What's the HN/PH positioning that lands?

---

## One More Thing

The magic isn't the features. It's the feeling.

You open Claude Code. You see that @stan is building something. You message him. He replies. You're not alone anymore.

That feeling — connection while building — is what spreads.

Everything else is infrastructure to create that moment.

---

**/vibe** — turns Claude Code into a social network.
