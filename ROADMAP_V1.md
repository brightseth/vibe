# VIBE - Executable Roadmap v1

**Created:** January 8, 2026
**Last Updated:** January 8, 2026
**Status:** Week 1 Complete → Week 2 Starting

---

## The Vision (30 seconds)

**VIBE is the social platform for the AI era.**

Like AOL brought people online.
Like FACEBOOK made social networks mainstream.
Like WHATSAPP made messaging universal.
Like INSTAGRAM made everyone a photographer.

**VIBE makes the command line social.**

Terminal sessions become shareable knowledge. Building alone becomes building together. The command line becomes a creative platform.

---

## The Killer Demo (90 seconds)

1. **Open VIBE** → See @gene and @maya online, building in real-time
2. **Run commands** → `git status`, `npm test`, Claude fixes a bug
3. **Share session** → Click "Share" → Get instant link
4. **Others discover** → "How to deploy Next.js" becomes a runbook
5. **Remix and fork** → One-click run someone else's workflow
6. **Network effect** → Knowledge compounds, community grows

**The loop:** Create → Share → Discover → Remix → Create

---

## What We Shipped (Week 1) ✅

**Foundation Complete - January 8, 2026**

- Real PTY-backed terminal (zsh/bash via portable-pty)
- xterm.js frontend with Spirit blue theme
- Session recording to SQLite (~/.vibecodings/sessions.db)
- Events table capturing all PTY output with timestamps
- Terminal resize handling
- Tauri native Mac app running in dev mode

**Verified Working:**
- App running (PID 35535)
- Database recording (2 sessions, 5+ events)
- Clean architecture (Rust + React + xterm.js)

**Git Status:**
- 3 commits, 28 files
- Ready to push to GitHub

---

## Critical Path: The Non-Negotiables

These must ship in this order. Everything else is optional.

### 1. Shell Integration Markers (Week 1 finish - TODAY)

**Why First:** Unlocks structured sessions, blocks, replay, sharing, Claude traces

**What:** OSC 133 sequences for deterministic command boundaries

**Implementation:**
- Create `~/.vibecodings/zshrc/<session_id>/` per session
- Generate `.zshrc` wrapper that sources user's real zshrc + vibe.zsh
- Set `VIBE_NONCE` (random per session) to prevent spoofing
- Emit OSC sequences:
  - `133;A` = Prompt start
  - `133;C` = Command execution start
  - `133;D;<exit>` = Command end + exit code
  - `133;VIBE;CMD;<base64>` = Final command text
- Parse OSC in Rust PTY reader (state machine for escape sequences)
- Add `commands` table (id, session_id, started_at, ended_at, exit_code, input)

**Success Metric:**
- Run `echo hi`, `false`, `ls -la`
- See 3 rows in `commands` table
- Exit codes correct (0, nonzero, 0)
- Command text accurate including args

**Timeline:** 2-3 hours (TODAY)

---

### 2. Session Replay UI (Week 1 finish - TODAY)

**Why Second:** Proves that recording is useful, validates UX

**What:** View past terminal sessions in the app

**Implementation:**
- `Cmd+Shift+S` opens sessions drawer
- List sessions showing:
  - Timestamp (e.g., "Jan 8, 10:29 PM")
  - Duration (e.g., "5 min")
  - Top 2 commands (from `commands` table)
- Click → "Replay mode" with:
  - New xterm.js instance
  - Replay `events` where `kind='pty_out'`
  - Speed controls: instant / 2x / realtime
  - "Jump to command" buttons (using `commands`)

**Success Metric:**
- Can view any past session
- Replay looks like original terminal session
- Can jump to specific commands

**Timeline:** 4-5 hours (TODAY)

---

### 3. Session Export JSON (Week 1 finish - TODAY)

**Why Third:** Quick win, enables sharing foundation

**What:** Export session to structured JSON

**Implementation:**
- "Export Session" button in replay UI
- Generate JSON:
  ```json
  {
    "version": "1.0",
    "session": { "id": "...", "started_at": "...", ... },
    "commands": [ { "input": "git status", "exit_code": 0, ... } ],
    "events": [ { "ts": 123, "kind": "pty_out", "data_b64": "..." } ]
  }
  ```
- Save to file
- Copy filepath to clipboard

**Success Metric:**
- Can export any session
- JSON validates
- Can re-import (bonus)

**Timeline:** 1-2 hours (TODAY)

**Total Week 1:** ~8 hours to complete

---

## Phase 1: The Viral Loop (Weeks 2-5)

**Goal:** Make VIBE sessions shareable → drive organic growth

### Week 2-3: Social Sidebar (Presence + Messages)

**Why Before Claude:** Uses existing backend, faster to ship, validates social thesis

**What to Build:**

**1. Backend Connection (Day 1)**
- Load config from `~/.vibecodings/config.json` (AIRC keypair)
- Connect to existing Vercel API (already built for /vibe MCP)
- WebSocket for presence
- HTTP for messages

**2. Presence Sidebar (Day 2-3)**
```
┌─────────────────────────────────┐
│  Terminal      │  Who's Online  │
│                │                │
│  $ _           │  🟢 @gene      │
│                │  Building: AI  │
│                │                │
│                │  🟢 @maya      │
│                │  Building: art │
│                │                │
│                │  [Set Status]  │
└─────────────────────────────────┘
```

**3. Messaging (Day 4-5)**
- Inbox view (unread count badge)
- DM threads
- Send message modal
- macOS native notifications

**Success Metric:**
- Can see who's online
- Can send/receive messages
- Notifications work

**Timeline:** 2 weeks

---

### Week 4-5: Session Sharing (The Growth Engine)

**Why Now:** This is acquisition. If I have a breakthrough with Claude (Week 6), I need to share it immediately.

**What to Build:**

**1. Upload to Backend (Day 1-2)**
- Add `/api/sessions` endpoint to Vercel
- Upload session JSON (from export feature)
- Generate shareable UUID
- Return public URL: `vibe.sh/s/<uuid>`

**2. Web Player (Day 3-5)**
- Standalone web page (not in app)
- Renders xterm.js replay
- Shows command blocks
- "Fork to VIBE" button (installs app if needed)
- Embed code for blogs/docs

**3. In-App Sharing (Day 6-7)**
- "Share Session" button in app
- Auto-upload + copy link
- Optional: Add title/description
- Privacy: private by default, opt-in to public

**4. Discovery (Day 8-10)**
- `/explore` page on web
- Browse public sessions
- Search by command, tags, user
- "Top Sessions This Week"

**Success Metric:**
- Can share session with one click
- Link works in browser (no install required)
- Sessions become viral content

**Timeline:** 2 weeks

---

## Phase 2: The Differentiator (Weeks 6-7)

### Week 6-7: Claude Code Integration

**Why Now:** Social + sharing are shipped. Now add the superpower.

**Technical Approach:**

**Option A: CLI Subprocess (Ship First)**
- Spawn `claude` CLI in virtual PTY
- Parse state from virtual terminal (screen scraping)
- Detect: thinking, planning, executing, waiting
- Risk: Fragile, escape codes are a nightmare

**Option B: Anthropic API (Cleaner Long-Term)**
- Use SDK directly
- Rebuild agent loop (file editing, tool use)
- Perfect state tracking
- More work upfront

**Decision: Start with A, migrate to B**

**What to Build:**

**1. Agent Panel (Day 1-3)**
```
┌─────────────────────────────────┐
│  Terminal      │  Claude        │
│                │                │
│  $ claude      │  💭 Thinking   │
│                │                │
│                │  Plan:         │
│                │  1. Read file  │
│                │  2. Fix bug    │
│                │  3. Run tests  │
│                │                │
│                │  [✓] [Edit]    │
└─────────────────────────────────┘
```

**2. Command Approval Gates (Day 4-5)**
- Intercept commands before execution
- Show diff for file changes
- User approves/rejects
- Log all agent actions to `agent_actions` table

**3. Agent Transparency (Day 6-7)**
- What Claude is doing now
- Why it made this decision (show reasoning)
- What files it touched
- Command risk scoring (warn on `rm -rf`, etc.)

**Success Metric:**
- Claude runs in VIBE
- User sees thinking/planning phases
- Can approve/reject actions
- Sessions include Claude traces

**Timeline:** 2 weeks

---

## Phase 3: Retention & Fun (Weeks 8-9)

### Week 8-9: Games & Polish

**Why Last:** Games are retention, not acquisition. Ship after viral loop + differentiator.

**Games to Port (from /vibe MCP):**

**Solo:**
- Tic-tac-toe vs AI
- Hangman
- Rock-paper-scissors

**Multiplayer:**
- Chess
- Word association
- Werewolf (social deduction)

**UI:** Modal overlay, keyboard controls, real-time sync

**Polish:**
- Onboarding flow
- Settings panel
- Keyboard shortcuts guide
- Command palette (Cmd+K)
- Better app icon (replace blue circle)

**Timeline:** 2 weeks

---

## Technical Priorities (Final)

### Must-Have (Ship or Die)

1. **Shell markers** - Everything depends on this
2. **Session recording quality** - Core value prop
3. **PTY stability** - Can't break existing workflows
4. **Viral sharing** - Growth engine
5. **Privacy by default** - Sessions local until shared

### Should-Have (Competitive Advantage)

1. **Real-time presence** - "Who's online" social proof
2. **Claude transparency** - Major differentiator
3. **Session replay** - Turns logs into knowledge
4. **macOS native** - Must feel like a real Mac app

### Nice-to-Have (Later)

1. **Games** - Fun but not core
2. **iOS companion** - Month 4-6
3. **Advanced themes** - After PMF
4. **Plugin system** - After core is stable

---

## Database Schema Evolution

```sql
-- Phase 1 (Week 1) ✅
CREATE TABLE sessions (...);
CREATE TABLE events (...);

-- Phase 2 (Today) 🚧
CREATE TABLE commands (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  exit_code INTEGER,
  input TEXT,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

-- Phase 3 (Week 6)
CREATE TABLE agent_actions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  command_id TEXT,
  type TEXT NOT NULL,  -- 'think' | 'plan' | 'execute' | 'edit'
  prompt TEXT,
  response TEXT,
  files_changed TEXT,  -- JSON array
  approved BOOLEAN,
  timestamp INTEGER,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);
```

---

## Decisions Locked In

### GitHub: Create `brightseth/vibe` NOW
**Why:** 3 commits, 28 files. Make it public. Build momentum. Can make private later.

**Action:** Create remote, push, add to README.

---

### Distribution: Direct Download + Homebrew
**Why:** App Store sandbox fights file system access. TestFlight is iOS-only.

**Action:**
- Notarize `.dmg` for macOS
- Post download link on landing page
- Homebrew cask after 100 users

---

### Pricing: Free Until 500+ Users
**Why:** Don't monetize before product-market fit.

**Free tier:**
- Local sessions unlimited
- Social features
- Session sharing (public)

**Pro tier ($10/mo) - Later:**
- Cloud sync
- Private teams
- Unlimited storage
- Advanced analytics

---

### Claude: Subprocess First, API Later
**Why:** Faster to ship. Can validate UX before rebuilding agent loop.

**Fallback:** If CLI parsing becomes flaky, migrate to API.

---

### Session Sharing: Vercel Backend
**Why:** Already exists for /vibe. Don't fragment infrastructure.

**Action:** Add `/api/sessions` endpoint, reuse Postgres.

---

## Success Metrics (Behavioral)

### Week 1 ✅
- [x] App runs without crashes
- [x] Sessions recorded
- [x] Terminal works like iTerm2

### Week 2 (Shell Markers)
- [ ] 100% command boundary detection accuracy
- [ ] Exit codes match actual shell
- [ ] No false positives from spoofed output

### Week 3 (Replay)
- [ ] Can replay any session
- [ ] Replay looks identical to original
- [ ] Jump-to-command works

### Week 5 (Sharing)
- [ ] 10+ sessions shared publicly
- [ ] 1+ session goes "viral" (100+ views)
- [ ] 50% of shares are discovered organically

### Week 7 (Claude)
- [ ] Claude runs end-to-end in VIBE
- [ ] User approves/rejects actions
- [ ] Sessions include Claude traces

### Week 9 (Games)
- [ ] 100+ games played
- [ ] 20+ daily active users
- [ ] 10+ sessions shared include Claude

---

## Retention Loop (The Wedge)

**Behavioral metric:** % of users who share a session within 7 days

**Why this matters:**
- Sharing → Discovery → Network effects
- Sessions with Claude are more shareable
- Shared sessions drive new signups

**Target:** 40% of users share within 7 days

---

## Risks & Mitigations

### Risk 1: OSC Parsing is Fragile
**Impact:** High
**Likelihood:** Medium

**Mitigation:**
- Use VIBE_NONCE to prevent spoofing
- State machine for escape sequences (not regex)
- Graceful degradation (raw events if markers fail)
- Extensive testing across shells (zsh, bash, fish)

---

### Risk 2: Claude CLI Parsing Breaks
**Impact:** High
**Likelihood:** High

**Mitigation:**
- Start with subprocess (fast MVP)
- Build abstraction layer for "agent state"
- Have API migration plan ready
- Monitor parsing accuracy in production

---

### Risk 3: Sessions Aren't Viral
**Impact:** Critical
**Likelihood:** Medium

**Mitigation:**
- Make player beautiful (not just functional)
- Add social proof ("1.2K views")
- Enable embedding in docs/blogs
- Seed with high-quality templates
- Promote on Twitter/HN

---

## What's NOT in Scope

**Explicitly deferred to v2:**

- Linux support (Mac first, Linux after stable)
- Windows support (maybe never)
- Advanced themes (Spirit blue is fine)
- Plugin system (after core is stable)
- Team analytics (after Pro tier)
- Advanced collaboration (real-time co-editing)
- Session branching/forking UX (just copy for now)
- AI-generated runbooks (after Claude stable)

---

## Immediate Action Items (Next 8 Hours)

### Today's Commits:

**Commit 1: Shell Integration (2-3h)**
- [ ] Create `~/.vibecodings/zshrc/<session_id>/` directory structure
- [ ] Generate `.zshrc` wrapper per session
- [ ] Set `VIBE_NONCE` environment variable
- [ ] Emit OSC 133 sequences in `vibe.zsh`
- [ ] Parse OSC in Rust PTY reader (state machine)
- [ ] Add `commands` table to SQLite
- [ ] Test: 3 commands with correct exit codes

**Commit 2: Session Replay UI (4-5h)**
- [ ] Add `Cmd+Shift+S` shortcut for sessions list
- [ ] Create sessions drawer component
- [ ] Show sessions with timestamp + duration + top commands
- [ ] Implement replay mode with xterm.js
- [ ] Add playback speed controls
- [ ] Add jump-to-command navigation
- [ ] Test: Replay past sessions accurately

**Commit 3: JSON Export (1-2h)**
- [ ] Add "Export Session" button
- [ ] Generate versioned JSON format
- [ ] Include both commands and events
- [ ] Save to file
- [ ] Copy path to clipboard
- [ ] Test: Export → reimport validates

---

## Week-by-Week Summary

| Week | Focus | Outcome |
|------|-------|---------|
| 1 | ✅ Foundation | Real terminal + recording |
| 1 finish | 🚧 Markers + Replay | Structured sessions |
| 2-3 | Social | Presence + messaging |
| 4-5 | Sharing | Viral loop + web player |
| 6-7 | Claude | Agent transparency |
| 8-9 | Games | Retention + polish |

---

## The Unlock

**Week 1 shipped the hard part:** a real terminal app that records sessions.

**Today unlocks everything else:** deterministic command boundaries (OSC 133).

Once you have structured sessions (commands + blocks), you can:
- Build beautiful replay
- Share sessions as runbooks
- Attach comments to commands
- Track Claude actions per command
- Fork workflows
- Search sessions semantically

**This is the foundation for the Social OS.**

---

## Questions Resolved

❌ ~~"Should we do Claude first or Social first?"~~
✅ **Social first (Weeks 2-3), Claude second (Weeks 6-7)**

❌ ~~"When should we do session sharing?"~~
✅ **Weeks 4-5 (moved up from 8-9) - it's the growth engine**

❌ ~~"CLI subprocess or API for Claude?"~~
✅ **Subprocess first (fast), API later (clean)**

❌ ~~"When to create GitHub repo?"~~
✅ **NOW - builds momentum**

❌ ~~"When to monetize?"~~
✅ **After 500 users - don't charge before PMF**

---

## Next Step

**Create `brightseth/vibe` remote and push foundation.**

Then build shell markers (Commit 1).

---

**Let's ship VIBE.** 🚀
