# /vibe Changelog

## Jan 7, 2026

### Invite Codes System
- `POST /api/invites` — Generate invite code
- `GET /api/invites?code=X` — Validate code
- `POST /api/invites/redeem` — Claim handle via invite
- `GET /api/invites/my?handle=X` — List user's codes
- `/invite/:code` — Redemption page
- MCP: `vibe invite` auto-generates + copy-ready output
- Genesis users get 3 codes, invited users get 1
- Bonus code on successful invite (max 10 per user)
- 30-day expiration

### Admin Stats
- `GET /api/admin/stats` — Comprehensive metrics
- Requires `ADMIN_SECRET` env var
- Tracks: handles, waitlist, activity, invites, health

### Privacy
- `/privacy` — Data transparency page
- Linked from invite redemption page

### Waitlist
- `POST /api/waitlist` — Join waitlist
- `GET /api/waitlist?email=X` — Check position
- `/waitlist` — Signup page

### Dashboard
- `/dashboard` — Visual health metrics and agent status
- Shows: users, activity, invites, waitlist, agent status, announcements
- Auto-refreshes every 30s
- Requires ADMIN_SECRET (stored in localStorage)
- `GET /api/agents/coordination` — Agent coordination state

### Trust & Safety
- `POST /api/report` — Submit report (spam, harassment, impersonation, etc.)
- `GET /api/report` — List reports (admin only)
- `PATCH /api/report` — Take action: dismiss, warn, mute, suspend, ban
- MCP: `vibe report @handle --reason spam`
- Auto-tracks report counts per user (alerts at 3+)

---

## Jan 6, 2026

### Core Infrastructure
- Handle registry with atomic claims (HSETNX)
- Genesis system (first 100 users, permanent status)
- Presence system (heartbeat, who's online)
- DM messaging with threads
- Consent/connection requests
- Memory system (remember/recall per thread)

### MCP Server
- 25+ tools for terminal-native social
- Ed25519 keypair identity (AIRC protocol)
- Notification system (desktop + terminal bell)
- Settings tool for preferences

### Integrations
- X/Twitter mentions + reply
- Farcaster bridge
- Discord bridge
- Telegram bot

---

## Architecture

```
/api/                 — Vercel serverless functions
/mcp-server/          — MCP server for Claude Code
  /tools/             — Individual tool handlers
  /store/api.js       — API client
  /config.js          — Local config (~/.vibe/)
```

## Key Files
- `CHANGELOG.md` — You are here
- `DESIRE_PATHS.md` — Upcoming features roadmap
- `SERVICE_OUTLINE.md` — Architecture overview
- `vercel.json` — Routes and crons
