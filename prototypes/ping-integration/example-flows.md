# Example User Flows — /vibe × ping.money

Real scenarios showing how the integration works.

---

## Scenario 1: Alice Needs WebSocket Help

**Context:**
- Alice is building a real-time app
- Stuck on production WebSocket reconnection logic
- Willing to pay for expert help

### Flow

```
Alice: "How do I handle WebSocket reconnection in production with graceful degradation?"

Claude (via vibe_ask_expert):
┌──────────────────────────────────────────┐
│ 🎯 Expert Match Found                    │
│                                          │
│ Routing to: @robviously                  │
│                                          │
│ Why this person?                         │
│ - 🟢 Online right now (instant answer)   │
│ - Shipped 3 WebSocket projects:          │
│   • Transparent.city (live collab)       │
│   • Real-time dashboard for crypto       │
│   • Multiplayer game engine              │
│ - Helped 8 people with WebSocket Qs      │
│ - Currently working on transparent.city  │
│   (literally doing WebSockets now)       │
│                                          │
│ His rate: $50/15min                      │
│ Your budget: Not set                     │
│                                          │
│ Options:                                 │
│ [Pay $50 via ping] [DM free] [See others]│
└──────────────────────────────────────────┘

Alice: "Pay $50 via ping"

Claude (via vibe_route_to_ping):
✅ Question sent to @robviously

What happens next:
1. $50 USDC locked in escrow (Base L2)
2. Rob notified:
   - Ping alert: "New $50 question"
   - /vibe DM with your context
3. He has 24h to answer
4. Payment auto-releases when he responds
5. Full refund if no answer

You'll get notified via ping + /vibe when ready.

Track: "check my ping questions"

---

[10 minutes later]

Rob (in his terminal):
💰 New Ping Question from @alice (via /vibe)

"How do I handle WebSocket reconnection in production with graceful degradation?"

Why you were matched:
- You shipped 3 WebSocket projects
- You're online and working on similar code
- Alice is building a real-time collaboration tool

Context about Alice:
- Building Spirit Protocol infrastructure
- Ships regularly (12 projects in 30 days)
- Well-connected on /vibe

[Answer for $50] [Pass] [View full question]

Rob: "Answer for $50"

Claude: Great! Here's a suggested answer based on your transparent.city code:

[Shows AI-generated draft from his own repos]

Rob: "Send that answer"

✅ Answer submitted to ping
💰 $42.50 USDC released to your wallet
📊 Answer sent to Alice

---

[Rob's DM to Alice via /vibe, optional]:

Rob: Hey! Just answered your WebSocket question on ping.

Quick tip while you're here: The key is exponential backoff + heartbeat detection. I also open sourced my reconnection logic in transparent.city if you want to see production code.

Happy to chat more if needed - DM me directly or ping again.

---

Alice receives:
1. Ping notification: "Rob answered your question"
2. /vibe DM with the answer + optional personal message
3. Answer shows in ping.money dashboard

Alice: "Rate 5 stars"

✅ Rob's /vibe reputation updated
✅ Transaction complete
```

**Outcome:**
- ✅ Alice got expert answer in 10 minutes (vs days elsewhere)
- ✅ Rob earned $42.50 in 10 minutes of work
- ✅ ping earned $3.75 platform fee
- ✅ /vibe earned $3.75 routing fee
- ✅ Both sides happy, likely to use again

---

## Scenario 2: Bob Discovers His Value

**Context:**
- Bob uses /vibe casually
- Shipped 5 Rust projects
- Doesn't know people would pay for his expertise

### Flow

```
[Bob is coding, vibe presence active]

Claude (unprompted suggestion):
💡 You could earn money answering questions

I noticed you've shipped 5 Rust projects. People on /vibe are asking Rust questions.

Would you like to:
- Set your expert rate (e.g., $50/15min)
- Get notified when questions match your expertise
- Earn USDC by helping others

This is via ping.money, integrated with /vibe's graph.

Bob: "Sure, how does it work?"

Claude:
1. Set your rate: "set expert rate $50 for rust, async"
2. Questions route to you automatically when:
   - Topic matches your ships/expertise
   - You're online (you can answer right away)
   - Your rate fits asker's budget
3. You get notified in terminal
4. Answer, get paid USDC instantly

No dashboards, no applications, no interviews.
Your /vibe ships ARE your resume.

Bob: "Set expert rate $50 for rust, async, wasm"

✅ Expert profile created
✅ Monitoring for Rust/async/WASM questions
✅ Installed ping.money MCP server

You'll get notified here when matched.

---

[2 days later]

Claude: 💰 Question matched to you!

From: @carol (shipped 2 full-stack apps)
Topic: Rust async
Budget: $75

"How do I handle async traits with dynamic dispatch in Rust? Getting compiler errors."

Your match score: 95%
Why: You shipped async-rust-lib, wasm-async-parser

[Accept $50] [Pass] [Negotiate rate]

Bob: "Accept $50"

[Same flow as Scenario 1]
```

**Outcome:**
- ✅ Bob discovered he could monetize expertise
- ✅ Seamless onboarding (no separate sign-up)
- ✅ /vibe ships proved his expertise
- ✅ First dollar earned in 48 hours

---

## Scenario 3: Complex Match — Multiple Experts

**Context:**
- Question about OAuth + Rust + Production scale
- Multiple potential experts
- /vibe ranks them intelligently

### Flow

```
User: "How do I implement OAuth 2.0 refresh token rotation in Rust for a system handling 100k+ users?"

Claude (via vibe_ask_expert):
🎯 3 Experts Matched

**Ranked by relevance:**

1. @danielsmith (BEST MATCH) ⭐
   - 🟢 Online now
   - Shipped: oauth-rust-server (10k+ users in prod)
   - Expertise: Rust + OAuth + Scale
   - Rate: $100/15min
   - Why: Literally built this exact thing

2. @emily (GOOD MATCH)
   - ⚫ Offline (avg response: 4 hours)
   - Shipped: rust-auth-lib, oauth2-refresh-crate
   - Expertise: Rust + OAuth
   - Rate: $60/15min
   - Why: Deep OAuth knowledge, maybe not scale

3. @frank (OKAY MATCH)
   - 🟢 Online now
   - Shipped: 2 OAuth projects (Python, not Rust)
   - Expertise: OAuth generalist
   - Rate: $40/15min
   - Why: Knows OAuth, less Rust-specific

Budget recommendations:
- Best answer: $100 (Daniel, exact expertise)
- Good value: $60 (Emily, deep knowledge)
- Budget option: $40 (Frank, general help)

[Route to Daniel] [Route to Emily] [Route to Frank] [Ask all 3]

User: "Route to Daniel"

[Proceeds as in Scenario 1]
```

**Key Intelligence:**
- Ranked by: online > exact topic match > production experience > rating
- Shows tradeoffs (cost vs expertise vs availability)
- User chooses based on budget/urgency
- /vibe's graph made the ranking possible (ships + context + presence)

---

## Scenario 4: Failed Match → Fallback

**Context:**
- Obscure question (Elm + GraphQL + Serverless)
- No experts on /vibe yet
- Graceful fallback

### Flow

```
User: "How do I deploy an Elm SPA with GraphQL backend to Cloudflare Workers?"

Claude (via vibe_ask_expert):
⚠️ No Perfect Match Found

Searched /vibe graph for:
- Elm expertise: 0 users
- GraphQL expertise: 8 users
- Cloudflare Workers: 3 users

Best partial matches:
1. @henry: GraphQL + serverless (not Elm)
2. @iris: Frontend SPAs (not Elm specifically)
3. @jack: Cloudflare Workers (not GraphQL)

Options:

1. **Broaden search:**
   Ask about GraphQL + serverless separately?
   "How do I deploy GraphQL to Cloudflare Workers?"

2. **Post to ping.money directly:**
   Create open question (anyone can answer)
   Less targeted, but reaches beyond /vibe

3. **Post to /vibe community:**
   Free, ask in #general channel
   No payment, no guarantee

4. **Request expert:**
   "I need an Elm expert on /vibe"
   We'll DM Elm developers to join

Which approach?

User: "Post to ping directly"

Claude (via vibe_route_to_ping):
✅ Question posted to ping.money

Since we couldn't match within /vibe, your question is open to all ping users.

We'll still track responses and update your /vibe reputation graph based on who helps.

If an Elm expert answers, we'll suggest they join /vibe!

[Track question]
```

**Outcome:**
- ✅ Honest when matching fails
- ✅ Clear fallback options
- ✅ Still routes to ping (revenue opportunity)
- ✅ Seeds future growth (invite experts)

---

## Scenario 5: Repeat Customer Loyalty

**Context:**
- Alice already asked Bob a question
- Comes back with follow-up
- /vibe remembers and fast-tracks

### Flow

```
Alice: "How do I add rate limiting to my WebSocket server?"

Claude (via vibe_ask_expert):
🎯 Instant Match

**@robviously** (previous conversation)
- You asked him about WebSocket reconnection last week
- He gave you a 5-star answer
- He's online right now
- Already familiar with your project context

His rate: $50/15min (same as before)

[Quick ping to Rob] [See other options]

Alice: "Quick ping to Rob"

Claude: Perfect! Since you've worked with Rob before, I'll send him a /vibe DM first to see if he's available for a quick question.

---

[Rob's terminal]:
💬 @alice pinged you

"Quick follow-up on the WebSocket setup - need help with rate limiting"

Context: You helped her last week with reconnection logic.

[Quick reply (free)] [Route to ping ($50)] [Not available]

Rob: "Quick reply"

Hey Alice! For rate limiting WebSockets, check out the `throttle-ws` crate. You can wrap your message handler:

```rust
let limiter = RateLimiter::new(100, Duration::from_secs(1));
// ... [short code snippet]
```

If you need production-scale implementation, happy to do a paid session on ping. But that should get you started!

---

Alice: "Thanks! That worked perfectly."

[/vibe tracks: Rob helped Alice twice, builds trust signal]
```

**Outcome:**
- ✅ Repeat interaction (network effects)
- ✅ Mix of free + paid (sustainable)
- ✅ Trust built over time
- ✅ vibe becomes central hub for both

---

## Key Patterns

### Pattern 1: Ships = Proof
Every match references actual projects shipped, not claimed skills.

### Pattern 2: Context Matters
/vibe DMs include WHY the match, WHO is asking, WHAT they're building.

### Pattern 3: Warm > Cold
Routing through social graph makes introductions warm, not cold transactions.

### Pattern 4: Mix Free + Paid
Not everything is paid. DMs are free. Some experts help for free first. Flexibility.

### Pattern 5: Reputation Compounds
Every interaction strengthens the graph. More data = better matches over time.

---

## What Makes This Different

| Traditional Marketplace | /vibe × ping |
|------------------------|---------------|
| Browse profiles | Matched to YOU |
| Self-reported skills | Ship-based proof |
| Apply for jobs | Auto-routed if qualified |
| Cold outreach | Warm intro via graph |
| Hope they respond | Online status guaranteed |
| 5-day turnaround | 10-minute answers |
| No context on asker | Full social context |
| Build reputation from scratch | Reputation from day 1 (ships) |

---

**These scenarios become reality with 2 weeks of integration work.**

Next: Ship the prototype, test with real users.
