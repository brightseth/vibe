# /vibe Session Notes — Jan 3, 2026

## Theme: Ambient Co-Presence

> "You are not building chat. You are building ambient co-presence inside a thinking loop."

---

## What We Shipped

### 1. Human-First Features

| Feature | Description |
|---------|-------------|
| `vibe_react` | Quick emoji reactions (🔥 ❤️ 👀 👏 🚀 🎉 🧠 🤌) |
| `vibe_invite` | Generate shareable invite messages |
| `vibe_echo` | Centralized feedback (all users see aggregated feedback) |
| Enhanced `vibe_who` | Random suggestions, lively room indicator |

### 2. Ambient Presence Footer

Every MCP tool response now includes:

```
────────────────────────────────────────
vibe · 2 online · **1 unread**
@stan shipping · @kristi here
────────────────────────────────────────
```

The room leaks into every response. You can't escape knowing who's around.

### 3. Terminal Escape Sequences

MCP output now includes invisible escape codes:

- **OSC 0** — Updates terminal tab/window title: `vibe: 2 online · 📩 1 · @stan`
- **OSC 1337** — Updates iTerm2 badge: `●2 ✉1` (floating overlay)

### 4. Session Rehydration

`vibe_start` now shows returning users:

```
## Welcome back, @seth

_Spirit Protocol, Eden, NODE..._

**3** people in your memory · @stan, @kristi, @solienne
```

### 5. macOS Notification Escalation

Desktop notifications trigger for:
- Messages unread > 5 minutes
- Direct @mentions
- Handshake/consent requests

NOT for general activity (avoids Slack trauma).

### 6. Background Presence Agent

New `presence-agent/` directory:

```
presence-agent/
├── index.js              # Background daemon
├── vibe.zsh              # zsh RPROMPT integration
├── com.vibe.presence-agent.plist  # launchd config
└── install.sh            # One-command install
```

**What it does:**
- Polls /vibe API every 5-30s (throttles based on activity)
- Writes `~/.vibe/state.json`
- Updates terminal title
- Runs via launchd (persists across sessions)

---

## The Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Your Terminal                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Tab Title: vibe: 2 online · 📩 1 · @stan        │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                    ┌───────────┐ │  │
│  │  $ claude                          │ ●2 ✉1    │ │  │
│  │  ...tool output...                 │ @stan 🔥  │ │  │
│  │                                    └───────────┘ │  │
│  │  ──────────────────────────────────              │  │
│  │  vibe · 2 online · **1 unread**    ← MCP Footer  │  │
│  │  @stan shipping · @kristi here                   │  │
│  │  ──────────────────────────────────              │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↑ RPROMPT    ↑ iTerm Badge      │
└─────────────────────────────────────────────────────────┘
         ↑
    ~/.vibe/state.json ←── Presence Agent (launchd)
                                  ↓
                           /vibe API (5-30s poll)
```

---

## To Activate

### 1. Restart Claude Code
Pick up the new MCP (footer + terminal escapes).

### 2. Install Presence Agent (optional but recommended)
```bash
cd ~/vibe-public/presence-agent
./install.sh
```

### 3. Add to .zshrc
```bash
source ~/.vibe/vibe.zsh
```

### 4. Restart shell or run
```bash
source ~/.vibe/vibe.zsh
```

---

## Solienne Bridge

**Status:** On-demand only (not always-on)

The bridge had CPU issues. Start manually when needed:
```bash
cd ~/solienne-vibe-bridge
EDEN_API_KEY=xxx node index.js
```

Debug the runaway process issue in a separate session.

---

## Key Commits

1. `Add reactions, invites, and fun engagement features`
2. `Centralize @echo feedback to API`
3. `Add ambient presence + session rehydration + macOS notifications`
4. `Add terminal-native ambient presence layer`

---

## The Principle

> "Presence doesn't require real-time. It requires inescapable reminders of others."

MCP can't push into Claude. But:
- The terminal can push into your peripheral vision (title, badge)
- The shell can leak ambient state at every prompt (RPROMPT)
- Every tool response can drag the room into view (footer)

This is the IRC trick: the scroll tells you you're not alone.

---

## Next Steps

1. **Test the full flow** after restart
2. **tmux integration** (if you want always-on status line)
3. **Menubar app** (Phase 3, product-grade)
4. **Activity ticker** (show micro-events like "stan pushed → main")

---

## Files Changed

```
mcp-server/index.js          # Presence footer + terminal escapes
mcp-server/notify.js         # macOS notification escalation
mcp-server/tools/start.js    # Session rehydration
mcp-server/tools/react.js    # New: emoji reactions
mcp-server/tools/invite.js   # New: shareable invites
mcp-server/tools/echo.js     # Centralized feedback
mcp-server/tools/who.js      # Enhanced suggestions
mcp-server/store/api.js      # getRawInbox for notifications
api/echo.js                  # New: centralized feedback API
presence-agent/*             # New: background presence layer
install.sh                   # Fixed URL to www.slashvibe.dev
```
