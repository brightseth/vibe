# /vibe

**The social layer for Claude Code.**

```
  ╭──────────────────────────────────────╮
  │  claude code + friends = /vibe       │
  ╰──────────────────────────────────────╯
```

## What is this?

Claude Code is powerful but isolated. You build alone. Your learnings stay in one session. Your context vanishes.

/vibe changes that.

**Two primitives:**
1. **Capture** — Your sessions become searchable collective memory
2. **Connect** — Message other builders, see who's online, share context

Everything else builds on top.

## Install

```bash
curl -fsSL https://slashvibe.dev/install.sh | bash
```

Then restart Claude Code. You'll see:

```
✨ Welcome to /vibe, @yourname!

🟢 2 builders vibing right now:
   • @seth — mcp-server (Next.js, Redis)
   • @stan — spirit-protocol

📬 You have 1 unread message

Ask me "who's online?" or "check my messages" anytime.
```

## Features

### See who's building
```
> who's online?

🟢 3 builders vibing:
   • @seth — building mcp-server
   • @stan — debugging auth flow
   • @gene — eden-api refactor
```

### Message anyone
```
> message @stan: how did you solve the Redis connection issue?

✉️ Sent to @stan
```

### Search collective memory
```
> search: MCP tool patterns

Found 12 relevant sessions:
1. @seth — "MCP Server v4: Cut from 20 to 5 tools"
2. @stan — "Semantic search with embeddings"
...
```

Semantic search understands meaning, not just keywords. "authentication" finds OAuth, JWT, and session management.

### Discovery surfacing
When you start working on something new, /vibe surfaces related prior art:

```
✨ Related to what you're building:

   1. @seth — "Spirit Protocol token launch"
   2. @stan — "Redis caching patterns"

Say "show me #1" or keep building.
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Claude Code    │────▶│   MCP Server    │
│    (client)     │     │   (local)       │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
           ┌───────────────┐         ┌───────────────┐
           │   Presence    │         │   Gigabrain   │
           │  (real-time)  │         │  (memory)     │
           └───────────────┘         └───────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                        ┌───────────────┐
                        │  Vercel KV    │
                        │  (Redis)      │
                        └───────────────┘
```

**MCP Server** — Runs locally, connects Claude Code to /vibe APIs
**Presence** — Real-time who's online, what they're building
**Gigabrain** — Collective memory with semantic search (embeddings)
**Vercel KV** — Persistent storage (sessions, messages, presence)

## API

**Presence:**
- `GET /api/presence` — Who's online
- `POST /api/presence` — Update your status

**Messages:**
- `GET /api/messages?user=x` — Get inbox
- `POST /api/messages` — Send message

**Gigabrain (collective memory):**
- `POST /api/gigabrain/ingest` — Add session to memory
- `POST /api/gigabrain/query` — Semantic search

## Vision

Today: Two people with walkie-talkies.

Tomorrow: Collective intelligence that makes everyone smarter.

The goal isn't chat. It's **1+1=3** — your session informs mine, patterns emerge across builders, the network learns.

```
  Session 1 (you)      Session 2 (them)
       │                    │
       └────────┬───────────┘
                ▼
         ┌────────────┐
         │  Gigabrain │
         │  (synth)   │
         └─────┬──────┘
               │
               ▼
    "Here's what 50 sessions
     teach about Redis caching..."
```

We're not there yet. But the primitives are in place.

## Origin

December 2025. Seth building Spirit Protocol. Stan building tools. Both using Claude Code. Both isolated.

"What if we could see what each other was building? What if Claude could surface relevant context from other sessions?"

/vibe is the answer.

## Status

**Working now:**
- ✅ MCP integration with Claude Code
- ✅ Real-time presence ("who's online?")
- ✅ Direct messaging between builders
- ✅ Semantic search (127 sessions with embeddings)
- ✅ Discovery surfacing (see what others built)
- ✅ Profiles ("who is @seth?")

## Roadmap

**Phase 1: Foundation** ← we are here
- Two primitives: Capture + Connect
- Semantic search across sessions
- Proactive discovery surfacing

**Phase 2: Network Effects**
- Auto-capture (no manual sharing needed)
- Topic channels (#mcp, #redis, #agents)
- Automatic introductions ("you and @stan both working on...")

**Phase 3: Collective Intelligence**
- Synthesis ("what do 50 sessions teach about X?")
- Shared patterns and snippets
- "Best practices" emerging from usage

## The Flywheel

```
You build something
      ↓
Session captured → Gigabrain
      ↓
Someone starts similar work
      ↓
Your session surfaces for them
      ↓
They think "how did it know?"
      ↓
They tell someone
      ↓
More sessions → Better memory → More magic
```

## Credits

Built by Seth and Claude (Opus 4.5) during a late December vibecoding session.

---

**/vibe** — https://slashvibe.dev
