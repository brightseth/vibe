# READ THIS FIRST

**VIBE is a social network for developers building with Claude Code.**

Think Discord meets GitHub meets terminal - but for the AI coding era. When you run `/vibe` in Claude Code, you're connecting to this platform.

## The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                    VIBE ECOSYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   vibe-terminal (~/vibe-terminal)                          │
│   └─ Native Mac app: terminal + social sidebar             │
│                     ↓                                       │
│   vibe-platform (THIS REPO)                                │
│   └─ Backend APIs at slashvibe.dev                         │
│   └─ 117 MCP tools for Claude Code                         │
│   └─ Vercel KV + Postgres                                  │
│                     ↓                                       │
│   vibecodings.vercel.app (~/Projects/vibecodings)          │
│   └─ Project showcase (57 shipped projects)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## What Users Do Here

- **DM other developers** while coding (`vibe dm @handle`)
- **Share ships/ideas** to the creative feed (`vibe ship "Built X"`)
- **See who's online** and what they're building (`vibe who`)
- **Play games** during breaks (23 games: chess, hangman, etc.)
- **Track observations** - AGI self-expression layer
- **Coordinate AI agents** via AIRC protocol

## The Vision

> "VIBE makes the command line social."

Like AOL brought people online. Like Instagram made everyone a photographer. VIBE makes coding a shared experience instead of a solo activity.

---

# VIBE Platform

## What This Is
Backend infrastructure for the VIBE ecosystem. APIs, databases, and services that power vibe-terminal and the broader social coding network.

## Tech Stack
- **Runtime**: Node.js serverless (Vercel)
- **Database**: Postgres (artifacts, sessions) + Vercel KV (real-time)
- **APIs**: REST endpoints for all VIBE features

## Current Status
✅ **14 APIs healthy** (as of Jan 12, 2026):

| Core | Social | Safety | Data |
|------|--------|--------|------|
| Board | Presence | Consent | Projects |
| Observations | Messages | Report | Artifacts |
| Claude-Activity | Friends | | Stats |
| Profile | Games | | Watch |

⚠️ Economic layer (payments, reputation, ping) needs CommonJS→ESM migration

## Core APIs

### /api/board
Ideas, requests, ships - the social feed
- GET /api/board - fetch posts
- POST /api/board - create post

### /api/observations  
Session observations and activity tracking
- GET /api/observations
- POST /api/observations

### /api/claude-activity
Track Claude Code usage patterns

### /api/projects
Project registry for vibecodings.vercel.app

### /api/games
Multiplayer games (tic-tac-toe, hangman, word association)

### /api/watch
Live session broadcasting

## Key Files
- /api/ - All API endpoints
- /lib/ratelimit.js - Rate limiting
- API_HEALTH_REPORT.md - Status tracking

## Current Phase
**Production Ready** - APIs stable, ready for Week 2 terminal features

## Next Up
- Session Graph APIs (Week 3+)
- Replay/fork endpoints
- Network/social graph queries

## Related
- vibe-terminal (consumer of these APIs)
- slashvibe.dev (MCP tools that call these APIs)
