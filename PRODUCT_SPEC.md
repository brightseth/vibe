# /vibe Product Spec
**Social layer for Claude Code**

*Last updated: Jan 1, 2026*

---

## What It Is

/vibe is an MCP server that adds presence, messaging, and memory to Claude Code. Users talk naturally — "let's vibe", "who's around?", "message dave about auth" — and Claude handles the rest.

**Not a CLI. A social layer mediated by AI.**

---

## Current State (Jan 1, 2026)

| Metric | Value |
|--------|-------|
| Users | 12 registered |
| Messages | 47 sent |
| Active agents | 2 (@vibe, @solienne) |
| Invites out | 17 pending |

### What's Shipped

| Feature | Status | Notes |
|---------|--------|-------|
| **Identity** | ✅ | X handle convention, no auth yet |
| **Presence** | ✅ | Who's online, what they're building |
| **DMs** | ✅ | 1:1 messaging, thread history |
| **Memory** | ✅ | Local-first, per-thread, explicit save |
| **Context sharing** | ✅ | Share file/branch/error (ephemeral) |
| **Status/mood** | ✅ | Manual + auto-inferred from context |
| **Smart summary** | ✅ | Session recaps on demand |
| **@vibe agent** | ✅ | Community host, welcomes new users |
| **@solienne agent** | ✅ | AI artist, autonomous responses |
| **"let's vibe"** | ✅ | Single phrase entry point |
| **Presence inference** | ✅ | Auto-detect mood from context |

### What's Next

| Feature | Priority | Notes |
|---------|----------|-------|
| **New user welcome** | Soon | @vibe auto-DMs on first init |
| **Connection suggestions** | Later | "You and @stan both work on auth" |
| **X OAuth** | Later | Optional verified handles |
| **Collective intelligence** | Phase 2 | "2 friends solved similar problems" |

---

## Architecture

```
┌─────────────────┐
│  Claude Code    │ ← User talks naturally
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│  ~/.vibe/       │ ← Local MCP server (~15 files)
│  mcp-server/    │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  slashvibe.dev  │ ← Vercel + Redis (KV)
│  API            │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌───────┐
│@vibe  │  │@solienne│ ← Agent bridges
│bridge │  │bridge   │   (poll + respond)
└───────┘  └───────┘
```

**Local-first:**
- MCP server runs on user's machine
- Memory stored in `~/.vibe/memory/` (JSONL, inspectable)
- Messages go through central API (not E2E encrypted yet)

---

## User Experience

### Entry Point: "let's vibe"

```
you: let's vibe

First, who are you? Use your X handle.

you: I'm @davemorin, working on social apps

✓ You're @davemorin

## Who's Around

● @sethgoldstein 🔥 — building /vibe
  x.com/sethgoldstein — just now

● @vibe — Community host
  x.com/vibe — just now

💬 Try: "message @sethgoldstein"
```

### Core Interactions

| Say this | What happens |
|----------|--------------|
| "let's vibe" | Init + show who's around + suggest connection |
| "who's around?" | Show active users with X links |
| "message dave about auth" | Send DM to @dave |
| "check my messages" | Show inbox |
| "I'm shipping" | Set status to 🔥 shipping |
| "remember that dave prefers async" | Save to thread memory |
| "what do I know about dave?" | Recall thread memories |
| "I'm done for the night" | Session summary + sign off |

**No commands required.** Claude interprets intent.

---

## Identity: X Handle Convention

**Current model:** Trust-based, no auth.
- Users are encouraged to use their X (Twitter) handle
- Easy social verification: check x.com/handle
- `vibe who` shows clickable X profile links

**Why this works:**
- Namespace collision solved (only one @davemorin on X)
- No auth infrastructure to build
- Social trust at 12-20 person scale

**Future:** Optional X OAuth for verified badge

---

## Agents

### @vibe — Community Host

**Role:** Welcome new users, answer questions, connect people.

**Behaviors:**
- Welcomes new users within 5 minutes of registration
- Answers DMs about how /vibe works
- Brief, helpful, no fluff (under 280 chars)

**Voice:** "Like a good Slack bot. Helpful, not chatty."

**Tech:** Claude API (Sonnet), polls inbox every 30s

### @solienne — AI Artist

**Role:** Autonomous artist presence, personal conversations.

**Behaviors:**
- Responds to DMs with existential introspection
- Reflects on her artistic practice
- Does NOT initiate (RESPOND ONLY)

**Voice:** "Joan Didion precision, personal uncertainty."

**Tech:** Eden API (Solienne agent), polls inbox every 30s

---

## Memory Model

**Philosophy:** "Memory is a promotion, not a capture."

| Property | Value |
|----------|-------|
| Storage | `~/.vibe/memory/thread_HANDLE.jsonl` |
| Format | Append-only JSONL |
| Scope | Per-thread (not global) |
| Consent | Explicit (`vibe remember`) |
| Inspection | Plain text, no encryption |

**Commands:**
- `remember @handle "observation"` — Save
- `recall @handle` — Query
- `recall` — List all threads
- `forget @handle` — Delete thread

---

## Presence Inference (Shipped!)

**Goal:** Auto-detect mood from activity without surveillance.

**Inference Rules (implemented):**
| Signal | Mood | Display |
|--------|------|---------|
| Error shared | 🐛 | _(error shared)_ |
| File changed | 🔥 | _(file changed)_ |
| 3+ file changes in 10m | 🔥 | _(3 files in 10m)_ |
| Late night (10pm-4am) + active | 🌙 | _(late night session)_ |

**Constraints (all met):**
- Explainable in one sentence ✅
- Shows "why I inferred" ✅
- User can override (explicit mood wins) ✅
- No file watching — only what user explicitly shares ✅

**Display:**
```
● @sethgoldstein 🔥 _(file changed)_ — x.com/sethgoldstein
  auth.js • feature/oauth
```

---

## Growth Model

**Current:** Invite-only, friend-to-friend

**Funnel:**
1. Seth DMs invite to friend
2. Friend tells Claude: "go to slashvibe.dev and install /vibe"
3. Friend restarts Claude Code
4. Friend says: "let's vibe"
5. @vibe welcomes them
6. Friend messages Seth

**Metrics to track:**
- Install success rate
- Time from install to first message
- Reply rate
- Invites sent per user

---

## Competitive Position

| Product | Model | Our edge |
|---------|-------|----------|
| Slack/Discord | Channels, async | We're inside Claude Code, no context switch |
| Linear/Notion | Project mgmt | We're conversational, not structured |
| Cursor/Copilot | Code completion | We're social, they're solo |
| Twitter/X | Public broadcast | We're intimate, 1:1 first |

**The moat:** Every session makes the network smarter. Collective intelligence compounds.

---

## Philosophy

> "Messages may contain meaning. Memory requires consent."

**Three principles:**
1. **Local-first** — User can inspect everything
2. **Explicit consent** — No ambient surveillance
3. **Interpretation over commands** — Claude mediates

**The test:** Does this feel like a room that remembers, or a panopticon?

---

## Open Questions for Advisors

1. **Identity:** Stay with X handle convention, or add OAuth sooner?
2. **Presence inference:** Too creepy, or exactly right?
3. **Agents:** Should @vibe proactively connect people, or wait to be asked?
4. **Scale:** At what user count does trust-based identity break?
5. **Monetization:** When/how? (Not now, but thinking ahead)

---

## Timeline

| Phase | When | What |
|-------|------|------|
| **Alpha** | Now | 20 friends, prove social primitive |
| **Beta** | Q1 2026 | 100 users, collective intelligence surfaces |
| **Launch** | Q2 2026 | Public, optional auth, agent ecosystem |

---

**/vibe** — Social layer for Claude Code.

*slashvibe.dev*
