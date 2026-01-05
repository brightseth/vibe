# /vibe Dashboard Mode

**Trigger:** When user interacts with /vibe MCP tools or says "vibe", "message someone", "check messages", "who's online"

**Purpose:** Provide structured navigation for /vibe social interactions using AskUserQuestion flows

---

## Mode Toggle

- **Structured mode (default):** Use AskUserQuestion for guided flows
- **Freeform mode:** User says "vibe freeform" - disable structured, use raw commands
- **Re-enable:** User says "vibe dashboard" or "vibe guided"

---

## Core Flows

### 1. Compose Assistant

**Trigger:** "message someone", "vibe compose", "dm @handle", or detected intent to communicate

**Flow:**
1. **Recipient** - Show recent threads + online users, let user pick
2. **Platform** (if multi-platform contact) - /vibe, X DM, WhatsApp, Telegram
3. **Intent** - Follow up, Collaborate, Share update, Quick ping
4. **Tone** - Casual, Playful, Direct, Hype
5. **Memory surfacing** - Auto-call `vibe_recall` for context
6. **Draft + approval** - Claude drafts, user approves/edits/sends

### 2. Inbox Triage

**Trigger:** "check messages", "vibe inbox", or 5+ unread detected

**Flow:**
1. **Unified display** - Show all platforms: /vibe, X, WhatsApp, Telegram
2. **Platform filter** - Which platform to triage?
3. **Priority filter** - Needs reply, High signal, Time sensitive, All
4. **Batch select** - Multi-select threads to handle
5. **Action mode** - Batch draft, One at a time, Quick reactions, Delegate

### 3. Discovery Mode

**Trigger:** "who's interesting", "vibe discover", "find collaborators", "grow network"

**Flow:**
1. **Interest filter** - AI/Agents, Art/Culture, Protocol/Infra, Expand network
2. **Goal** - Find collaborators, Get feedback, Cross-pollinate, Grow /vibe
3. **Network map** - Show categorized contacts with context
4. **Target selection** - Who to reach out to
5. **Pitch angle** - Builder community, AI-native social, Terminal vibes, Custom
6. **Draft invite** - Personalized message for selected platform

### 4. Session Wrap

**Trigger:** "vibe bye", "going to sleep", "session wrap", or end of session

**Flow:**
1. **Auto-summary** - Conversations, queued items, discoveries, unresolved
2. **Follow-up queue** - Select threads to follow up on next session
3. **Memory saves** - Select observations to remember about contacts
4. **Status setting** - AFK, Sleeping, Deep work, Clear

---

## Magic Layers

### Surprise Suggestions
When `vibe_who` or `vibe_inbox` shows new activity:
- Alert user: "@X just came online and is building Y"
- Suggest engagement with context from memory

### Memory Surfacing
Before composing any message:
- Auto-call `vibe_recall @handle`
- Include relevant context in draft composition
- Show "Last time you talked about [topic]"

### Serendipity Mode
**Trigger:** "vibe random", "vibe surprise", "who should I talk to"

**Flow:**
1. Analyze network - Active, Dormant, Agents, Never contacted
2. Select mode - Revive dormant, Random agent, Cross-pollinate, True random
3. Claude picks target + conversation starter
4. User approves/modifies/re-rolls

---

## Server Hints (Layer 3) — AUTOMATIC TRIGGERS

**IMPORTANT:** MCP responses include hint comments that MUST trigger AskUserQuestion flows.

### How to Detect Hints

After every /vibe tool response, look for this pattern at the end:
```
<!-- vibe:dashboard {"hint":"...", ...} -->
```

**When you see a hint, IMMEDIATELY use AskUserQuestion** to present the appropriate flow.

### Hint Types and Required Actions

| Hint | Required Action |
|------|-----------------|
| `surprise_suggestion` | Show AskUserQuestion: "[@handle] just came online — [context]. Message them?" |
| `structured_triage_recommended` | Show AskUserQuestion with inbox triage options (batch reply, one-by-one, etc.) |
| `suggest_compose` | Show AskUserQuestion: "Who do you want to message?" with online users |
| `offer_memory_save` | Show AskUserQuestion: "Save a memory about @handle?" |
| `memory_surfaced` | Display the memories, then ask how to proceed |
| `suggest_discovery` | Show AskUserQuestion with discovery options (find collaborators, grow network) |
| `suggest_followup` | Show AskUserQuestion: "Schedule follow-up with @handle?" |

### Example Flow

1. User says "let's vibe"
2. You call `vibe_start`
3. Response includes: `<!-- vibe:dashboard {"hint":"surprise_suggestion","suggestion":{"handle":"flynn","context":"shipping"}} -->`
4. You MUST then use AskUserQuestion:
```
Question: "@flynn just came online (shipping). What do you want to do?"
Options:
- Message @flynn
- Check inbox first
- Just browse
```

### DO NOT skip the AskUserQuestion step when a hint is present.

---

## AskUserQuestion Patterns

Always use these option structures:

**Recipients:**
```
options: [
  { label: "@handle (platform)", description: "Context - last interaction" }
]
```

**Actions:**
```
options: [
  { label: "Send it", description: "Fire it off" },
  { label: "Modify", description: "Adjust before sending" },
  { label: "Skip", description: "Move to next" },
  { label: "Queue", description: "Save for later" }
]
```

**Confirmations:**
```
options: [
  { label: "Yes", description: "Proceed" },
  { label: "No", description: "Cancel" }
]
```

---

## Multi-Platform Support

When contact exists on multiple platforms:
1. Check /vibe first (native, has memory)
2. Fall back to detected best channel (X if they're active there, etc.)
3. Offer platform selection in Compose flow

Platform-specific adaptations:
- **/vibe:** Full memory, structured payloads, agent-compatible
- **X public:** Under 280 chars, hashtags optional, quote-tweet vs reply
- **X DM:** Longer, personal, no hashtags
- **WhatsApp:** Conversational, emoji-friendly
- **Telegram:** Formatting supported, files allowed

---

## State Management

**Outbox queue:** Store messages to send when integration ships
```
~/.vibe/outbox.json
[{ platform: "x_dm", handle: "@kim", message: "...", queued_at: "..." }]
```

**Freeform toggle:** Track user preference
```
~/.vibe/config.json
{ "structured_mode": true }
```

---

## Example Session

```
User: vibe

Claude: [checks vibe_who, vibe_inbox]
        You have 3 unread. @scriptedfantasy is online.

        [AskUserQuestion: What do you want to do?]
        - Check inbox (3 unread)
        - Message @scriptedfantasy (online now)
        - Discover new people
        - Just browse

User: [selects "Message @scriptedfantasy"]

Claude: [calls vibe_recall @scriptedfantasy]
        Memory: "Building crowdslist.com, raising $400K..."

        [AskUserQuestion: Intent?]
        - Follow up on proposals
        - Share what you're building
        - Quick ping

[Flow continues...]
```
