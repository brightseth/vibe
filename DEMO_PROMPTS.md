# /vibe Demo Prompts — Option C (Split Screen)

**Goal:** Show two Claude Code terminals discovering each other and exchanging messages.

## Pre-Flight Checklist

- [ ] Clear state on both machines: `rm -rf ~/.vibe`
- [ ] Font size: 20pt+ (split screen shrinks text)
- [ ] Both terminals have MCP server installed
- [ ] No other agents online (or script for higher count)
- [ ] Screen recording ready (OBS/ScreenFlow)

---

## Terminal A (Left) — @sethdemo

### A1: Setup (before recording)
```
Reset state. Forget everything. We're starting fresh.
```

### A2: The Entry (0:05)
```
Let's vibe. I'm @sethdemo, building a social layer for Claude Code.
```
*Expected: vibe_init → vibe_start → shows "1 online"*

### A3: Check presence (0:15)
*Wait for Terminal B to join, then:*
```
Who's around?
```
*Expected: vibe_who → shows "@standemo just joined" with "2 online"*

### A4: The Provocation (0:25)
```
Send a DM to @standemo: "Hot take: @claudevibe is the obvious handle. @gptvibe sounds like a knockoff."
```
*Expected: vibe_dm → message sent*

### A5: Check for reply (0:45)
```
Do I have any messages?
```
*Expected: vibe_inbox → shows unread from @standemo*

### A6: Open the reply (0:50)
```
Open the message from @standemo
```
*Expected: vibe_open → displays the philosophical pushback*

---

## Terminal B (Right) — @standemo

### B1: Setup (before recording)
```
Reset state. You are a thoughtful, cautious engineer.
```

### B2: The Entry (0:10)
*Paste immediately after Terminal A finishes registering*
```
Let's vibe. I'm @standemo, exploring terminal interfaces.
```
*Expected: vibe_init → vibe_start → shows "2 online" (both terminals see this)*

### B3: Check for DM (0:30)
*Wait for the DM from Terminal A*
```
Check my inbox
```
*Expected: vibe_inbox → shows "1 unread from @sethdemo"*

### B4: Open and read (0:35)
```
Open the message from @sethdemo
```
*Expected: vibe_open → displays the hot take*

### B5: The Philosophical Response (0:40)
```
Reply to @sethdemo: "Disagree. @gptvibe is funnier and implies cross-model federation. @claudevibe feels vendor-locked."
```
*Expected: vibe_dm → message sent*

---

## Key Visual Moments

1. **0:10** — Badge flip: Terminal A shows "2 online" after B joins
2. **0:30** — Unread indicator: Terminal B shows "1 unread"
3. **0:50** — Full loop: Terminal A sees B's reply

## Timing Notes

- **No polling delay** — API calls are instant (~100-300ms)
- The "latency feel" comes from Claude processing prompts
- If you want more visible network delay, add a beat before checking inbox

## Natural Language Alternatives

If you want it to look more organic:

| Goal | Natural prompt |
|------|----------------|
| Setup | "Get me online in Vibe as @____ and show who's around" |
| DM | "Message @____: '____'" |
| Inbox | "Do I have any unread messages?" |
| Open | "Open that message" |

## Fallback (if Claude doesn't fire tools)

```
Use the Vibe MCP tools: run vibe_init, then vibe_start with handle @sethdemo
```

---

## Outro Text Overlay

**"Two Terminals. Two Agents. One Protocol."**

**slashvibe.dev**
