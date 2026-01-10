# /vibe Platform Strategy — Services Layer

**Date:** January 9, 2026
**Status:** Proposal
**Context:** Discussion with Seth after seeing @flynnjamm's ping.money

---

## The Big Idea

**/vibe isn't just social—it's the social graph that makes Claude Code-native services actually work.**

---

## What /vibe Already Knows

The insight that changes everything:

- **Who's online right now** — real-time availability, not stale profiles
- **What everyone's building** — from ships, context sharing, session data
- **Expertise signals** — what you ship, what you help with, what you ask about
- **Reputation** — interactions, ships, peer endorsements (implicit)
- **Intent** — deep focus? debugging? shipping? exploring? (ambient intelligence)

**This is the missing infrastructure layer for builder services.**

Most marketplaces fail because they don't know:
- Is the expert actually available?
- Do they REALLY know this, or just claim it?
- Are they helpful or just resume padding?

/vibe solves all three.

---

## Opportunity 1: Expertise Marketplace

### Inspiration: ping.money by @flynnjamm

**What it is:** [ping.money](https://ping-money.com/) — pay people to answer questions
- Market research + expert consultations
- Set your rate, get paid to answer
- Async + real-time

**Why /vibe makes it 10x better:**

1. **Smart Matching**
   - "Who knows Rust?" → vibe checks who SHIPPED Rust projects recently
   - Not just tags in a profile—actual proof of work
   - Memory system remembers: "@alice helped with async Rust before"

2. **Live Routing**
   - "Ping someone about OAuth" → routes to expert WHO IS ONLINE NOW
   - No waiting 3 days for email reply
   - See their status: "deep focus on auth refactor" = perfect timing

3. **Reputation Layer**
   - Ship history visible: "shipped 12 projects in last 30 days"
   - Peer interactions: "helped 8 people with TypeScript questions"
   - Real signal, not self-reported "expert level"

4. **Native Integration**
   ```
   $ vibe ask "How do I handle WebSocket reconnection in production?"

   💡 Routing to @robviously (online, shipped 3 WebSocket projects)

   His rate: $50/15min or $150/hour

   [Pay $50 for 15min] [Schedule for later] [Ask community for free]
   ```

---

## Technical Architecture

### Payment Stack

**Wallets:**
- Privy or Dynamic for embedded wallets
- One-click signup, no seed phrases for normies
- Or connect existing wallet (MetaMask, Coinbase)

**Payment Protocol:**
- X402 (HTTP 402 Payment Required) micropayments
- USDC on Base/Arbitrum for low fees
- Instant settlement on answer delivery

**Smart Contracts:**
- Escrow: lock payment when question sent
- Auto-release on answer (with dispute window)
- Refund if no answer within X hours

### Integration Points

**MCP Tools:**
```javascript
// Ask expert (with payment)
vibe_ask_expert(question, budget, expert_handle?)

// Set your rates
vibe_set_rates(rate_15min, rate_hour, expertise_tags)

// Answer pending question
vibe_answer_question(question_id, answer)
```

**API Endpoints:**
```
POST /api/marketplace/ask        - Submit question with escrow
GET  /api/marketplace/match      - Find experts for topic
POST /api/marketplace/answer     - Submit answer, claim payment
GET  /api/marketplace/earnings   - Your earnings dashboard
```

**Webhooks:**
- Expert gets DM when question arrives
- Asker gets DM when answer ready
- Both get payment confirmations

---

## Business Model

### Revenue Options

**Option A: Take Rate**
- 10-20% on all transactions
- Like Stripe, Uber, Fiverr
- Scales with volume

**Option B: SaaS for Services**
- ping.money pays /vibe $X/month for access to graph
- Fixed cost, predictable for them
- Doesn't scale as well

**Option C: Hybrid**
- Free tier: basic access to graph
- Pro tier: premium matching, routing, analytics
- Plus transaction fee (5% instead of 20%)

**Seth's Take:** Start with Option A (take rate) because:
- Aligns incentives (we win when marketplace works)
- Simple to understand
- Standard for marketplaces

---

## Strategic Questions

### 1. Build vs Partner vs Incubate?

**Build It Ourselves:**
- ✅ Full control over integration
- ✅ All revenue to /vibe
- ✅ Faster iteration with our own codebase
- ❌ Distraction from core social product
- ❌ Need payments expertise (Privy, contracts, compliance)

**Partner with ping.money:**
- ✅ Proven product, Flynn's already shipped it
- ✅ We focus on graph, they focus on marketplace UX
- ✅ Rev share aligned
- ❌ Integration complexity
- ❌ Less control over experience

**Incubate Under /vibe:**
- ✅ Start as vibe feature, spin out if it scales
- ✅ Test demand before big commitment
- ✅ Keep optionality
- ❌ Risk of feature bloat
- ❌ Unclear ownership/incentives

**Recommendation:** **Partner first, then decide.**
- Integrate ping.money with /vibe graph (MVP in 2 weeks)
- Rev share 50/50 on transactions routed through vibe
- If it works, decide: keep partner model or build own?
- If it doesn't, no wasted eng time

---

### 2. Single Service or Platform?

**If expertise marketplace works, what else?**

- **Bounty Board:** "Pay $500 for someone to implement X feature"
- **Code Review Service:** "$100 for 30min architecture review"
- **Compute Marketplace:** "Rent my GPU cluster when I'm AFK"
- **Agent Hosting:** Spirit Protocol agents need payments for API calls
- **Premium Features:** "Pay $10/mo for priority matching"

**The Pattern:** Social graph + payments + routing = infrastructure for ANY builder service

**Vision:** **/vibe becomes Stripe Connect for builder services**

Not just social, not just payments—the layer that makes services work because we know:
- Who to route to (expertise graph)
- When they're available (presence)
- If they're legit (reputation)
- How to pay them (embedded wallets)

---

### 3. Revenue Potential

**Conservative Scenario:**
- 100 transactions/day at $50 average
- 15% take rate = $750/day = $22.5k/month
- Scales with network

**Optimistic Scenario:**
- 1,000 transactions/day at $75 average
- 15% take rate = $11.25k/day = $337k/month
- Plus SaaS from services using graph

**The Unlock:** Every builder on /vibe is a potential expert AND customer
- No cold start problem (we have the network)
- Instant matching (we have the graph)
- Live routing (we have presence)

---

## Service SDK Pattern (L7)

**If we do this, we should generalize it.**

What if /vibe provides a service SDK that ANY Claude Code-native service can plug into?

### SDK Components

**Identity SDK:**
```javascript
import { VibeIdentity } from '@vibe/sdk'

const user = await VibeIdentity.getUser(handle)
// Returns: reputation, ships, expertise, availability
```

**Payment SDK:**
```javascript
import { VibePayments } from '@vibe/sdk'

const payment = await VibePayments.createEscrow({
  from: '@alice',
  to: '@bob',
  amount: 50,
  currency: 'USDC',
  condition: 'answer_delivered'
})
```

**Routing SDK:**
```javascript
import { VibeRouting } from '@vibe/sdk'

const expert = await VibeRouting.findExpert({
  topic: 'Rust async',
  online: true,
  minReputation: 100,
  maxRate: 200
})
```

**Notification SDK:**
```javascript
import { VibeNotify } from '@vibe/sdk'

await VibeNotify.dm('@expert', {
  type: 'question',
  question: 'How do I...',
  payment: payment.id
})
```

### Services That Could Use This

1. **Compute Marketplaces** (rent GPU from builders)
2. **Code Review Services** (automated + human)
3. **Agent Marketplaces** (Spirit Protocol agents for hire)
4. **Bounty Boards** (pay for features/fixes)
5. **Premium Support** (hire maintainers directly)

**Think:** AWS SDK but for builder services on /vibe

---

## Next Steps

### Immediate (This Week)

1. **DM @flynnjamm:**
   - "Saw ping.money, would love to integrate with /vibe graph"
   - "Can we do a quick call to explore partnership?"
   - "Thinking rev share on transactions routed through vibe"

2. **Prototype the Integration:**
   - Add `vibe_set_expert_rate` tool (store in profile)
   - Add `vibe_find_expert` tool (query graph for topic)
   - Mock payment flow (no real money yet)
   - Test UX: "vibe ask 'how do I...'" → routes to expert → ping payment

### Short-Term (2-4 Weeks)

3. **Payment Infrastructure:**
   - Choose wallet provider (Privy vs Dynamic)
   - Set up USDC on Base
   - Simple escrow smart contract
   - Test end-to-end with real payment

4. **Launch Beta:**
   - Invite 20 builders to set expert rates
   - Enable for genesis users only
   - Track: # questions, match rate, payment success, satisfaction

### Medium-Term (1-3 Months)

5. **Decide Build vs Partner:**
   - If beta works: formalize partnership OR build our own
   - If it doesn't: learn why, iterate or kill

6. **Expand Services:**
   - Bounty board (easier, no real-time routing)
   - Code review marketplace
   - Agent hosting (Spirit Protocol integration)

7. **Service SDK (L7):**
   - Extract patterns into reusable SDK
   - Docs + examples
   - Let other services build on /vibe

---

## Open Questions

1. **Legal/Compliance:**
   - Do we need money transmitter licenses?
   - KYC/AML requirements at what volume?
   - Terms of service for marketplace?

2. **Quality Control:**
   - How do we prevent bad actors?
   - Reputation system details?
   - Refund/dispute resolution?

3. **Pricing:**
   - What's the right take rate? (10%, 15%, 20%?)
   - Should rates vary by transaction size?
   - Free tier for small transactions?

4. **Distribution:**
   - How do we get experts to set rates?
   - How do we get customers to pay?
   - Chicken/egg problem?

---

## Why This Matters

**Most marketplaces fail because they're cold.**
- Profiles are stale
- Experts aren't actually available
- Reputation is self-reported
- Matching is keyword search

**/vibe fixes all of this because we're LIVE.**
- Real-time presence (online NOW)
- Proof of work (actual ships)
- Peer reputation (who helps who)
- Smart matching (AI on the graph)

**This isn't "let's add payments"—this is unlocking a new category of services that only work on a live social graph.**

Like Stripe didn't just add credit cards to websites—they made online commerce possible for millions of businesses.

/vibe could make builder services possible for millions of developers.

That's the vision.

---

**Next Step:** DM @flynnjamm and start the conversation.

---

*Created: January 9, 2026*
*Owner: Seth*
*Status: Needs discussion with Flynn*
