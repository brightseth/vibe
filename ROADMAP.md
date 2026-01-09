# VIBE - Roadmap & Next Phase Plan

**Last Updated:** January 8, 2026
**Status:** Week 1 Foundation Complete ✅

---

## The Vision

**VIBE is the social platform for the AI era.**

Not "a better terminal." Not "iTerm with features."

**VIBE is where people create together.**

Like AOL brought people online.
Like FACEBOOK made social networks mainstream.
Like WHATSAPP made messaging universal.
Like INSTAGRAM made everyone a photographer.

**VIBE makes the command line social.**

This is the new OS. The new creative workspace. Where humans and AI agents collaborate in public, where terminal sessions become shareable knowledge, where building alone becomes building together.

**VIBE is a platform. A network. A movement.**

---

## What We Just Shipped (Week 1 Foundation)

### ✅ Complete - January 8, 2026

**Working Application:**
- Real PTY-backed terminal (zsh/bash)
- xterm.js frontend with Spirit blue theme
- Session recording to SQLite (~/.vibecodings/sessions.db)
- Command + output logging with timestamps
- Terminal resize handling
- Tauri native Mac app

**Technical Stack:**
- **Backend:** Rust + Tauri + portable-pty + SQLite
- **Frontend:** React + TypeScript + xterm.js + Vite
- **Architecture:** Polling (10ms) for PTY output, local-first storage

**Verification:**
- App running (PID 35535)
- Database recording confirmed (2 sessions, 5+ events)
- Quick start guide works (`pnpm tauri dev`)

**Git Status:**
- 2 commits, 25 files created
- Ready to push to remote when created

---

## Immediate Next Steps (Finish Week 1)

### Priority 1: Shell Integration Markers

**Goal:** Deterministic command boundary detection using OSC sequences

**What to Build:**
1. ✅ Shell integration scripts (`shell-integration/vibe.zsh`)
2. 🚧 Modify PTY spawn to set `ZDOTDIR` environment
3. 🚧 Parse OSC 133 sequences from PTY output
4. 🚧 Store command blocks with metadata (start, end, exit code)
5. 🚧 Update database schema with `commands` table

**Why Critical:**
- Makes command/output separation deterministic (not text parsing)
- Enables block-based rendering (like Warp)
- Foundation for session replay and export
- Same approach as VS Code, WezTerm, iTerm2

**OSC 133 Sequences:**
```
\033]133;A\007     # Prompt start
\033]133;B\007     # Command input start
\033]133;C\007     # Command execution start
\033]133;D;N\007   # Command end (N = exit code)
```

**Timeline:** 2-3 hours

---

### Priority 2: Session Replay UI

**Goal:** View past terminal sessions in the app

**What to Build:**
1. Sessions list view (sidebar or modal)
2. Session player component (replayable xterm)
3. Playback controls (play, pause, speed, seek)
4. Search sessions by time, command, output

**UI Design:**
```
┌─────────────────────────────────────┐
│  Sessions (Cmd+Shift+S)             │
├─────────────────────────────────────┤
│  Jan 8, 10:29 PM (5 min)           │
│  $ git status                       │
│  $ npm install                      │
│                                     │
│  Jan 8, 10:15 PM (12 min)          │
│  $ cargo build                      │
│  $ pnpm tauri dev                   │
└─────────────────────────────────────┘
```

**Timeline:** 4-6 hours

---

### Priority 3: Export Session JSON

**Goal:** Backup and share terminal sessions

**What to Build:**
1. Export session to JSON format
2. Import session from JSON
3. Share session (copy to clipboard, upload optional)
4. Session manifest format:
   ```json
   {
     "version": "1.0",
     "session_id": "uuid",
     "started_at": "2026-01-08T22:29:14Z",
     "ended_at": "2026-01-08T22:34:52Z",
     "cwd": "/Users/seth/project",
     "shell": "/bin/zsh",
     "commands": [
       {
         "input": "git status",
         "output": "...",
         "exit_code": 0,
         "timestamp": "..."
       }
     ]
   }
   ```

**Timeline:** 2-3 hours

---

## Week 2-3: Claude Code Integration

### Goal: Native Claude Code in VIBE

**What to Build:**

#### 1. Claude Process Management
- Spawn `claude` CLI as subprocess (or use SDK)
- Parse Claude's stdout/stderr for states
- Detect: thinking, planning, executing, waiting
- Show Claude's current action in UI

#### 2. Agent Panel
```
┌─────────────────────────────────────┐
│  Terminal          │  Claude Panel  │
│                    │                │
│  $ _               │  💭 Thinking   │
│                    │                │
│                    │  Plan:         │
│                    │  1. Read file  │
│                    │  2. Edit line  │
│                    │  3. Run tests  │
│                    │                │
│                    │  [Approve] [Edit]
└─────────────────────────────────────┘
```

#### 3. Command Approval Gates
- Intercept Claude's commands before execution
- Show diff for file changes
- User approves/rejects
- Log all agent actions

#### 4. Agent Transparency
- What Claude is doing right now
- Why it made this decision
- What files it's touching
- Command risk scoring

**Timeline:** 1-2 weeks

---

## Week 4-5: Social Features

### Goal: Bring /vibe social layer into native app

**What to Port from MCP Server:**

#### 1. Presence & Messaging
- Online/offline status
- "Building: ..." one-liner
- DM interface in sidebar
- Notifications (macOS native)
- Real-time via WebSocket

#### 2. Discovery
- Browse who's online
- See what others are building
- Connect/follow users
- Search by interests/tech stack

#### 3. Collaboration
- Handoffs (delegate tasks with context)
- File reservations (advisory locks)
- Session sharing (watch mode, pair mode)

#### 4. Social Sidebar UI
```
┌─────────────────────────────────────┐
│  Terminal          │  Social        │
│                    │                │
│  $ _               │  🟢 Online (3) │
│                    │  @gene         │
│                    │  Building: AI  │
│                    │                │
│                    │  @maya         │
│                    │  Building: art │
│                    │                │
│                    │  💬 Messages   │
│                    │  @alex: Hey... │
└─────────────────────────────────────┘
```

**Backend:** Reuse existing Vercel + Postgres APIs
**Timeline:** 1-2 weeks

---

## Week 6-7: Games & Engagement

### Goal: Port 23 games from /vibe MCP server

**Games to Include:**

**Solo:**
- Tic-tac-toe (vs AI)
- Hangman
- Rock-paper-scissors
- Riddle
- Color guess

**Multiplayer:**
- Chess
- Word association
- Werewolf
- Two truths and a lie
- Drawing/Pixel art

**UI Approach:**
- Modal overlay for game interface
- Terminal commands to start games
- Keyboard controls
- Real-time sync via backend

**Timeline:** 1 week

---

## Week 8-9: Session Sharing & Polish

### Goal: Make Vibe sessions viral content

#### 1. Public Session Viewer
- Upload session to backend
- Generate shareable link
- View-only web player
- Embed code for docs/blogs

#### 2. Session Templates
- Extract workflow from session
- Parameterize variables
- One-click run template
- Community template library

#### 3. Polish & UX
- Onboarding flow
- Settings panel
- Keyboard shortcuts
- Command palette (Cmd+K)
- Themes (optional)

**Timeline:** 1-2 weeks

---

## Technical Priorities & Decisions

### Must Have (Non-Negotiable)

1. **Shell integration markers** - Everything depends on this
2. **Session recording quality** - Core value prop
3. **PTY stability** - Can't break existing terminal workflows
4. **Privacy by default** - Sessions local until user shares
5. **Performance** - Must feel faster than iTerm2

### Should Have (Important)

1. **Claude Code integration** - Major differentiator
2. **Real-time social features** - The "social CLI" promise
3. **Cross-platform** - Mac first, Linux later
4. **Session sharing** - Viral growth mechanism

### Nice to Have (Later)

1. **iOS companion app** - View sessions on mobile
2. **Advanced themes** - Customization
3. **Plugin system** - Extensibility
4. **Team features** - Shared crews, analytics

---

## Architecture Decisions

### Database: SQLite (Local-First)

**Why:**
- Fast, embedded, no server
- Works offline
- Session data is private by default
- Can export to JSON for sharing

**Schema Evolution:**
```sql
-- Phase 1 (Done)
sessions (id, started_at, ended_at, cwd, shell)
events (id, session_id, ts, kind, data)

-- Phase 2 (Shell markers)
commands (id, session_id, input, output, exit_code, started_at, ended_at)

-- Phase 3 (Claude)
agent_actions (id, session_id, type, prompt, response, files_changed, approved)
```

### Backend: Reuse Existing Vercel APIs

**Why:**
- Already built for /vibe MCP server
- Postgres schema supports all features
- WebSocket presence working
- AIRC protocol implemented

**What to Build:**
- Native API client (Rust or TypeScript)
- Authentication flow
- WebSocket connection management
- Offline queue for messages

### UI: React + TailwindCSS

**Why:**
- Fast iteration on social UI
- Component reusability
- Good for real-time updates
- Can animate/polish easily

---

## Success Metrics

### Week 1 ✅
- [x] App runs without crashes
- [x] Sessions recorded to database
- [x] Terminal works like iTerm2

### Week 2
- [ ] Shell markers parse correctly
- [ ] Can replay past sessions
- [ ] JSON export works

### Week 4
- [ ] Claude Code runs in-terminal
- [ ] Agent actions are transparent
- [ ] Users approve commands before execution

### Week 6
- [ ] 50 beta users
- [ ] 10+ sessions shared publicly
- [ ] 5+ active daily users

### Week 8
- [ ] 500 users registered
- [ ] 100+ sessions shared
- [ ] 20+ daily active users

---

## Risks & Mitigations

### Risk 1: Claude Code API Changes

**Impact:** High
**Likelihood:** Medium

**Mitigation:**
- Build abstraction layer for AI providers
- Support multiple backends (Claude, GPT, local)
- Document API usage patterns

### Risk 2: PTY Bugs on Different Shells

**Impact:** High
**Likelihood:** Medium

**Mitigation:**
- Test on zsh, bash, fish
- Comprehensive error handling
- Fallback to raw terminal mode
- User bug reports via /vibe echo

### Risk 3: Social Features Don't Resonate

**Impact:** Medium
**Likelihood:** Low

**Mitigation:**
- Start with async (not just real-time)
- Focus on session sharing first
- Get feedback from /vibe community
- Iterate based on usage data

### Risk 4: Performance Issues

**Impact:** Medium
**Likelihood:** Low

**Mitigation:**
- Profile PTY polling loop
- Optimize xterm rendering
- Lazy load session history
- Cache API responses

---

## Open Questions

### For User to Decide:

1. **GitHub Remote:** Create `brightseth/vibe` repo now or later?
2. **Beta Distribution:** TestFlight equivalent or direct download?
3. **Pricing Model:** When to introduce Pro tier ($10/mo)?
4. **iOS Timeline:** Start planning now or wait until Mac is stable?
5. **Branding:** Finalize app icon (current is placeholder blue circle)

### Technical Decisions Needed:

1. **Claude Integration:** Use Claude API or spawn CLI subprocess?
2. **Session Sharing:** Upload to Vercel or separate service?
3. **Real-time Protocol:** Keep WebSocket or try WebRTC?
4. **Replay Performance:** Store raw events or preprocessed blocks?

---

## Immediate Action Items (Next 8 Hours)

### Today (Finish Week 1):

1. **Complete shell integration** (2-3 hours)
   - Modify PTY spawn to use ZDOTDIR
   - Parse OSC sequences from output
   - Store command blocks in database
   - Test with various zsh commands

2. **Build session replay UI** (4-5 hours)
   - Create sessions list component
   - Add playback controls
   - Wire up to database
   - Test replay functionality

3. **Add session export** (1-2 hours)
   - Implement JSON export
   - Add "Share Session" button
   - Copy to clipboard
   - (Optional: Upload to backend)

**Total:** ~8 hours to complete Week 1

---

## What to Review

### Questions for You:

1. **Scope OK?** Is this the right balance of ambition vs. shipping fast?
2. **Priorities Right?** Should we focus on Claude (Week 2) or social (Week 4) first?
3. **Timeline Realistic?** 8-10 weeks to feature-complete MVP?
4. **Missing Anything?** What's not in this plan that should be?

### Next Steps After Review:

1. Get your feedback on this plan
2. Finish shell integration (currently in progress)
3. Push to GitHub remote (if ready)
4. Continue with replay UI + export
5. Plan Week 2 (Claude Code) architecture

---

**Ready to ship the future of terminals.** 🚀

Let me know your thoughts and we'll adjust the plan accordingly.
