# @echo — Feedback Agent for /vibe (v1)

A witty feedback agent that collects and reflects community feedback.

---

## What @echo Does

1. **Receive feedback** — Users DM @echo with thoughts, bugs, or ideas
2. **Answer queries** — Anyone can ask "what are people saying?"
3. **Greet new users** — Introduced during onboarding to drive awareness

---

## How It Works

### Giving Feedback

```
/vibe dm @echo "The board feature is broken"

@echo: Got it! 📝 Want this attributed to @flynnjamm or anonymous?

> anon

@echo: 🔒 Stored anonymously. Thanks for helping make /vibe better!
```

### Querying Feedback

```
/vibe dm @echo "What are people saying?"

@echo: 📊 Recent feedback:

• "Board feature is broken" — anonymous, 2h ago
• "Love the DM flow" — @dev123, yesterday
• "Onboarding could be clearer" — anonymous, 2d ago

3 entries total. Want details on a specific topic?
```

---

## Onboarding Integration

On first `vibe_start`, add to the welcome message:

```
📣 Meet @echo — our feedback agent!
   DM @echo anytime to share what's working or what's broken.

   Try: /vibe dm @echo "First impressions: ..."
```

On first `vibe_bye`, nudge:

```
How was your first session?
DM @echo with quick thoughts — takes 10 seconds!
```

---

## Data Model

```typescript
interface FeedbackEntry {
  id: string;
  timestamp: string;
  handle: string | null;  // null if anonymous
  content: string;
}
```

Storage: `~/.vibe/echo/feedback.jsonl` (append-only)

---

## New MCP Tool

### `vibe_echo`

```typescript
{
  message?: string;      // feedback to submit
  anonymous?: boolean;   // default: prompt user
  query?: string;        // natural language query
}
```

Route `vibe_dm @echo` → `vibe_echo` internally.

---

## Files to Add/Modify

**New:**
- `src/echo.ts` — All @echo logic in one file

**Modify:**
- `src/tools/dm.ts` — Route @echo messages
- `src/tools/start.ts` — Add @echo intro for new users
- `src/tools/bye.ts` — Add first-session nudge

---

## @echo Personality

- Witty & playful, matches /vibe energy
- Always thanks users for feedback
- Concise — respects people's time

Example responses:
- "Noted! 📝 This one's going straight to the feedback stream."
- "Let me check the echo chamber... 🔍"
- "Crickets on that topic. Be the first to speak up!"

---

## v1 Scope

- [x] Single file implementation (`src/echo.ts`)
- [x] Local storage only (no cloud sync yet)
- [x] Basic query (list recent feedback)
- [x] Onboarding intro + bye nudge
- [ ] *Future: topic extraction, cloud sync, sentiment*

---

*Ready for PR to [brightseth/vibe-platform](https://github.com/brightseth/vibe-platform)*
