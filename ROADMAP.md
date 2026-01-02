# /vibe Roadmap — January 2026

## Current State Summary

/vibe is a working social layer for Claude Code with:
- Identity, presence, DMs, games, notifications
- MCP server integration
- Deployed at slashvibe.dev
- AIRC protocol spec published

**What's working:** init, who, dm, inbox, open, status, game, doctor, remember/recall, welcome DM, inline notifications

**What's missing:** AIRC compliance (signing, consent, public keys)

---

## Short-Term (This Week)

### S1. MCP Server Stability
- **Problem:** Must manually sync `vibe-public/mcp-server/` to `~/.vibe/mcp-server/`
- **Fix:** Add npm postinstall script or symlink
- **Files:** `package.json`, install script

### S2. Consent Handshake (AIRC Compliance)
- **Problem:** Anyone can DM anyone (spam risk)
- **Fix:** Add consent request/accept/block flow
- **Files:** `api/consent.js` (new), `api/messages.js`, `mcp-server/tools/dm.js`
- **UX:** First DM to stranger sends consent request, they accept/block

### S3. Better Onboarding
- **Problem:** New users don't know what to do
- **Fix:** Improve welcome DM, add `vibe start` entry point
- **Files:** `api/users.js`, `mcp-server/tools/start.js`

### S4. Fix Known Bugs
- [ ] Bridge crashes (exit -9) — improve error handling
- [ ] Presence "NaN ago" display bug
- [ ] Doctor shows false negatives in ephemeral mode

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
