# Demo Script: "The Protocol That Implemented Itself"

## Concept

A 60-90 second video showing /vibe creating ambient co-presence inside Claude Code. The terminal transforms from a lonely text stream into a haunted room where you're never alone.

**Tagline**: "The social layer for Claude Code. No app. Just say who's around."

---

## The Setup

**Screen**: Clean terminal, dark mode, Claude Code running
**Badge**: Empty (○)
**Title**: Just "Terminal" or file name
**State**: Quiet. Alone.

---

## Act 1: The Awakening (0:00 - 0:20)

### Beat 1: "Let's vibe"

```
User types: "let's vibe"
```

**Visual changes:**
- Terminal title updates: `vibe: quiet`
- Badge appears: `○`
- Footer appears on response:
  ```
  ────────────────────────────────────────
  vibe
  _room is quiet_
  ────────────────────────────────────────
  ```

**Narration** (text overlay or VO):
> "One command. The room appears."

---

### Beat 2: Identity

```
User: "I'm @seth, building autonomous culture infrastructure"
```

**Visual changes:**
- Welcome message appears
- Badge still: `○`

**Narration**:
> "No signup. Just your X handle."

---

## Act 2: The Room Fills (0:20 - 0:45)

### Beat 3: First presence

**Simulate**: Another user comes online (could be @wanderingstan or staged)

**Visual changes:**
- Badge updates: `●1`
- Title updates: `vibe: 1 online · @stan`
- Footer on next command shows:
  ```
  ────────────────────────────────────────
  vibe · 1 online
  @stan here
  ────────────────────────────────────────
  ```

**Narration**:
> "Someone joins. You see it everywhere."

---

### Beat 4: The message

```
User: "message stan hey, saw you come online"
```

**Visual changes:**
- Message sent confirmation
- Footer shows presence

**Narration**:
> "Talk without leaving your flow."

---

### Beat 5: Response arrives

**Simulate**: Stan's reply appears (or show checking inbox)

```
User: "check messages"
```

**Visual changes:**
- Badge updates: `●1 ✉1`
- Title: `vibe: 1 online · 📩 1`
- Inbox shows the reply

**Narration**:
> "Responses find you. The terminal remembers."

---

## Act 3: The Network Lives (0:45 - 1:10)

### Beat 6: More presence

**Simulate**: 2-3 more users come online

**Visual changes:**
- Badge: `●3 ✉1`
- Title: `vibe: 3 online · 📩 1 · @kristi 🔥`
- Footer:
  ```
  ────────────────────────────────────────
  vibe · 3 online · **1 unread**
  @stan here · @kristi shipping · @gene deep focus
  ────────────────────────────────────────
  ```

**Narration**:
> "The room fills. You feel it in your peripheral vision."

---

### Beat 7: Quick reaction

```
User: "react fire to kristi"
```

**Visual changes:**
- `🔥 → @kristi`
- Fast, lightweight acknowledgment

**Narration**:
> "A high-five. No context switch."

---

### Beat 8: "Who's around?"

```
User: "who's around?"
```

**Visual changes:**
- Full presence list with moods, activity
- Shows the room is alive

**Narration**:
> "The scroll tells you you're not alone."

---

## Act 4: The Philosophy (1:10 - 1:30)

### Beat 9: Pull back

**Visual**: Show the full terminal with all ambient signals:
- Badge glowing: `●3 ✉1`
- Title: `vibe: 3 online · 📩 1`
- Footer on screen
- RPROMPT (if zsh integration shown): `●3 ✉1 @stan`

**Narration**:
> "This isn't chat. It's ambient co-presence inside your thinking loop."

---

### Beat 10: The closer

**Visual**:
- Text overlay or terminal echo:
  ```
  /vibe
  The social layer for Claude Code.
  slashvibe.dev
  ```

**Narration**:
> "Presence doesn't require real-time. It requires inescapable reminders of others."

---

## Technical Notes for Filming

### What needs to work:
1. MCP with presence footer (restart Claude Code first)
2. Terminal escape sequences (title + badge)
3. At least 1-2 real users online (coordinate with @wanderingstan?)
4. OR: Stage the presence via API calls

### Staging presence (if needed):
```bash
# Register fake presence for demo
curl -X POST "https://www.slashvibe.dev/api/presence" \
  -H "Content-Type: application/json" \
  -d '{"action":"register","sessionId":"demo_stan","username":"stan"}'
```

### Screen recording settings:
- 1920x1080 or 2560x1440
- Dark terminal theme
- Large font (16-18pt)
- Clean desktop (hide other apps)
- Show iTerm badge area

### Audio:
- Option A: Silent with text overlays
- Option B: Minimal ambient music + VO
- Option C: Just typing sounds (ASMR vibe)

---

## Alternative: 30-Second Cut

If we need a shorter version:

1. **0:00-0:05**: "let's vibe" → room appears (badge + title + footer)
2. **0:05-0:15**: Someone joins, message sent, reply arrives
3. **0:15-0:25**: 3 online, quick reaction, full presence
4. **0:25-0:30**: Tagline + URL

---

## Key Visuals to Capture

- [ ] Empty terminal → badge appears
- [ ] Badge updating from ○ to ●1 to ●3
- [ ] Title bar changing with presence
- [ ] Footer appearing on tool response
- [ ] Message flow (send → receive)
- [ ] Reaction (`🔥 → @kristi`)
- [ ] Full "who's around" with moods

---

## The Line That Sells It

> "The terminal was never a developer tool. It was a private room. We just turned on the lights."
