# /vibe MVP Spec v3

**The social network for Claude Code.**

Invite friends. Build together. Your sessions make everyone smarter.

---

## The Vision (Plant the Flag)

100,000+ developers use Claude Code daily. They all build alone. Context vanishes. Learnings stay trapped.

**/vibe is the social network for Claude Code.**

We're claiming this hill before anyone else realizes it exists.

---

## The Model: Path for Builders

**Path's playbook:**
- Start with 50 friends (intimate, not broadcast)
- Invite-only (no strangers)
- "Share with people who matter"

**Our version:**
- Start with 20 builders who know each other
- Friend-to-friend invites only
- Your sessions help your network

**Why this works:**
- Trust is pre-established (no spam, no ghost town)
- Replies are guaranteed (you're messaging friends)
- Word of mouth is the only growth channel anyway
- Collective intelligence builds from day 1

---

## The Two Layers

### Layer 1: Chat (Visible)

What users see and do:

```
vibe status      — see your network
vibe ping @stan  — message a friend
vibe inbox       — check messages
vibe invite      — bring in another friend
```

This is friends talking to friends inside Claude Code.

### Layer 2: Intelligence (Background)

What happens silently:
- Sessions are summarized (not full transcripts)
- Tech/patterns detected
- Problems and solutions extracted
- Feeds the collective knowledge layer

**The payoff (Phase 1.5):**

```
> stuck on auth

🧠 2 friends in your network solved similar problems:
   @stan — "JWT refresh with Redis" (2 days ago)
   @gene — "Privy wallet auth" (last week)

Ping them or see what they learned?
```

**This is the moment where chat becomes collective intelligence.**

---

## The MMMVP Loop

```
1. INSTALL        curl -fsSL slashvibe.dev/install.sh | bash
2. IDENTIFY       @handle + "building: one-liner"
3. INVITE         vibe invite → send to a friend
4. PING           vibe ping @friend
5. GET A REPLY    ← the moment that matters
6. REPEAT         invite more friends, ping more people
```

**Success criterion:** Did your friend reply? Did you invite another friend?

---

## The 20-Person Trial

Seth's starting network:
- @seth, @stan, @gene, @boreta, @phil
- + 15 more personal invites

**Week 1 goal:**
- All 20 installed
- Everyone has sent at least one ping
- At least 10 back-and-forth conversations

**Week 2 goal:**
- Surface first "collective intelligence" moment
- Someone gets helped by something another person learned
- That moment is the product

---

## Design Decisions (Locked)

### 1. Ping Template

Fully templated, warm, one question:

```
"hey @stan — i'm seth, building mcp server for social.
 quick q: what's the hardest part of what you're building?
 reply: vibe reply p7x2 '...'"
```

### 2. Building Update

Manual only for MVP:

```
> vibe set building "auth flow for privy"
```

### 3. Invite Flow

Install command + pairing:

```
> vibe invite

Share this:
────────────────────────────────
curl -fsSL slashvibe.dev/install.sh | bash

After install, ping me:
vibe ping @seth
────────────────────────────────
(copied to clipboard)
```

---

## MVP Scope

### IN MVP ✅

**Identity:**
- `@handle` + `building:` one-liner
- `vibe set building "..."`

**Network:**
- Friend-to-friend only (no stranger discovery)
- 🟢 Online + 🟡 Recently active
- Your network = people you invited + people who invited you

**Chat:**
- `vibe ping @user` — templated opener
- `vibe dm @user "..."` — freeform
- `vibe inbox` — messages
- `vibe reply <id> "..."` — respond

**Growth:**
- `vibe invite` — bring in friends

**Background (silent):**
- Session summaries captured
- Tech/patterns detected
- Feeds collective layer (surfaces in Phase 1.5)

### NOT IN MVP ❌

| Cut | Why |
|-----|-----|
| Stranger discovery | Friends first |
| Public directory | Invite-only |
| Semantic search UI | Background only for now |
| DNA / public patterns | Phase 2 |
| Rooms / channels | 1:1 first |
| OAuth | Handle trust is fine |

---

## Commands

| Command | What |
|---------|------|
| `vibe status` | Your network + unread + suggestion |
| `vibe ping @user` | Templated opener |
| `vibe ping` | Suggest friends to ping |
| `vibe dm @user "..."` | Freeform message |
| `vibe inbox` | Check messages |
| `vibe reply <id> "..."` | Respond |
| `vibe invite` | Generate invite for a friend |
| `vibe set building "..."` | Update your one-liner |

**8 commands. Claude suggests them contextually.**

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Install success rate | > 85% |
| Time to first ping | < 2 minutes |
| Reply rate (friends) | > 80% |
| Invites sent per user | > 2 |
| D7 retention | > 40% |

**North star:** Network growth (users × connections × messages)

---

## Phases

### Phase 1: Friends (Now)
- 20-person closed trial
- Friend-to-friend chat
- Background session capture
- Prove: friends will talk in terminal

### Phase 1.5: Intelligence Surfaces
- "2 friends solved similar problems"
- Search within your network
- Prove: collective knowledge has value

### Phase 2: Expand
- Friends-of-friends
- Larger clusters
- Public discovery (opt-in)

### Phase 3: Platform
- Eden agents join the network
- Spirit Protocol integration
- Tokenized value layer

---

## The Moat

**Chat is commodity.** Slack has chat. Discord has chat.

**Collective intelligence is the moat.**

Every session makes the network smarter. The more you use Claude Code with /vibe, the more valuable the network becomes. Your learnings help your friends. Their learnings help you.

This compounds. Competitors can't copy your session history.

---

## Positioning

| Audience | Message |
|----------|---------|
| **Users** | "The social network for Claude Code. Invite friends. Build together." |
| **Advisors** | "Path model + collective intelligence. Friend graph compounds into knowledge network." |
| **Press** | "100K+ Claude Code users build alone. /vibe connects them." |

---

## The Behavioral Test

After week 1, ask:

> "Did you ping someone and get a reply that led to a second message?"

If yes → the social primitive works
If no → iterate on the loop

After week 2, ask:

> "Did something your friend learned help you?"

If yes → collective intelligence works
If no → iterate on surfacing

---

## One Thing Next

Ship to 20 friends. Get replies. Surface one "collective intelligence" moment.

That's the MVP.

---

**/vibe** — The social network for Claude Code.
