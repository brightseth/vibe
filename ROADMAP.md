# /vibe Roadmap — January 2026

## Vision

**"AOL for AI, 30 years later"**

Core insights that guide the product:

- **Session-as-artifact** — Every coding session is a creative work worth preserving and sharing
- **Namespace instincts** — Handles are the primitive. @seth on X → @seth on /vibe. Simple, portable, owned.
- **Vibe coding velocity** — Ship fast, iterate in public, let desire paths emerge
- **Terminal-native ≠ sterile** — Early internet had warmth. Bring that back.

---

## Current State Summary

/vibe is a working social layer for Claude Code with:
- Identity, presence, DMs, games, notifications
- MCP server integration
- Deployed at slashvibe.dev
- AIRC protocol spec published

**What's working:** init, who, dm, inbox, open, status, game, doctor, remember/recall, welcome DM, inline notifications

**What's missing:** AIRC compliance (signing ✅ consent done, public keys pending)

---

## Short-Term (This Week)

### S1. MCP Server Stability ✅ DONE
- **Problem:** Must manually sync `vibe-public/mcp-server/` to `~/.vibe/mcp-server/`
- **Fix:** Symlink `~/.vibe/mcp-server` → `/Users/seth/vibe-public/mcp-server`
- **Status:** Complete (Jan 2, 2026)

### S2. Consent Handshake (AIRC Compliance) ✅ DONE
- **Problem:** Anyone can DM anyone (spam risk)
- **Fix:** Consent request/accept/block flow implemented
- **Files:** `api/consent.js`, `api/messages.js`, `mcp-server/tools/consent.js`
- **UX:** First DM to stranger auto-creates pending consent, they accept/block
- **Status:** Complete (Jan 2, 2026)

### S3. Better Onboarding ✅ DONE
- **Problem:** New users don't know what to do
- **Fix:** All prompts now use natural language ("say X" not `vibe X`)
- **Files:** `api/users.js`, `mcp-server/tools/*.js`, `index.html`

### S4. Fix Known Bugs ✅ DONE
- [x] Bridge crashes (exit -9) — added error backoff, global error handlers, health logging
- [x] Presence "NaN ago" display bug — fixed in 5 timeAgo functions
- [x] Doctor shows false negatives in ephemeral mode — detects ephemeral mode

---

## Medium-Term (This Month)

### M1. AIRC Signing (Security)
- Add Ed25519 keypair generation on `vibe init`
- Store private key in `~/.vibe/keypair.json`
- Sign all outgoing messages
- Verify signatures on incoming (optional for v0.1)
- **Files:** `mcp-server/config.js`, `mcp-server/crypto.js` (new), all tools

### M2. More Games
- Chess (algebraic notation payloads)
- Word games (20 questions, word chain)
- Collaborative storytelling
- **Files:** `mcp-server/tools/game.js`, `mcp-server/protocol/games/`

### M3. Richer Presence
- Typing indicators (`vibe typing @user`)
- Read receipts (mark messages as read)
- Activity context from Claude Code (what file you're editing)
- **Files:** `api/presence.js`, `mcp-server/presence.js`

### M4. Webhook Delivery
- Optional real-time notifications
- Register webhook URL on identity
- Push messages instead of poll-only
- **Files:** `api/webhooks.js` (new), `api/messages.js`

### M5. External Bridge Support
- Document how to build bridges (like Solienne bridge)
- Bridge SDK/template
- Example: Discord bridge, Slack bridge
- **Files:** `docs/bridges.md`, `examples/bridge-template/`

### M6. Nostalgia Stack ✅ DONE (Jan 9, 2026)
- **Philosophy:** Terminal-native ≠ sterile. Early internet had warmth.
- **Research:** AOL, BBS, CompuServe, Prodigy, Pipeline — what made them feel like *places*
- **Shipped:**
  - Multiplayer crossword (daily puzzles, collaborative + competitive)
  - AIM-style away messages (☕ manual, 💤 auto-away)
  - Serendipity engine (same file detection, similar work)
  - Creative feed (ideas, riffs, ships)
- **Files:** `docs/nostalgia-research.md`, `mcp-server/games/crossword.js`, `mcp-server/tools/away.js`

### M7. Ambient Social Intelligence ✅ DONE (Jan 9, 2026)
- Smart detection (deep focus, debugging, shipping, exploring, late night)
- Proactive agent (ships in the night, break suggestions, welcome wagon)
- **Files:** `mcp-server/intelligence/infer.js`, `mcp-server/intelligence/serendipity.js`

### M8. vibe-desktop (Stan)
- Mac app wrapper for MCP server
- GUI installer & auto-updater
- One-click install for non-technical users
- **Branch:** `app-macOS`
- **Owner:** @wanderingstan

### M9. Spectator Mode 🆕
- **Concept:** Twitch for terminals — watch someone vibe code in real time
- **Use cases:**
  - Pair programming without screenshare
  - Learning by watching experts
  - "Office hours" where builders stream their sessions
  - Content creation (terminal as performance)
- **Technical:**
  - Session streaming via WebSocket
  - Read-only view of terminal output
  - Optional chat sidebar
  - Permission model (public/friends/invite-only)
- **Inspiration:** BBS door watching, Twitch, VS Code Live Share
- **Status:** Proposed (from @wanderingstan)

---

## Long-Term (Q1-Q2 2026)

### L1. Federation
- `@handle@domain` support
- `.well-known/airc` discovery
- Cross-registry messaging
- **Scope:** Major architectural change

### L2. Groups/Channels
- `#channel` support (like IRC)
- Multi-party conversations
- Channel presence
- **Scope:** New primitives, API changes

### L3. E2E Encryption
- X25519 key exchange
- Encrypted DM payloads
- Key rotation
- **Scope:** Crypto layer

### L4. Rich Media
- File sharing payloads
- Image/code snippet previews
- Link unfurling
- **Scope:** Storage, CDN

### L5. Mobile/Web Client
- Web UI for non-Claude-Code users
- Mobile app (PWA)
- **Scope:** New frontend project

---

## Priority Matrix

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| S2. Consent | High (spam prevention) | Medium | **P0** |
| S1. MCP Stability | Medium (DX) | Low | **P0** |
| M1. Signing | High (security) | High | **P1** |
| S3. Onboarding | Medium (retention) | Low | **P1** |
| M2. More Games | Medium (engagement) | Medium | **P2** |
| M3. Richer Presence | Medium (UX) | Medium | **P2** |
| M4. Webhooks | Medium (real-time) | Medium | **P2** |
| M6. Nostalgia Stack | High (soul) | Medium | **P1** ✅ |
| M7. Ambient Intelligence | High (magic) | Medium | **P1** ✅ |
| M8. vibe-desktop | High (distribution) | High | **P1** 🔨 |
| M9. Spectator Mode | High (viral) | High | **P2** |

---

## Quick Wins (< 1 hour each)

1. Fix presence "NaN ago" bug
2. Add `vibe help` command
3. Improve error messages
4. Add `vibe ping @user` for lightweight presence check
5. Add user count to `vibe who`

---

## Files Reference

**Core API:**
- `api/users.js` — registration, welcome DM
- `api/messages.js` — send/receive
- `api/presence.js` — heartbeat, who's online

**MCP Server:**
- `mcp-server/index.js` — entry point
- `mcp-server/tools/*.js` — individual commands
- `mcp-server/store/api.js` — API client
- `mcp-server/protocol/index.js` — payload schemas

**Config:**
- `~/.vibe/mcp-server/` — runtime location
- `~/.claude/mcp_servers.json` — Claude Code config

---

## Next Session Starting Point

1. Read this plan
2. Pick a task from Short-Term
3. Start with S1 (MCP stability) or S2 (consent)
4. Run `vibe doctor` to check system health

---

*Plan created: January 3, 2026*
*Updated: January 9, 2026 — Vision section, M6-M9, Spectator Mode proposed*
