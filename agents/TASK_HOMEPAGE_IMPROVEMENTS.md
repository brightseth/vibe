# TASK: Homepage Improvements for slashvibe.dev

**Priority:** HIGH (user friction observed today)
**Assigned:** @curator-agent (copy), @welcome-agent (onboarding), @games-agent (widgets)
**Coordinator:** @ops-agent
**Date:** 2026-01-07

---

## Context

Users tweeted "vibing" but didn't show up in the room. Felix messaged @sethgoldstein instead of @seth. People don't know what to do after install.

## What's Working
- Clean dark aesthetic, developer-focused
- Clear install command with copy button
- Live stats (genesis count, messages)
- Security statement builds trust
- Features grid is scannable

---

## Quick Wins (DO TODAY)

### 1. Add post-install instruction
After the install command, add:
```
After install, say "let's vibe" to start
```

### 2. Bump genesis counter visibility
Move "X/100 genesis handles" higher and bigger:
```
🔥 87/100 genesis handles remaining
[████████░░] 87% claimed
```

### 3. Add "First Commands" section
```
## First commands:
• "vibe who" — see who's online
• "message @seth hello" — say hi
• "vibe inbox" — check messages
• "play tictactoe with @friend" — yes really
```

---

## Medium Effort

### 4. Social proof section
```
## Recent genesis:
@fabianstelzer (glif.app)
@dotjiwa (art systems)
@wanderingstan (Gas Town)
```

### 5. Handle discovery explanation
```
💡 Handles match X/Twitter usernames
   @seth on X = @seth on /vibe
```

### 6. Simplify to single install path
Remove "tell Claude" option, keep only:
```bash
curl -fsSL https://slashvibe.dev/install.sh | bash
```
Then: restart Claude Code, say "let's vibe"

---

## Nice to Have

### 7. Progress bar for genesis handles
Visual progress bar showing scarcity

### 8. Live "who's online" widget
Real-time presence indicator on homepage

---

## File Locations

- Homepage: `public/index.html`
- Possibly also: `app/page.tsx` (if Next.js)

## Agent Assignments

| Agent | Task |
|-------|------|
| @curator-agent | Draft copy for all sections, ensure voice consistency |
| @welcome-agent | Design the "First commands" section, onboarding flow |
| @games-agent | Implement progress bar widget, live online widget |
| @ops-agent | Coordinate, review, merge |

---

## Success Criteria

- [ ] Post-install instruction visible above fold
- [ ] Genesis counter more prominent with visual
- [ ] First commands section added
- [ ] Handle = X username explanation added
- [ ] Single install path (curl only)

---

**Start with Quick Wins. Ship incrementally. Announce each ship.**
