# VIBE

**The Social CLI**

Terminal with presence, sessions, and agents.

## Week 1 Foundation ✅ COMPLETE

**Status: Working and verified** (Jan 8, 2026)

- ✅ Real PTY terminal (zsh/bash)
- ✅ xterm.js frontend with Spirit blue theme
- ✅ Session recording to SQLite (~/.vibecodings/sessions.db)
- ✅ Command/output logging with timestamps
- ✅ Terminal resize handling
- 🚧 Session replay UI (next)
- 🚧 Shell integration markers (next)
- 🚧 Export session JSON (next)

## Prerequisites

- **Rust** (stable) - https://rustup.rs/
- **Node.js** (18+) - https://nodejs.org/
- **pnpm** (recommended) - `npm install -g pnpm`

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

The terminal window will open. You now have:
- A real shell (zsh on Mac)
- Every command + output is recorded to SQLite
- Sessions stored in `~/.vibecodings/sessions.db`

**To verify it's working, see [VERIFY.md](./VERIFY.md)**

## Project Structure

```
vibe-terminal/
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── main.rs     # Tauri entry + commands
│   │   ├── pty.rs      # PTY management
│   │   └── db.rs       # SQLite session storage
│   └── Cargo.toml
├── src/                # React frontend
│   ├── components/
│   │   └── Terminal.tsx  # xterm.js wrapper
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

## What's Working

**Terminal:**
- Spawns real shell (zsh on macOS, bash elsewhere)
- Full line editing, history, tab completion (shell handles it)
- xterm.js rendering with proper theming
- Resize handling

**Session Recording:**
- Creates session on startup (UUID)
- Logs all commands + output to SQLite
- Tracks session start/end times
- Stores current working directory + shell type

**Database:**
- `sessions` table: session metadata
- `events` table: command/output events
- Located at `~/.vibecodings/sessions.db`

## What's Next (Week 1 Completion)

- [ ] Shell integration markers (OSC sequences for command boundaries)
- [ ] Session replay UI (view past sessions)
- [ ] Block-based output (group command → output)
- [ ] Export session JSON

## Architecture

```
┌─────────────────────────────────────┐
│         Tauri App (Vibe)            │
├──────────────┬──────────────────────┤
│  Terminal    │  Social (placeholder)│
│  (xterm.js)  │                      │
└──────────────┴──────────────────────┘
       ↕                ↕
┌──────────────┬──────────────────────┐
│ Rust Backend │                      │
│ - PTY        │  SQLite              │
│ - I/O loop   │  sessions.db         │
└──────────────┴──────────────────────┘
```

## Development

**Rust side:**
```bash
cd src-tauri
cargo build
```

**Frontend:**
```bash
pnpm dev  # Vite dev server
```

**Both together:**
```bash
pnpm tauri dev
```

## Building for Release

```bash
pnpm tauri build
```

Creates a `.dmg` in `src-tauri/target/release/bundle/dmg/`

## Database Schema

**Sessions:**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  cwd TEXT,
  shell TEXT
);
```

**Events:**
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,  -- 'pty_out' | 'user_in' | 'marker'
  data TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);
```

## Viewing Sessions

```bash
sqlite3 ~/.vibecodings/sessions.db "SELECT * FROM sessions ORDER BY started_at DESC LIMIT 10;"
```

## Troubleshooting

**Terminal not opening:**
- Check Rust is installed: `rustc --version`
- Check Tauri CLI: `pnpm tauri info`

**Output lag:**
- Currently polling every 10ms - will optimize with events

**Build errors:**
- Run `cargo clean` in `src-tauri/`
- Delete `node_modules` and `pnpm install` again

## Next Phase

**Week 2-3:** Claude Code integration
**Week 4-5:** Social sidebar (presence + messages)
**Week 6-7:** Games + collaboration
**Week 8-9:** Session sharing + polish

---

**This is the foundation.** Everything builds on this PTY + session recording core.

Let's ship it.
