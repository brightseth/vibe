# /vibe × ping.money Integration — Prototype Demo

**Created:** January 9, 2026
**For:** @flynnjamm
**Goal:** Show how /vibe's social graph makes ping routing 10x better

---

## The Problem ping.money Solves

**Before:** Finding experts is hard
- Google random people
- LinkedIn cold messages
- Twitter DMs to strangers
- Hope they respond

**With ping:** Pay people to answer
- Set your rate
- Get questions in terminal
- Answer, get paid USDC
- Simple, works

---

## The Problem /vibe Solves for ping

**ping.money's matching today:**
- Browse all questions
- Manual filtering
- Hope someone with expertise sees it

**With /vibe routing:**
1. **Smart matching** — Who SHIPPED projects on this topic? (proof, not claims)
2. **Live routing** — Who's ONLINE right now? (instant answer possible)
3. **Real reputation** — Who actually helps people? (peer signal, not self-reported)

---

## How It Works

### User Flow

```
User: "How do I handle WebSocket reconnection in production?"

Claude: [calls vibe_ask_expert]

/vibe scans graph:
- @robviously: shipped 3 WebSocket projects, online now, 4.8★
- @alice: shipped 1 WebSocket project, offline, 4.2★
- @bob: mentions WebSockets in profile, online, no ships

Ranking: Rob (shipped + online), Alice (shipped), Bob (claim only)

Claude shows:
┌─────────────────────────────────────────────┐
│ Expert Match Found                          │
│                                             │
│ Routing to: @robviously                     │
│                                             │
│ Why this person?                            │
│ - 🟢 Online right now                       │
│ - Shipped 3 WebSocket projects              │
│ - Helped 8 people with similar questions    │
│ - Currently working on transparent.city     │
│   (real-time features)                      │
│                                             │
│ Their rate: $50/15min                       │
│ Your budget: $50 ✅                          │
│                                             │
│ [Route via ping.money] [DM free] [See more]│
└─────────────────────────────────────────────┘

User: "Route via ping.money"

Claude: [calls vibe_route_to_ping]

What happens:
1. Escrow created ($50 USDC locked on Base)
2. Rob gets notified:
   - Ping alert in terminal
   - /vibe DM with context about asker
3. Rob answers, payment auto-releases
4. User gets answer in ping + vibe DM
```

### Key Differentiators

| Without /vibe | With /vibe Routing |
|---------------|-------------------|
| Browse all questions | Matched to YOU specifically |
| Self-reported expertise | Proof via ships/contributions |
| Hope expert is around | Route to online experts first |
| No context on asker | Know their work, mutual connections |
| Cold question | Warm intro via vibe graph |

---

## Technical Architecture

```
┌─────────────┐
│  User asks  │
│  question   │
└──────┬──────┘
       │
       v
┌─────────────────────────────┐
│  /vibe Graph Intelligence   │
│                             │
│  - Query ships by topic     │
│  - Check who's online       │
│  - Calculate reputation     │
│  - Rank by relevance        │
└──────┬──────────────────────┘
       │
       v (expert handle + context)
       │
┌──────┴──────────────────────┐
│  Bridge Layer               │
│  (vibe_route_to_ping)       │
│                             │
│  - Create ping question     │
│  - Notify via both channels │
│  - Track routing analytics  │
└──────┬──────────────────────┘
       │
       v
┌─────────────────────────────┐
│  ping.money                 │
│                             │
│  - Escrow management        │
│  - Payment processing       │
│  - Answer quality review    │
│  - USDC settlement          │
└─────────────────────────────┘
```

---

## Data Flow

### 1. Matching Phase (vibe)

**Input:**
```json
{
  "question": "How do I handle WebSocket reconnection?",
  "budget": 50
}
```

**vibe graph query:**
```javascript
// Scan all users for:
shipCount = ships.filter(s =>
  s.tags.includes('websockets') ||
  s.what.includes('WebSocket')
).length;

helpCount = interactions.filter(i =>
  i.type === 'help' &&
  i.topic.includes('websockets')
).length;

online = presence.status === 'active';

// Rank: online > ships > help > rating
```

**Output:**
```json
{
  "expert": {
    "handle": "robviously",
    "online": true,
    "shipCount": 3,
    "helpCount": 8,
    "rating": 4.8,
    "rate": 50,
    "reasoning": "Online now, shipped 3 relevant projects"
  }
}
```

### 2. Routing Phase (bridge)

**vibe → ping handoff:**
```javascript
// Call ping API
POST https://api.ping-money.com/v1/questions
Headers: {
  Authorization: 'Bearer <vibe-service-token>',
  X-Vibe-Source: 'graph-routing'
}
Body: {
  question: "How do I...",
  expert_handle: "robviously",
  amount: 50,
  source_metadata: {
    vibe_asker: "alice",
    match_score: 0.95,
    signals: ["shipped_3", "online", "rating_4.8"]
  }
}
```

**Dual notification:**
1. Ping notifies expert (terminal alert)
2. /vibe sends DM with rich context:
   - Who's asking (with their profile)
   - Why you were matched
   - Mutual connections
   - Recent activity

### 3. Answer Phase (ping)

Expert answers via ping tools, /vibe just observes for analytics.

---

## Revenue Model

### Transaction Flow

```
User pays: $50 USDC
├─ Expert gets: $42.50 (85%)
├─ ping.money: $3.75 (7.5% platform fee)
└─ /vibe: $3.75 (7.5% routing fee)

Total platform take: 15% (split 50/50)
```

### Why This Works

**For ping.money:**
- More questions answered (better routing)
- Higher quality matches (less refunds)
- Network effects (vibe's social graph grows)
- Rev share aligned (we both win on volume)

**For /vibe:**
- Revenue without building marketplace
- Validates social graph value
- Data to improve matching
- Foot in door for more services

**For users:**
- Better matches (ship-based proof)
- Faster answers (online routing)
- Warm intros (social context)
- Same or lower cost (platform fee split, not doubled)

---

## API Integration Points

### What ping.money needs to add:

**1. Source tracking**
```javascript
// Questions table
ALTER TABLE questions ADD COLUMN source VARCHAR(50);
ALTER TABLE questions ADD COLUMN source_metadata JSONB;

// Track where question came from
INSERT INTO questions (..., source, source_metadata)
VALUES (..., 'vibe', '{"match_score": 0.95, "signals": [...]}');
```

**2. Service token for /vibe**
```javascript
// Create service account
const vibeServiceToken = generateServiceToken({
  name: 'vibe-routing',
  permissions: ['create_question', 'notify_expert', 'view_analytics'],
  revenue_share: 0.5 // 50% of platform fee
});
```

**3. Webhook for answer notification**
```javascript
// When expert answers, notify vibe
POST https://api.slashvibe.dev/webhooks/ping/answer
Body: {
  question_id: "ping_abc123",
  expert: "robviously",
  asker: "alice",
  answered_at: "2026-01-09T22:00:00Z"
}
```

### What /vibe needs to add:

**1. Expert rate storage**
```javascript
// User profiles
ALTER TABLE user_profiles ADD COLUMN expert_rate INTEGER; // USDC per 15min
ALTER TABLE user_profiles ADD COLUMN expert_topics TEXT[]; // ['rust', 'websockets']
ALTER TABLE user_profiles ADD COLUMN expert_available BOOLEAN DEFAULT true;

// Tool to set
vibe_set_expert_rate({ rate: 50, topics: ['rust', 'async'] });
```

**2. Routing analytics**
```javascript
// Track success
CREATE TABLE routing_analytics (
  id UUID PRIMARY KEY,
  asker VARCHAR(50),
  expert VARCHAR(50),
  service VARCHAR(50), -- 'ping.money'
  question_topic VARCHAR(100),
  amount INTEGER,
  matched_at TIMESTAMP,
  answered_at TIMESTAMP,
  match_score FLOAT,
  signals JSONB
);
```

**3. Revenue tracking**
```javascript
// Calculate our cut
CREATE TABLE revenue_share (
  transaction_id VARCHAR(100),
  service VARCHAR(50),
  amount INTEGER, -- USDC cents
  vibe_share INTEGER, -- 50% of platform fee
  settled_at TIMESTAMP
);
```

---

## Success Metrics

### Phase 1: MVP (2 weeks)

**Hypothesis:** /vibe routing increases answer rate

**Metrics to track:**
- Questions routed: target 20
- Answer rate: > 80% (vs ping baseline ~60%)
- Avg response time: < 2 hours (vs baseline ~6 hours)
- User satisfaction: 4+ stars

**Success:** 80%+ answer rate, users ask for more

### Phase 2: Scale (1-3 months)

**Hypothesis:** This generates meaningful revenue

**Metrics:**
- Transactions/day: 50+
- Revenue/month: $5k+ to vibe
- Expert adoption: 30+ experts set rates
- Asker retention: 40%+ ask again

**Success:** Path to $20k+/month revenue

---

## Open Questions

### Product

1. **Should experts opt-in to ping routing?**
   - Option A: Auto-enroll if they set rate on /vibe
   - Option B: Explicit "enable ping.money" toggle
   - Rec: Start with A (lower friction)

2. **What if expert isn't on ping yet?**
   - Send vibe DM: "You were matched for a $50 question. Install ping to claim"
   - One-click install link
   - Onboard seamlessly

3. **Refund flow if expert doesn't answer?**
   - Ping's 24h guarantee
   - /vibe suggests backup expert
   - Route to backup automatically?

### Technical

1. **Auth: How does /vibe call ping API?**
   - Service token (recommended)
   - OAuth flow (heavier)
   - API key (simpler but less secure)

2. **How does ping notify vibe of answers?**
   - Webhook (recommended)
   - Polling (fallback)
   - Both (redundancy)

3. **Where does matching logic live?**
   - /vibe calculates, sends to ping (recommended)
   - Ping calls vibe API for match (tighter coupling)
   - Hybrid (match in vibe, validate in ping)

---

## Next Steps

### This Week

1. **Review prototype** (this repo)
2. **Quick call** to walk through integration
3. **Agree on MVP scope** (what ships in 2 weeks?)

### Week 1-2: Build MVP

**vibe side:**
- Add `vibe_ask_expert` tool
- Add `vibe_set_expert_rate` tool
- Implement graph matching logic
- Test with 5-10 beta users

**ping side:**
- Add source tracking to questions
- Create service token for vibe
- Webhook for answer notifications
- Test handoff flow

### Week 3-4: Launch Beta

- Genesis users only (controlled test)
- Track metrics (answer rate, response time, revenue)
- Iterate based on feedback
- Decide: keep partnership or build own?

---

## Why This Matters

**Most marketplaces fail at matching.**

Upwork, Fiverr, Toptal — all suffer from:
- Stale profiles (expert says they know X, really don't)
- Availability mismatch (expert takes 3 days to respond)
- Trust issues (can they really help?)

**ping.money solves payment.** Escrow, instant settlement, fair pricing.

**/vibe solves matching.** Real-time, proof-based, reputation-backed.

**Together:** The best expertise marketplace for builders.

---

## Files in This Prototype

```
prototypes/ping-integration/
├── DEMO.md                  # This file
├── vibe_ask_expert.js       # Graph-based expert matching
├── vibe_route_to_ping.js    # Bridge to ping.money
└── example-flows.md         # Step-by-step user scenarios
```

---

**Questions?** DM @seth on /vibe or email seth@example.com

**Let's ship this.** 🚀
