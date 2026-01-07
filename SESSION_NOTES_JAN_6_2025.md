# /vibe Demo Prep Session — Jan 6, 2025

## What Was Accomplished

### 1. Website Sync (Complete)
All pages updated to reflect current state:
- `index.html` — Agent callout (@echo, @claudevibe, @gptvibe), token auth, real users
- `llms.txt` — Tool count 22→30, added Social/Collaboration categories
- `spec.html` — MVP scope (30 tools, AI agents live), updated phases
- `vision.html` — Phases reflect current state, native agents in "Why Now"
- `api/cron/echo.js` — Fixed syntax error (*/5 in comment)

**Commits:**
- `07cf34c` — Update website to reflect current state
- `2e1ed99` — Fix syntax error in echo.js comment
- `f6dbde8` — Add demo prompts for Option C

### 2. Unread Copy Update (Complete — needs restart)
Files updated at `/Users/seth/.vibe/mcp-server/tools/`:
- `inbox.js` — Header: `— N UNREAD`, per-thread: `📬 NEW MESSAGE`
- `start.js` — `📬 **NEW MESSAGE — N UNREAD**`
- `who.js` — `📬 **NEW MESSAGE — N UNREAD**`
- `init.js` — `📬 **NEW MESSAGE — N UNREAD**`

**Status:** Edits in place. Requires Claude Code restart to take effect.

### 3. Demo Flow Verified (Dry Run)
| Step | Result |
|------|--------|
| Terminal A joins | ✅ Shows online count |
| Terminal B joins | ✅ Registration + heartbeat works |
| Presence flip | ✅ Count increases, "just joined" badge |
| DM sent | ✅ Message delivered, signature verified |
| Message received | ✅ Visible in recipient inbox |
| Inbox unread | ✅ Shows unread indicator |

**Latency:** ~200-400ms per API call (no polling, instant)

---

## How to Pick Back Up

### 1. Verify MCP Server Restart Worked
```
vibe inbox
```
Should now show: `📬 NEW MESSAGE` (not `📬 1 new`)

### 2. Pre-Flight Checklist
- [ ] Clear state: `rm -rf ~/.vibe` (on both demo terminals)
- [ ] Font size: 20pt+
- [ ] Dark theme
- [ ] Open `DEMO_PROMPTS.md` for reference

### 3. Run Demo
See `DEMO_PROMPTS.md` for full script. Key sequence:

**Terminal A:**
```
Let's vibe. I'm @sethdemo, building a social layer for Claude Code.
```

**Terminal B:**
```
Let's vibe. I'm @standemo, exploring terminal interfaces.
```

**Terminal A (THE FLIP):**
```
Who's around?
```

**Terminal A (DM):**
```
Send a DM to @standemo: "Hot take: vibecoding alone is a mistake."
```

**Terminal B (UNREAD):**
```
Check my inbox
```

---

## Key Files

| File | Purpose |
|------|---------|
| `/Users/seth/.vibe/vibe-repo/DEMO_PROMPTS.md` | Full demo script with timing |
| `/Users/seth/.vibe/vibe-repo/index.html` | Landing page (deployed) |
| `/Users/seth/.vibe/mcp-server/tools/*.js` | MCP tools (edited for NEW MESSAGE copy) |
| `~/.claude.json` | MCP server config (points to ~/.vibe/mcp-server) |

## Architecture Notes

- **No polling** — Each MCP tool call is a fresh API request
- **Presence TTL** — 5 minutes in Vercel KV
- **Auth** — Token-based (session registration)
- **Latency** — ~200-400ms network round-trip

## Pending (Not Blocking Demo)

From original todo list:
- [ ] Presence visibility controls (invisible mode)
- [ ] Abuse reporting endpoint
- [ ] Document retention policy

---

## Quick Test After Restart

Run these to confirm everything works:

```bash
# 1. Check MCP server is loading from right path
cat ~/.claude.json | jq '.mcpServers.vibe'

# 2. Test presence API
curl -sL https://slashvibe.dev/api/presence | jq '.active | length'

# 3. In Claude Code, verify new copy:
vibe inbox
# Should show "📬 NEW MESSAGE" not "📬 1 new"
```

---

**Ready for demo recording after restart.**
