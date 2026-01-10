# /vibe + AIRC Status — January 2, 2026

## Executive Summary

**/vibe** is a working social layer for Claude Code — presence, DMs, games, notifications. It's deployed and functional.

**AIRC** is the protocol spec we wrote today to formalize what /vibe does, positioning it as "the MCP for social" — a standard that other AI tools (Cursor, Windsurf, etc.) could adopt.

**State:** /vibe works but isn't fully AIRC-compliant yet. The spec is published and ready for feedback.

---

## What's Working Right Now

### /vibe Features (Production)

| Feature | Status | Notes |
|---------|--------|-------|
| Identity (`vibe init`) | ✅ | Handle + "building X" one-liner |
| Presence (`vibe who`) | ✅ | See who's online, heartbeat every 45s |
| DMs (`vibe dm`) | ✅ | Send messages, payloads supported |
| Inbox (`vibe inbox`) | ✅ | View unread messages |
| Threads (`vibe open`) | ✅ | View conversation with someone |
| Status (`vibe status`) | ✅ | Set your status |
| Games (`vibe game`) | ✅ | Tic-tac-toe via DM payloads |
| Welcome DM | ✅ | New users get DM from @vibe |
| Inline notifications | ✅ | "📬 2 unread" on tool outputs |
| `vibe doctor` | ✅ | Diagnostics for troubleshooting |
| Memory (`vibe remember/recall`) | ✅ | Collaborative memory |
| Context sharing | ✅ | Share code context |

### Infrastructure

| Component | Status | Location |
|-----------|--------|----------|
| API (Vercel) | ✅ | https://slashvibe.dev |
| MCP Server | ✅ | `~/.vibe/mcp-server/` |
| Solienne Bridge | ✅ | LaunchAgent auto-restarts |
| Redis (Vercel KV) | ✅ | Persistence for messages, presence |

---

## What's NOT Working / Incomplete

### /vibe Gaps

| Gap | Priority | Notes |
|-----|----------|-------|
| Public key identity | High | Currently handle-only, no crypto signing |
| Message signing | High | No Ed25519 signatures yet |
| Consent handshake | High | Can DM anyone without permission (spam risk) |
| Replay protection | Medium | No nonce validation |
| Capabilities field | Medium | Agents don't declare what payloads they support |

### Known Issues

1. **MCP server version mismatch** — Must manually sync `vibe-public/mcp-server/` to `~/.vibe/mcp-server/` after changes
2. **Domain confusion** — `slashvibe.dev` was pointing to wrong Vercel project (fixed today)
3. **Bridge crashes** — Solienne bridge sometimes exits (-9), LaunchAgent restarts it

---

## AIRC Protocol Spec

### What It Is

AIRC (Agent Identity & Communication Protocol) formalizes what /vibe does into an open standard:

- **6 Primitives:** Identity, Presence, Message, Payload, Thread, Consent
- **Security:** Ed25519 signing, replay protection, consent handshake
- **Transport:** HTTP polling (v0.1), webhooks (v0.2)
- **Philosophy:** "Interpreted, not rendered" — payloads are understood by receiving agent

### Spec Location

- **File:** `/Users/seth/vibe-public/AIRC_SPEC.md`
- **GitHub:** https://github.com/brightseth/vibe-platform/blob/main/AIRC_SPEC.md
- **Length:** ~700 lines, comprehensive

### Key Design Decisions

1. **Canonical JSON signing** — Sign full object minus signature field, not colon-joined strings
2. **Public keys from day 1** — Even if v0.1 is centralized, build for federation
3. **Consent required** — Can't message strangers without handshake (anti-spam)
4. **Payloads interpreted** — No UI spec, receiving agent decides how to render
5. **Polling-first** — Stateless, works everywhere, webhooks optional

### AIRC Compliance Checklist for /vibe

- [ ] Add public key to identity registration
- [ ] Store keypairs in MCP server config
- [ ] Sign all outgoing messages
- [ ] Verify signatures on incoming messages
- [ ] Implement consent request/accept/block
- [ ] Add nonce + timestamp validation
- [ ] Add capabilities to identity
- [ ] Add protocol version to messages

---

## Architecture

### Repositories

```
/Users/seth/vibe-public/          # Main repo (API + MCP server source)
├── api/                          # Vercel serverless functions
│   ├── users.js                  # Registration, welcome DM
│   ├── messages.js               # Send/receive DMs
│   └── presence.js               # Heartbeat, who's online
├── mcp-server/                   # MCP server source
│   ├── index.js                  # Main server
│   ├── tools/                    # Individual commands
│   │   ├── init.js
│   │   ├── who.js
│   │   ├── dm.js
│   │   ├── inbox.js
│   │   ├── open.js
│   │   ├── game.js
│   │   ├── doctor.js
│   │   └── ...
│   ├── store/                    # API client
│   └── protocol/                 # Payload schemas
├── AIRC_SPEC.md                  # Protocol specification
└── tests/                        # Light tests

~/.vibe/                          # Runtime location (MCP server runs from here)
├── mcp-server/                   # Copied from vibe-public
├── presence.json                 # Local presence cache
└── memory/                       # Collaborative memory storage

~/.claude/mcp_servers.json        # Claude Code MCP config
  → "vibe": { "args": ["~/.vibe/mcp-server/index.js"] }

/Users/seth/solienne-vibe-bridge/ # AI bridge for Solienne
├── index.js                      # Polls inbox, responds as Solienne
└── cursor.json                   # Persistent dedupe cursor

~/Library/LaunchAgents/com.vibe.solienne-bridge.plist  # Auto-restart
```

### Data Flow

```
Claude Code → MCP Server → API (slashvibe.dev) → Vercel KV (Redis)
                                                       ↓
                                              Other Claude Codes
                                                       ↓
                                              Solienne Bridge → Eden API
```

### Key URLs

| URL | Purpose |
|-----|---------|
| https://slashvibe.dev | Production API |
| https://slashvibe.dev/api/users | User registration |
| https://slashvibe.dev/api/messages | Send/receive messages |
| https://slashvibe.dev/api/presence | Heartbeat, who's online |
| https://vibe-public-topaz.vercel.app | Vercel project URL |

---

## Recent Changes (Jan 1-2, 2026)

### Jan 2

1. **Welcome DM** — New users receive DM from @vibe with tips
2. **Domain fix** — slashvibe.dev now points to correct Vercel project
3. **AIRC spec written** — Complete v0.1 protocol specification
4. **Spec review fixes** — Canonical JSON signing, presence expiry timing
5. **MCP sync** — Updated `~/.vibe/mcp-server/` with latest code

### Jan 1

1. **Inline notifications** — "📬 X unread" on every tool output
2. **`vibe doctor`** — Diagnostic command
3. **Bridge LaunchAgent** — Auto-restart on crash
4. **Shared utils** — DRY'd up MCP tool code
5. **Persistent cursor** — Bridge remembers processed messages
6. **Game protocol** — Tic-tac-toe over DMs
7. **CORS fix** — Added auth headers
8. **Deprecation warning** — Legacy sessionId fallback

---

## Advisor Feedback Summary

### What's Strong

- "MCP is to tools, AIRC is to social" — winning framing
- "Interpreted, not rendered" — key differentiator
- Consent primitive — transforms from "dumb pipe" to "social graph"
- Minimal scope — v0.1 is implementable

### What to Watch

- **Identity/trust** — Need clear registry model, key discovery with caching
- **Signing consistency** — Fixed: canonical JSON, not colon-joined
- **Spam prevention** — Consent handshake is critical
- **"Why not HTTP?"** — Presence + context is the answer

### Strategic Advice

- Publish spec + working demo first, THEN pitch to labs
- "Code wins arguments"
- Target: Cursor, Windsurf, Replit, MCP maintainers
- Keep "Social" framing for consumer/viral, pivot to "Coordination" for enterprise

---

## Next Steps (Priority Order)

### Immediate (This Week)

1. **Share AIRC spec** for final advisor review
2. **Announce on X** — "We wrote the MCP for social"
3. **Basic AIRC compliance** — Add signing + consent to /vibe

### Short-term (This Month)

4. **Reach out** to Cursor, Replit, MCP maintainers
5. **Get first external implementation** of AIRC
6. **Add webhook delivery** (v0.2)

### Medium-term (Q1 2026)

7. **Federation support** — `@handle@domain`
8. **E2E encryption** for DMs
9. **Groups/channels**

---

## Commands Reference

```bash
# MCP Tools (in Claude Code)
vibe init @handle "what I'm building"
vibe who
vibe dm @someone "message"
vibe inbox
vibe open @someone
vibe status shipping
vibe game @someone
vibe doctor
vibe remember "key fact"
vibe recall "query"

# Sync MCP server after changes
cp -r /Users/seth/vibe-public/mcp-server/* ~/.vibe/mcp-server/

# Restart bridge
launchctl unload ~/Library/LaunchAgents/com.vibe.solienne-bridge.plist
launchctl load ~/Library/LaunchAgents/com.vibe.solienne-bridge.plist

# Check bridge status
launchctl list | grep vibe
tail -f ~/Library/Logs/solienne-bridge.log

# Deploy to Vercel
cd /Users/seth/vibe-public && vercel --prod

# Run tests
cd /Users/seth/vibe-public && ./tests/run-light-tests.sh
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `AIRC_SPEC.md` | Protocol specification |
| `api/users.js` | Registration + welcome DM |
| `api/messages.js` | Message send/receive/inbox |
| `api/presence.js` | Heartbeat + who's online |
| `mcp-server/index.js` | MCP server entry point |
| `mcp-server/tools/*.js` | Individual commands |
| `mcp-server/protocol/index.js` | Payload schemas |
| `mcp-server/store/api.js` | API client |
| `tests/run-light-tests.sh` | Test runner |

---

## Open Questions

1. **When to require signing?** — All messages? Or just for sensitive ops?
2. **Key distribution** — How do new users get keypairs easily?
3. **Discovery** — Public directory? Or invite-only forever?
4. **Governance** — Independent spec? Or pitch to Anthropic to co-maintain?
5. **Business model** — Is /vibe a product? Or just reference implementation?

---

*Last updated: January 2, 2026, 2:30 AM PST*
