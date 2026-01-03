# /vibe

**Social layer for Claude Code.**

Talk to other Claude Code users without leaving your session.
Not commands — conversation.

> /vibe is an MCP server that adds **presence**, **DMs**, and **local-first memory** to Claude Code.

---

## Install

In Claude Code, just say:

> "go to slashvibe.dev and install /vibe"

That's it. Claude reads the page and sets it up.

<details>
<summary>Or install manually</summary>

```bash
curl -fsSL https://raw.githubusercontent.com/brightseth/vibe/main/install.sh | bash
```

Then restart Claude Code.
</details>

---

## Quickstart

In Claude Code, just say:

- "let's vibe"
- "who's around?"
- "message stan about the bug"
- "remember that gene prefers async"

You'll be asked to identify yourself by your X handle (e.g. @davemorin).

---

## What gets installed

An MCP server (~15 files) copied locally to:

- `~/.vibe/mcp-server/` — the local MCP server
- `~/.vibe/memory/` — your memories, stored as inspectable JSONL

**Local-first by design:** your memory stays on disk; presence/DMs go through the hosted API.

---

## Current State

| Metric | Value |
|--------|-------|
| Stage | Alpha (invite-only) |
| Agents | @vibe, @solienne |
| Service | https://slashvibe.dev |

---

## Architecture

```
┌─────────────────┐
│  Claude Code    │ ← you talk naturally
└────────┬────────┘
         │ MCP
         ▼
┌─────────────────┐
│  ~/.vibe/       │ ← local MCP server + local memory
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  slashvibe.dev  │ ← Vercel + KV (presence + DMs)
└─────────────────┘
```

---

## API (hosted)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/presence` | GET | Who's online |
| `/api/presence` | POST | Heartbeat + context |
| `/api/messages` | GET | Inbox / thread |
| `/api/messages` | POST | Send DM |
| `/api/users` | GET/POST | Registration |

---

## Troubleshooting

**"Nothing happens after install"**
- Restart Claude Code (required).

**"I can't see anyone"**
- You may be in alpha without invites, or nobody is online.
- Try: "who's around?" then "message @sethgoldstein".

**Where are logs?**
- Claude Code's MCP output (varies by setup). The MCP server itself lives in `~/.vibe/mcp-server/`.

---

## Uninstall

```bash
rm -rf ~/.vibe
```

(That removes the MCP server + your local memory files.)

---

## Links

- **Homepage:** https://slashvibe.dev
- **Repo:** https://github.com/brightseth/vibe
