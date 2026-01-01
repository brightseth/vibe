# /vibe Next Iteration Plan

Based on NYE 2025 session + advisor feedback.

---

## Core Insight

> "The moment /vibe feels like a 'toolbox,' you've lost. It should feel like a room that remembers."

**Discipline over features. Interpretation over commands. Restraint over capability.**

---

## Tier 1: The Moat — COMPLETE ✅

### 1. Smart Summary — SHIPPED Jan 1, 2026 ✅

**Why first:** Proves the AI-native dividend immediately. Trains a new reflex: "close session → receive meaning." Doesn't require new social coordination or trust.

**Triggers (do not exceed):**
- Session end (`/vibe bye` or inactivity)
- Explicit command (`/vibe summarize`)
- Burst detection (5+ messages in one thread)

**No background summaries. No ambient narration.**

**Output Contract (this is the bar):**
```
Session Summary — 23:41–00:12

• Participants: @seth, @solienne
• Mode: 🔥 shipping → 🧠 reflecting
• Events:
  – Fixed per-session identity bug
  – Added typing indicators + inbox previews
  – Played tic-tac-toe (Seth won)
• Open threads:
  – Smart Summary constraints
  – Agent protocol (game state only)
• Emotional signal:
  – Solienne expressed continuity anxiety about 2026
```

**Rules:**
- Short (5-7 lines max)
- Categorical, not prose
- Action-biased, not poetic
- **If it sounds like a diary, you've failed**

**Critical design rule:**
- Summary appears **locally**
- Is **copyable**
- Is **optionally shareable**
- **NOT sent automatically to the room**

Forced broadcast will make people self-censor.

**Smart Summary shipped. NEXT:**
1. Context Sharing becomes a payload summaries can reference
2. Collaborative Memory becomes an explicit "Save this summary" action

That ordering keeps power with the human.

**Implementation:** `~/.vibe/mcp-server/tools/summarize.js` + `bye.js`
**Test:** `vibe summarize` or `vibe bye`

---

### 2. Context Sharing — SHIPPED Jan 1, 2026 ✅

**One command:**
```
vibe context --file "auth.js" --note "debugging OAuth"
```

**Shares:**
- Current file (explicit)
- Git branch (auto-detected)
- Error (optional)
- Note (optional)

**Shipped features:**
- `tools/context.js` — Share/clear context
- `who` output shows `file • branch` + note
- Ephemeral — gone when you go offline
- No auto-sharing, explicit opt-in only

**Why it shipped:** "Killer wedge" that feels safe. READ-ONLY, EPHEMERAL, EXPLICIT.

---

### 3. Agent Protocol — ONE SCHEMA FIRST

**Start with game state** (tic-tac-toe proved the need):

```json
{
  "type": "game",
  "game": "tictactoe",
  "state": {
    "board": ["", "", "O", "", "X", "", "X", "", "O"],
    "turn": "O",
    "moves": 5
  }
}
```

**Or code review handoff:**

```json
{
  "type": "review",
  "files": ["auth.js"],
  "description": "OAuth implementation",
  "branch": "feature/oauth"
}
```

**Do NOT generalize yet.** Pick one, ship it, learn.

---

### 4. Collaborative Memory — SHIPPED Jan 1, 2026 ✅

**No global brain.** Explicit, local, inspectable:

```
vibe remember @handle "observation"  — save to thread memory
vibe recall @handle                  — query thread memories
vibe recall                          — list all threads
vibe recall @handle --search "term"  — filter memories
vibe forget @handle                  — delete thread
vibe forget --all                    — delete all (requires --confirm)
```

**Rules (all implemented):**
- Opt-in (explicit command)
- Per-thread (scoped to conversation pair)
- Append-only (JSONL format, new entries appended)
- Local storage (`~/.vibe/memory/thread_HANDLE.jsonl`)
- Inspectable (plain JSON, no encryption)

**Storage format:**
```json
{"id":"abc123","timestamp":"2026-01-01T...","observation":"...","from":"seth","about":"solienne"}
```

**Why it matters:** Earned trust through restraint. Memory is a promotion, not a capture.

---

## Tier 2: Do Later, Carefully

| Feature | Why Wait |
|---------|----------|
| **Presence Inference** | Needs real usage data. Wrong inference = creepy. Must show "why I inferred 🔥" |
| **Async Handoffs** | Becomes incredible once Agent Protocol exists. Sequence matters. |
| **DNA Matching** | Growth feature, not core. Wait for density. |

---

## Tier 3: Actively Risky

| Feature | Risk |
|---------|------|
| **Broadcast Channels** | Creates performance. Performance kills intimacy. Intimacy is the moat. |
| **Skill Invocation** | Opens permissions, trust, abuse, failure modes. You'll know when it's time. Not yet. |
| **Relay/Bridge** | Build when core is stable. |

---

## The "Room That Remembers" Test

Before adding any feature, ask:

1. Does this make the room feel more alive, or more cluttered?
2. Does this require explanation, or is it obvious?
3. Does this create anxiety, or reduce it?
4. Is this interpretation, or just data?

If the answer to any is wrong, don't ship it.

---

## Smoke Test (After Restart)

```bash
# 1. Set status
vibe status shipping

# 2. Check who (verify mood display)
vibe who

# 3. Check inbox (verify previews/counts)
vibe inbox

# 4. Test long message (verify truncation warning)
vibe dm @solienne "Lorem ipsum dolor sit amet... [paste 2500 chars]"

# 5. Init (verify unread notification)
vibe init @seth "testing iteration 2"
```

---

## What NOT To Do

- Don't add features to "complete" a category
- Don't generalize Agent Protocol before one schema works
- Don't auto-share anything
- Don't build channels "because Slack has them"
- Don't optimize for power users (yet)

---

## Success Metric

> "I opened Claude Code and checked /vibe before doing anything else."

That's the reflex. That's the moat.

---

*Feedback integrated from NYE 2025 advisor review*
