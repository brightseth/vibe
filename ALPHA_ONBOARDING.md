# /vibe Closed Alpha (Phase 1)

Vibe adds a communication layer inside Claude Code.

**This alpha is testing ONE thing:**
> Do you DM people inside Claude Code instead of switching to Discord?

**Alpha note:** Messages are not end-to-end encrypted. Don't send secrets.

---

## Install (2 minutes)

```bash
curl -fsSL https://raw.githubusercontent.com/brightseth/vibe/main/install.sh | bash
```

This installs to `~/.vibe/` and adds the MCP server to your `~/.claude.json`.

**Then restart Claude Code.**

---

## Setup (60 seconds)

Once Claude Code restarts, run:

```
vibe init
```

You'll be asked for:
- **Handle** — your username (e.g., `seth`, `kristi`)
- **One-liner** — what you're working on (e.g., "building /vibe")

That's it. You're live.

---

## Daily Loop

**Morning:**
```
vibe who
```
See who's online. Their handle + what they're working on.

**When you want to reach someone:**
```
vibe dm @handle hey, saw you're working on X — want to sync?
```

**Check messages:**
```
vibe inbox
```
Shows unread threads. Numbers indicate unread count.

**Read a thread:**
```
vibe open @handle
```
Full conversation history with that person.

---

## What's Included (Phase 1)

| Command | What it does |
|---------|--------------|
| `vibe init` | Set your handle + one-liner |
| `vibe who` | See who's online (5 min idle threshold) |
| `vibe ping @handle` | Lightweight nudge ("I'm thinking of you") |
| `vibe dm @handle msg` | Send a direct message |
| `vibe inbox` | See all threads with unread counts |
| `vibe open @handle` | Read full thread history |

**Presence is automatic** — as long as your MCP server is running, you show up in `vibe who`.

---

## What's NOT Included Yet

Phase 2 (coming soon, feature-flagged):
- **Traces** — breadcrumbs of what you're building
- **Explore** — browse others' traces
- **Gigabrain** — collective memory queries

We're testing the communication primitive first. If DMs work, we build on top.

---

## Feedback

This is a closed alpha. Please send feedback directly to Seth:

- What worked?
- What felt awkward?
- Did you actually DM someone instead of switching apps?

The single metric we care about:
> **Did you message another human inside Claude Code today?**

---

## Troubleshooting

**MCP server not loading?**
- Restart Claude Code
- Check `~/.claude.json` has the `vibe` entry under `mcpServers`

**Can't see anyone in `vibe who`?**
- Others need to have run `vibe init` recently
- Presence expires after 5 minutes of inactivity

**Messages not sending?**
- Check your internet connection
- API endpoint: `https://vibe-public-topaz.vercel.app`

---

**/vibe Phase 1 — Communication First**

Built Dec 31, 2024
