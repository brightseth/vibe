# /vibe — Service Outline

*Tracing the full shape. Not building everything today.*

---

## The Five Layers

### 1. IDENTITY — Who You Are

| Feature | Status | Notes |
|---------|--------|-------|
| Handle registry | ✅ Live | Atomic claims, reserved lists |
| Genesis users | ✅ Live | First 100, permanent status |
| Basic profile | ✅ Live | handle, one_liner |
| Activity tracking | ✅ Live | first_active_at, last_active_at, messages_sent |
| X verification | 🔲 Planned | Link X handle, display badge |
| GitHub verification | 🔲 Planned | Link GitHub, display badge |
| Farcaster verification | 🔲 Planned | Link FID, display badge |
| AIRC keypair | ✅ Live | Ed25519, message signing |
| Reputation signals | 🔲 Future | Vouches, streaks, badges |

**Key Insight:** Handles are the namespace asset.

---

### 2. PRESENCE — Who's Around

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time online | ✅ Live | Heartbeat polling |
| Status/mood | ✅ Live | Explicit set or inferred |
| Context sharing | ✅ Live | File, branch, error, note |
| Activity heat | ✅ Live | Active, idle, shipping, debugging |
| Genesis counter | ✅ Live | "66 spots remaining" |
| Away states | 🔲 Planned | AFK with return estimate |
| DND mode | 🔲 Planned | Auto-reply, no notifications |
| Ambient indicators | ✅ Live | Terminal title, iTerm badge |

**Key Insight:** Presence should leak into every interaction.

---

### 3. MESSAGING — How You Connect

| Feature | Status | Notes |
|---------|--------|-------|
| Direct messages | ✅ Live | Basic DMs |
| Thread view | ✅ Live | Conversation history |
| Inbox | ✅ Live | Unread counts |
| Pings | ✅ Live | Lightweight nudges |
| Reactions | ✅ Live | Emoji responses |
| Welcome DM | ✅ Live | @vibe greets new users |
| Consent model | ✅ Live | First contact acceptance |
| Rich payloads | ✅ Live | Game states, handoffs |
| Typing indicators | 🔲 Planned | Real-time awareness |
| Scheduled messages | 🔲 Future | "Send when online" |
| Follow-up reminders | 🔲 Future | "Remind me in 3 days" |

**Key Insight:** Messages carry meaning beyond text.

---

### 4. DISCOVERY — Who to Meet

| Feature | Status | Notes |
|---------|--------|-------|
| Who's online | ✅ Live | vibe who |
| Board | ✅ Live | Community posts |
| Invite links | ✅ Live | slashvibe.dev |
| Waitlist | 🔲 Next | When genesis fills |
| Invite codes | 🔲 Next | Vouching system |
| Interest matching | 🔲 Future | "Who works on X?" |
| Serendipity mode | 🔲 Future | vibe random |
| Network graph | 🔲 Future | Connections, degrees |
| Activity feed | 🔲 Future | What people shipped |

**Key Insight:** Discovery should feel like a conference hallway.

---

### 5. COLLABORATION — What You Build Together

| Feature | Status | Notes |
|---------|--------|-------|
| Handoffs | ✅ Live | AIRC context portability |
| Games | ✅ Live | Tic-tac-toe |
| Memory | ✅ Live | Remember/recall about people |
| Reservations | ✅ Live | Advisory file locks |
| Pair sessions | 🔲 Future | Real-time shared context |
| Code review | 🔲 Future | "Can someone look?" |
| Project rooms | 🔲 Future | Persistent spaces |
| Bounties | 🔲 Future | Paid help requests |
| Office hours | 🔲 Future | Availability windows |

**Key Insight:** Collaboration is the endgame.

---

## Growth System

### Phase 1: Genesis (Current)

```
┌─────────────────────────────────────┐
│  GENESIS                            │
│  100 spots, first-come-first-served │
│  Status: 34 claimed, 66 remaining   │
└─────────────────────────────────────┘
```

**What happens:**
- Users claim handles via `vibe init`
- Get genesis badge (permanent)
- Welcome DM from @vibe
- Genesis number shown (#34 of 100)

### Phase 2: Waitlist (When Genesis Fills)

```
┌─────────────────────────────────────┐
│  WAITLIST                           │
│  Email capture, priority queue      │
│  Drip invites weekly                │
└─────────────────────────────────────┘
```

**What happens:**
- Genesis full message with @seth follow CTA
- Email capture for waitlist
- Priority by: referral source, X following, GitHub activity
- Weekly invite batches

### Phase 3: Invite Codes

```
┌─────────────────────────────────────┐
│  INVITE SYSTEM                      │
│  Vouch-based growth                 │
│  Trust propagation                  │
└─────────────────────────────────────┘
```

**What happens:**
- Genesis users get 3 invite codes
- Each invite = vouch (reputation on line)
- Successful invites → more codes
- Bad actors lose privileges
- Invited users inherit some trust from inviter

### Phase 4: Open (Eventually)

```
┌─────────────────────────────────────┐
│  OPEN REGISTRATION                  │
│  Inactivity policy active           │
│  Premium features available         │
└─────────────────────────────────────┘
```

**What happens:**
- Anyone can register
- 60-day inactivity → dormant status
- Premium tier for power features
- Genesis users exempt from inactivity

---

## Trust & Verification

### Verification Ladder

```
none       ─→  x       ─→  github    ─→  farcaster  ─→  team
(new user)    (linked)    (linked)     (linked)       (/vibe team)
```

| Level | Badge | Requirements | Permissions |
|-------|-------|--------------|-------------|
| none | - | Just registered | Basic messaging |
| x | 𝕏 | Linked X account | Visible in who |
| github | ◉ | Linked GitHub | Priority support |
| farcaster | ⌘ | Linked Farcaster | Agent features |
| team | ★ | Invited by team | Admin tools |

### Moderation Flow

```
Report → Review → Action
         ↓
      warn → mute → suspend → ban
```

- Genesis users get benefit of doubt
- Zero tolerance for spam
- Team reviews weekly

---

## Platform Bridges

### Current

| Platform | Status | Features |
|----------|--------|----------|
| X/Twitter | ✅ Live | Mentions, replies |
| Farcaster | 🔲 Planned | Cast sync |

### Future

| Platform | Priority | Use Case |
|----------|----------|----------|
| Discord | Medium | Bridge to servers |
| Telegram | Low | Bot for notifications |
| Email | Medium | Digest notifications |
| GitHub | High | Activity sync, verification |
| Linear | Low | Project sync |

---

## Data Schema (Current)

### Handle Record
```javascript
{
  handle: "seth",
  registeredAt: "2026-01-07T...",
  registeredAtTs: 1736259600000,
  first_active_at: "2026-01-07T...",
  last_active_at: "2026-01-07T...",
  messages_sent: 47,
  genesis: true,
  genesis_number: 1,
  verified: "x",
  x_handle: "seth",
  github_handle: null,
  isAgent: false,
  operator: null,
  status: "active"
}
```

### Presence Record
```javascript
{
  handle: "seth",
  sessionId: "abc123",
  status: "active",
  mood: "🔥",
  one_liner: "building /vibe",
  context: {
    file: "api/presence.js",
    branch: "main",
    note: "fixing genesis display"
  },
  lastSeen: 1736259600000,
  firstSeen: 1736259000000
}
```

### Message Record
```javascript
{
  id: "msg_xyz",
  from: "seth",
  to: "gene",
  text: "hey, check this out",
  payload: null,
  signature: "base64...",
  createdAt: "2026-01-07T...",
  read: false
}
```

### Memory Record
```javascript
{
  owner: "seth",
  about: "gene",
  observation: "building Abraham covenant, interested in prediction markets",
  createdAt: "2026-01-07T..."
}
```

---

## Next Implementation Chunks

### Chunk A: Waitlist (when genesis fills)
- [ ] Email capture endpoint
- [ ] Waitlist UI at slashvibe.dev
- [ ] Priority scoring logic
- [ ] Admin view of waitlist

### Chunk B: Invite Codes
- [ ] Generate codes for genesis users
- [ ] Redeem code flow
- [ ] Track invite chains
- [ ] Vouch reputation system

### Chunk C: Verification
- [ ] X OAuth flow
- [ ] GitHub OAuth flow
- [ ] Badge display in presence
- [ ] Verification status in profile

### Chunk D: Agent Infrastructure
- [ ] Agent handle type
- [ ] Operator field (who runs it)
- [ ] Agent presence (heartbeat from server)
- [ ] Agent messaging permissions

---

## What /vibe Is NOT

- ❌ Feed product (no algorithmic timeline)
- ❌ Content platform (no posts, likes, followers)
- ❌ Marketplace (no job board)
- ❌ Community platform (no servers, channels)
- ❌ Enterprise software (no admin panels)

**/vibe is ambient social infrastructure for builders.**

---

## Success Signals

### Genesis Phase (Now)
- [ ] 100 handles claimed
- [ ] 50+ with conversations
- [ ] 20+ weekly active
- [ ] Zero spam incidents

### Growth Phase (Q1)
- [ ] 500 handles
- [ ] 200+ weekly active
- [ ] 80% retention
- [ ] Organic referrals > 50%

### Scale Phase (Q2+)
- [ ] 2000+ handles
- [ ] Agent ecosystem live
- [ ] Revenue experiments
- [ ] Federation possible

---

*Tracing the outlines. Building in chunks. Polishing as we go.*
