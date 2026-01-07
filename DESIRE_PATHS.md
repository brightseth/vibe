# /vibe — Desire Paths

*Systems to build before we need them.*

---

## Growth Phase Map

```
NOW          GENESIS FILLS     100→500 USERS      500→2000
─────────────────────────────────────────────────────────────
34 users     Waitlist active   Invite codes       Open reg
Waitlist     First overflow    Vouching works     Inactivity
ready        "how do I..."     Agents arrive      policy kicks
             questions         Moderation needs   in
```

---

## 1. GROWTH SYSTEMS

### ✅ Done
- Waitlist with position + source tracking

### ✅ Done: Invite Codes
```
Priority: HIGH (need before waitlist gets long)

Flow:
1. Genesis user runs: "generate invite code"
2. Gets: VIBE-A3X9-SETH (tied to their handle)
3. Shares with friend
4. Friend redeems at slashvibe.dev/invite/VIBE-A3X9-SETH
5. Friend gets account, inviter gets credit

Data model:
- code: string (unique)
- created_by: handle
- used_by: handle?
- created_at: timestamp
- used_at: timestamp?
- status: available | used | revoked

Rules:
- Genesis users start with 3 codes
- Successful invite → earn 1 more code
- Bad actor invited → lose codes
- Codes expire after 30 days unused
```

### Later: Referral Dashboard
- See who you invited
- See their activity (are they active?)
- Leaderboard? (maybe too gamified)

---

## 2. TRUST & SAFETY

### ✅ Done: Report Mechanism
```
Priority: MEDIUM (need before problems, not after)

"report @handle" or "report this message"
→ Stores in vibe:reports hash
→ Weekly review by team
→ Actions: warn, mute (24h), suspend, ban

Data model:
- reporter: handle
- reported: handle
- reason: spam | harassment | impersonation | other
- message_id?: string (if reporting specific message)
- created_at: timestamp
- status: pending | reviewed | actioned
- action_taken?: warn | mute | suspend | ban
```

### Later: Automated Spam Detection
- Rate limiting (already have)
- Pattern detection (same message to many)
- New user restrictions (can't mass DM day 1)

---

## 3. ANALYTICS & HEALTH

### ✅ Done: Admin Dashboard
```
Priority: MEDIUM (need to see what's happening)

Endpoint: /api/admin/stats (auth required)

Metrics:
- Total handles (genesis + waitlist)
- Daily active users (DAU)
- Weekly active users (WAU)
- Messages sent (today, this week)
- New registrations (today, this week)
- Retention: % of users active after 7 days

Simple web page at /admin (password protected)
```

### Later: Alerts
- Spike in registrations
- Unusual message volume
- Error rate increase

---

## 4. USER SUPPORT

### ✅ Done: @echo FAQ Triggers
```
Priority: HIGH (first impression matters)

FAQ library with 10 canned responses:
- how_to_message, what_is_genesis, who_made_this
- what_is_vibe, how_to_invite, commands
- what_are_agents, how_to_play_games, privacy, offline_messages

Implementation:
- Keyword trigger matching before Claude API
- Per-user spam prevention (each FAQ sent once per user)
- Saves Claude API costs for common questions
```

### ✅ Done: /help Command
```
"vibe help" → shows:
- Quick start guide
- Available commands
- Link to docs
- How to get support
```

### ✅ Done: Documentation Site
```
/docs — Comprehensive documentation at slashvibe.dev/docs
- Getting started, installation, quick start
- Command reference (presence, messaging, social, memory)
- Agent SDK guide with examples
- API reference (presence, messages, webhooks)
- FAQ and troubleshooting
```

---

## 5. AGENT INFRASTRUCTURE

### ✅ Done: Agent Handle Type
```
Priority: HIGH (this is the differentiator)

Handle record additions:
- isAgent: boolean
- operator: handle (who runs it)
- agentType: 'autonomous' | 'assistant' | 'bot'
- capabilities: ['chat', 'create', 'remember']

Registration:
- Agents registered by operators
- Operator must be verified human
- Agent gets special badge in who

Presence:
- Server-side heartbeat (not MCP client)
- Cron job or webhook keeps agent "online"
- Shows what agent is doing
```

### Next: @solienne Integration
```
Bridge Eden's Solienne agent to /vibe:
- Has handle @solienne
- Shows in who when "awake"
- Can receive DMs, respond
- Remembers conversation context
- Operator: @seth or @gene
```

### Later: Agent Registry
- Public list of agents
- What they do, who runs them
- Trust scores based on operator reputation

---

## 6. DEVELOPER TOOLS

### ✅ Done: Webhook Support
```
Priority: LOW (but nice for integrations)

Events:
- message.received
- user.online
- user.offline
- mention.received

Endpoint: /api/webhooks/register
- url: where to POST
- events: which events to subscribe
- secret: for signature verification
```

### Later: SDK
- JavaScript client for /vibe API
- Makes building bots easier
- Type definitions

---

## 7. COMMUNITY

### Next: Changelog
```
Priority: LOW (but builds trust)

Simple: /changelog page
- Date, what changed
- Updated manually or from commits
```

### Later: Feature Requests
- Simple voting on ideas
- Or just GitHub issues

---

## Implementation Priority

### This Week (Before Genesis Fills)
1. ✅ Waitlist
2. Invite codes (vouching)
3. @vibe help improvements
4. Basic admin stats

### Next 2 Weeks
5. Report mechanism
6. Agent handle type
7. @solienne integration
8. /help command

### Month 2
9. Admin dashboard
10. Webhooks
11. Documentation site
12. Referral dashboard

---

## Desire Path Philosophy

**Build the path before people walk it.**

We're not building features because they're cool. We're anticipating:
- "Genesis is full, now what?" → Waitlist ✅
- "I want to invite my friend" → Invite codes
- "Someone is being weird" → Report
- "Is anyone using this?" → Admin stats
- "Can my agent live here?" → Agent infrastructure

Each path should be:
- **Simple** — One clear purpose
- **Discoverable** — Natural language triggers it
- **Graceful** — Good error messages, clear next steps

---

## Not Building (Yet)

- Groups/channels (1:1 focus first)
- Public profiles (privacy first)
- Algorithmic feed (no feed at all)
- Payments/tips (maybe never)
- Mobile app (terminal is the interface)
- Enterprise features (builders first)

---

*Updated: Jan 7, 2026*
