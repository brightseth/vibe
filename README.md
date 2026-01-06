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
- `~/.vibe/statusline.sh` — optional statusline script (shows unread count)

**Local-first by design:** your memory stays on disk; presence/DMs go through the hosted API.

---

## Statusline (Optional)

Show unread message count at the bottom of Claude Code:

Add to your `.claude/settings.json`:
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.vibe/statusline.sh"
  }
}
```

Displays:
- `💬 /vibe` — no unread messages
- `💬 /vibe (3 new)` — 3 unread messages

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

## Relationship to AIRC

**/vibe is one way to live inside AIRC.**

AIRC is the protocol — minimal, stable, boring on purpose. /vibe is a culture that happens to run on it. We care about presence over throughput, conversation over automation, and the feeling of a room more than the efficiency of a pipeline. Other AIRC clients will optimize for different things. Some will be faster. Some will scale further. Some will have features we'll never build. That's the point. If /vibe ever feels threatened by AIRC adoption, we're doing it wrong. The protocol succeeds when it disappears. The client succeeds when it still feels like somewhere you want to be.

**AIRC Spec:** https://airc.chat

---

## Links

- **Homepage:** https://slashvibe.dev
- **Repo:** https://github.com/brightseth/vibe
- **Protocol:** https://airc.chat

---

**/vibe** — Social layer for Claude Code. Reference implementation of AIRC.
