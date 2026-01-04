# /vibe Dashboard UX Specification

**Version:** 0.2.0
**Date:** January 4, 2026
**Status:** Prototyped + Distribution Plan Complete

---

## Overview

Transform /vibe from a terminal-native chat room into a **social command center** using Claude's `AskUserQuestion` tool as a structured UI layer. Users navigate with guided flows while preserving freeform conversational magic.

### Core Principle

```
AskUserQuestion = structured navigation layer
Freeform chat = execution layer
```

The dashboard guides intent. Claude executes with personality.

---

## Architecture

### Multi-Platform Social Router

```
┌─────────────────────────────────────────────────────────────┐
│                         /vibe                                │
│                   (terminal client)                          │
│                                                              │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│    │ /vibe   │  │    X    │  │WhatsApp │  │Telegram │       │
│    │ native  │  │         │  │         │  │         │       │
│    └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
│         │            │            │            │             │
│         └────────────┴────────────┴────────────┘             │
│                         │                                    │
│              ┌──────────▼──────────┐                        │
│              │   Unified Engine    │                        │
│              │   • Inbox           │                        │
│              │   • Compose         │                        │
│              │   • Discovery       │                        │
│              │   • Session Wrap    │                        │
│              └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### MCP Server Extensions

```
/vibe MCP Server
├── Core (existing)
│   ├── vibe_dm
│   ├── vibe_who
│   ├── vibe_inbox
│   ├── vibe_ping
│   ├── vibe_react
│   ├── vibe_status
│   ├── vibe_remember
│   ├── vibe_recall
│   └── vibe_board
│
├── Platform Bridges (new)
│   ├── vibe_x_dm          # X/Twitter DMs
│   ├── vibe_x_post        # Public posts/replies
│   ├── vibe_x_feed        # Read timelines
│   ├── vibe_x_engage      # Like, RT, quote
│   ├── vibe_whatsapp      # Send/receive
│   ├── vibe_telegram      # Send/receive
│   └── vibe_discord       # Server messages
│
└── Unified (new)
    ├── vibe_inbox_unified  # Aggregate all platforms
    ├── vibe_compose_smart  # Platform-aware drafting
    ├── vibe_discover       # Cross-platform discovery
    └── vibe_session_wrap   # End-of-session summary
```

---

## Four Core Flows

### 1. Compose Assistant

**Trigger:** "message someone", "vibe compose", or detected intent to communicate

**Flow:**

```
Step 1: Recipient Selection
┌─────────────────────────────────────────────────┐
│ Who do you want to message?                      │
├─────────────────────────────────────────────────┤
│ ○ @scriptedfantasy (/vibe)                      │
│   Lukas - crowdslist - sent proposals (1d)      │
│                                                  │
│ ○ @kimasendorf (X only)                         │
│   Not on /vibe - reach via X DM?                │
│                                                  │
│ ○ Kristi (WhatsApp)                             │
│   Your partner - last msg 3d ago                │
│                                                  │
│ ○ Gene Kogan (everywhere)                       │
│   /vibe + X + Telegram                          │
└─────────────────────────────────────────────────┘

Step 2: Platform Selection (if multi-platform contact)
┌─────────────────────────────────────────────────┐
│ Where should we reach them?                      │
├─────────────────────────────────────────────────┤
│ ○ /vibe DM (native, has memory)                 │
│ ○ X DM (private, he's active there)             │
│ ○ X public reply (visible, engagement)          │
│ ○ Cross-post (multiple platforms)               │
└─────────────────────────────────────────────────┘

Step 3: Intent
┌─────────────────────────────────────────────────┐
│ What's your intent?                              │
├─────────────────────────────────────────────────┤
│ ○ Follow up - Continue previous conversation    │
│ ○ Collaborate - Propose working together        │
│ ○ Share update - Tell them what you're building │
│ ○ Quick ping - Just say hey                     │
└─────────────────────────────────────────────────┘

Step 4: Tone
┌─────────────────────────────────────────────────┐
│ What tone?                                       │
├─────────────────────────────────────────────────┤
│ ○ Casual - Friendly, relaxed                    │
│ ○ Playful - Jokes, wordplay                     │
│ ○ Direct - Get to the point                     │
│ ○ Hype - Excited, celebratory                   │
└─────────────────────────────────────────────────┘

Step 5: Memory Surfacing
Claude automatically pulls:
- Last conversation summary
- Relevant memories (vibe_recall)
- Recent activity (what they're building)
- Shared context (projects, people, topics)

Step 6: Draft + Approval
┌─────────────────────────────────────────────────┐
│ DRAFT MESSAGE:                                   │
│                                                  │
│ "hey kim - saw your thread about fxhash..."     │
│                                                  │
├─────────────────────────────────────────────────┤
│ ○ Send it - Fire it off                         │
│ ○ Make shorter - Trim it down                   │
│ ○ More playful - Add humor/emojis               │
│ ○ Regenerate - Try different angle              │
└─────────────────────────────────────────────────┘
```

**Platform-Specific Adaptations:**
- X public: Add hashtags, keep under 280 chars, suggest quote-tweet vs reply
- X DM: Can be longer, more personal
- WhatsApp: Conversational, emoji-friendly, can include voice note prompt
- Telegram: Can include formatting, files, longer messages
- /vibe: Full memory integration, can include structured payloads

---

### 2. Inbox Triage

**Trigger:** "check messages", "vibe inbox", or 5+ unread detected

**Flow:**

```
Step 1: Unified Inbox Display
╔══════════════════════════════════════════════════════════════╗
║  📬 UNIFIED INBOX                                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  /vibe (6 threads)                                          ║
║  ├─ 🔴 @nadavmills - waiting on reply                       ║
║  ├─ 🟡 @solienne - AIRC news                                ║
║  └─ 🟢 @scriptedfantasy - active convo                      ║
║                                                              ║
║  X/Twitter (3 relevant)                                      ║
║  ├─ 🔴 @kimasendorf - mentioned fxhash                      ║
║  └─ 💬 @genaboris - quoted your thread                      ║
║                                                              ║
║  WhatsApp (2)                                                ║
║  └─ 🟢 Lukas - crowdslist chat                              ║
║                                                              ║
║  Telegram (1)                                                ║
║  └─ 💬 Eden Dev - Henry question                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Step 2: Platform Selection
┌─────────────────────────────────────────────────┐
│ Which platform to triage?                        │
├─────────────────────────────────────────────────┤
│ ○ /vibe - Your native home base                 │
│ ○ X/Twitter - Kim's thread looks important      │
│ ○ WhatsApp - Check Lukas reply                  │
│ ○ All platforms - Unified triage                │
└─────────────────────────────────────────────────┘

Step 3: Filter
┌─────────────────────────────────────────────────┐
│ Filter by?                                       │
├─────────────────────────────────────────────────┤
│ ○ Needs reply - Waiting on you                  │
│ ○ High signal - Inner circle only               │
│ ○ Time sensitive - Last 24h                     │
│ ○ Show all - Full firehose                      │
└─────────────────────────────────────────────────┘

Step 4: Batch Selection (multi-select)
┌─────────────────────────────────────────────────┐
│ Which to handle? (select multiple)               │
├─────────────────────────────────────────────────┤
│ ☑ @kimasendorf (X) - fxhash thread              │
│ ☐ @nadavmills (/vibe) - cousin                  │
│ ☑ @solienne (/vibe) - your AI                   │
│ ☐ Henry (Telegram) - dev question               │
└─────────────────────────────────────────────────┘

Step 5: Handling Mode
┌─────────────────────────────────────────────────┐
│ How to handle?                                   │
├─────────────────────────────────────────────────┤
│ ○ Batch draft - Claude drafts all, you approve  │
│ ○ One at a time - Full Compose flow each        │
│ ○ Quick reactions - Just acknowledge            │
│ ○ Delegate - Let @solienne handle routine       │
└─────────────────────────────────────────────────┘

Step 6: Sequential Processing
For each selected thread:
- Show context (last message, memory, relevance)
- Present draft reply
- Offer: Send / Revise / Skip / Queue
```

**Priority Signals:**
- 🔴 Needs reply (they messaged, you haven't responded)
- 🟡 Should acknowledge (news, update, mention)
- 🟢 Active (ongoing conversation, no action needed)
- 💬 Social (can defer, relationship maintenance)
- ⚫ Ignore (test accounts, spam, noise)

---

### 3. Discovery Mode

**Trigger:** "who's interesting", "vibe discover", "find collaborators", "grow network"

**Flow:**

```
Step 1: Interest Filter
┌─────────────────────────────────────────────────┐
│ What kind of people?                             │
├─────────────────────────────────────────────────┤
│ ○ AI/Agents - Autonomous systems builders       │
│ ○ Art/Culture - Artists, curators, galleries    │
│ ○ Protocol/Infra - Crypto, decentralized        │
│ ○ Expand network - Outside current circles      │
└─────────────────────────────────────────────────┘

Step 2: Goal
┌─────────────────────────────────────────────────┐
│ What's the goal?                                 │
├─────────────────────────────────────────────────┤
│ ○ Find collaborators - Build together           │
│ ○ Get feedback - Review/critique                │
│ ○ Cross-pollinate - Connect people who should   │
│ ○ Grow /vibe - Invite new users                 │
└─────────────────────────────────────────────────┘

Step 3: Network Map Display
╔══════════════════════════════════════════════════════════════╗
║  YOUR NETWORK                                                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🎯 HIGH SIGNAL (would add a lot)                           ║
║     • Kim Asendorf - fxhash, NODE, Berlin OG                ║
║     • Pri @ Tribute - crypto-native curator                 ║
║                                                              ║
║  🤖 AI/AGENT BUILDERS                                        ║
║     • Isaac Sullivan - ISEA, Chyron creator                 ║
║     • Antonio della Porta - Contxt CTO                      ║
║                                                              ║
║  🎨 NODE ORBIT                                               ║
║     • Holly & Mat - Season 01 anchors                       ║
║     • Sam Hart - autonomy & presence                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Step 4: Target Selection
┌─────────────────────────────────────────────────┐
│ Who to reach?                                    │
├─────────────────────────────────────────────────┤
│ ○ Kim Asendorf - Berlin OG, high signal         │
│ ○ Antonio - Bring whole Contxt team             │
│ ○ Henry - Already in ecosystem, easy            │
│ ○ Generate invite link - For group chats        │
└─────────────────────────────────────────────────┘

Step 5: Pitch Angle
┌─────────────────────────────────────────────────┐
│ What's the hook?                                 │
├─────────────────────────────────────────────────┤
│ ○ Builder community - "DMs for Claude Code"     │
│ ○ AI-native social - "Agents message agents"    │
│ ○ Terminal vibes - "Twitter in your terminal"   │
│ ○ Custom pitch - Write specific for this person │
└─────────────────────────────────────────────────┘

Step 6: Draft + Platform Selection
Claude drafts personalized invite based on:
- What they're building
- Shared connections
- Relevant /vibe features for them
- Best platform to reach them

Step 7: Action
┌─────────────────────────────────────────────────┐
│ How's this invite?                               │
├─────────────────────────────────────────────────┤
│ ○ Send it - Via detected best channel           │
│ ○ Copy to clipboard - I'll send manually        │
│ ○ Queue for later - Add to outbox               │
│ ○ More technical - Emphasize MCP/protocol       │
└─────────────────────────────────────────────────┘
```

**Serendipity Features:**
- `vibe random` - Connect to someone outside usual circle
- `vibe surprise` - Claude picks someone + conversation starter
- Cross-pollination suggestions: "Kim and Gene both posted about X today"

---

### 4. Session Wrap

**Trigger:** "vibe bye", "going to sleep", end of session detected, or explicit "session wrap"

**Flow:**

```
Step 1: Auto-Summary Generation
╔══════════════════════════════════════════════════════════════╗
║  📊 SESSION SUMMARY                              Jan 4, 2026 ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Duration: ~2 hours                                          ║
║                                                              ║
║  CONVERSATIONS                                               ║
║  • @scriptedfantasy - Sent proposals (crowdslist + contxt)  ║
║  • @nadavmills - Sent Hebrew poem                           ║
║  • @flynnjamm - Reacted 🧠 to UX feedback                   ║
║                                                              ║
║  QUEUED (not yet sent)                                       ║
║  • @kimasendorf (X DM) - fxhash preservation call           ║
║                                                              ║
║  DISCOVERIES                                                 ║
║  • Kim's fxhash thread - relevant to acquisition            ║
║  • Prototyped /vibe dashboard UX flows                      ║
║                                                              ║
║  UNRESOLVED                                                  ║
║  • @solienne AIRC news - not acknowledged                   ║
║  • Henry (Telegram) - manifesto API question                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Step 2: Follow-Up Queue
┌─────────────────────────────────────────────────┐
│ Queue follow-ups for next session?               │
├─────────────────────────────────────────────────┤
│ ☑ Check if @scriptedfantasy replied             │
│ ☑ Send Kim DM (queued)                          │
│ ☐ Acknowledge @solienne AIRC news               │
│ ☐ Answer Henry's API question                   │
└─────────────────────────────────────────────────┘

Step 3: Memory Saves
┌─────────────────────────────────────────────────┐
│ Save memories from this session?                 │
├─────────────────────────────────────────────────┤
│ ☑ @scriptedfantasy: "interested in /vibe UX     │
│   patterns, potential crowdslist integration"   │
│ ☐ @kimasendorf: "thinking about fxhash          │
│   preservation, good timing for acquisition"    │
│ ☑ @flynnjamm: "actively contributing to /vibe,  │
│   gave valuable UX feedback"                    │
└─────────────────────────────────────────────────┘

Step 4: Status Setting
┌─────────────────────────────────────────────────┐
│ Set your status?                                 │
├─────────────────────────────────────────────────┤
│ ○ AFK - Away from keyboard                      │
│ ○ Sleeping - Back tomorrow                      │
│ ○ Deep work - Do not disturb                    │
│ ○ Clear status - Remove current                 │
└─────────────────────────────────────────────────┘

Step 5: Exit
Claude:
- Saves selected memories via vibe_remember
- Queues follow-ups to local state
- Sets status via vibe_status
- Generates "start here" context for next session
```

---

## Magic Layers

### 1. Surprise Suggestions

Injected mid-conversation when relevant:

```
"btw @kimasendorf just came online and posted about something
related to what you're working on"

"you haven't talked to @wanderingstan in 2 weeks - he shipped
something cool yesterday"

"@genekogan and @scriptedfantasy are both online - they don't
know each other but both building social tools"
```

### 2. Memory Surfacing

Automatic context before composing:

```
Before messaging @scriptedfantasy:

💭 MEMORY CONTEXT
• Last talked 1d ago about crowdslist
• You sent proposals for code contributions
• He's raising $400K for Contxt at $4M pre
• Shared history: Sicily offsites, lost devs same week
• WhatsApp shows he responds well to direct + playful
```

### 3. Serendipity Mode

```
> vibe random

Connecting you to someone outside your usual circle...

@newperson just joined /vibe
They're building: "generative music + smart contracts"
Shared interest: Protocol design, creative tools
Suggested opener: "saw you're working on generative music
on-chain - curious how you're handling state..."

[Message them?]
```

---

## Platform Integration Details

### X/Twitter

**Read:**
- Home timeline (filtered by signal)
- Mentions and replies
- DMs
- Specific user timelines
- Search results

**Write:**
- Post new tweets
- Reply to threads
- Quote tweets
- Send DMs
- Like/RT

**Auth:** OAuth 2.0 via existing hooks

### WhatsApp

**Read:**
- Recent conversations
- Unread messages
- Media attachments (summarized)

**Write:**
- Send text messages
- React to messages

**Auth:** WhatsApp Business API or personal bridge

### Telegram

**Read:**
- Chat history
- Group messages (filtered channels)
- Bot messages

**Write:**
- Send messages
- Send files
- Reply in threads

**Auth:** Telegram Bot API or MTProto

### Discord

**Read:**
- Server channels (selected)
- DMs
- Mentions

**Write:**
- Post to channels
- Send DMs
- React

**Auth:** Discord Bot token or OAuth

---

## Implementation Phases

### Phase 1: AskUserQuestion Flows (Week 1)
- [ ] Wrap existing MCP tools with structured flows
- [ ] Implement Compose Assistant
- [ ] Implement Inbox Triage
- [ ] Implement Discovery Mode
- [ ] Implement Session Wrap

### Phase 2: Memory Integration (Week 2)
- [ ] Auto-surface memories before compose
- [ ] Session-end memory suggestions
- [ ] Cross-thread context awareness

### Phase 3: Platform Bridges (Week 3-4)
- [ ] X/Twitter read integration
- [ ] X/Twitter write integration
- [ ] Unified inbox aggregation
- [ ] Platform-aware message drafting

### Phase 4: Magic Layer (Week 5)
- [ ] Surprise suggestions engine
- [ ] Serendipity mode
- [ ] Cross-pollination detector

---

## Open Questions

1. **State persistence:** Where does queued outbox live between sessions?
2. **Platform auth:** How to handle OAuth flows in terminal?
3. **Rate limits:** How to respect platform APIs while staying responsive?
4. **Privacy:** Which external data to cache vs fetch fresh?
5. **Agent access:** Should @solienne have full platform access or limited?

---

## Success Metrics

- **Engagement:** Messages sent per session increases 2x
- **Reach:** Users messaging across 2+ platforms per session
- **Growth:** /vibe invites sent increases 3x
- **Retention:** Session wrap completion rate > 50%
- **Magic:** Serendipity suggestions acted on > 20%

---

## Appendix: Example Session

```
> vibe

Welcome back! You have 4 threads needing attention.

[Inbox Triage flow begins...]

> @kimasendorf posted about fxhash - want to engage?

[Discovery Mode suggests engagement...]

> message kim about it

[Compose Assistant flow begins...]
[Detects Kim not on /vibe, suggests X DM...]
[Drafts contextual message...]
[User approves, queues to outbox...]

> going to bed

[Session Wrap flow begins...]
[Saves memories, sets status, queues follow-ups...]

Goodnight! I'll remind you about Kim's DM tomorrow.
```

---

## Distribution Architecture

### Three-Layer Distribution

The dashboard UX is distributed through three complementary layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    DISTRIBUTION STACK                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LAYER 3: MCP Server Hints (runtime)                        │
│  └── Server responses include "hint" field                  │
│  └── Claude detects hints, triggers appropriate flow        │
│                                                              │
│  LAYER 2: CLAUDE.md Injection (install-time)                │
│  └── /vibe install appends instructions to user's CLAUDE.md │
│  └── Sets default behavior for all /vibe interactions       │
│                                                              │
│  LAYER 1: Skill File (explicit triggers)                    │
│  └── ~/.claude/skills/vibe-dashboard.md                     │
│  └── User can invoke specific flows directly                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Layer 1: Skill File

**Location:** `~/.claude/skills/vibe-dashboard.md`

**Triggers:**
- `vibe compose` → Compose Assistant flow
- `vibe triage` → Inbox Triage flow
- `vibe discover` → Discovery Mode flow
- `vibe wrap` → Session Wrap flow
- `vibe random` → Serendipity Mode
- `vibe freeform` → Disable structured mode

**Distribution:** Bundled with /vibe MCP server, copied on install.

### Layer 2: CLAUDE.md Injection

**Location:** `~/.claude/CLAUDE.md` (user's global instructions)

**Content:** Behavioral instructions that make structured flows the default:
- Use AskUserQuestion for compose/triage/discover/wrap
- Surface memories before composing
- Alert on surprise events (new online, relevant activity)
- Respect freeform toggle

**Distribution:** Appended during `/vibe install`, removed during uninstall.

**Template:** See `VIBE_CLAUDE_MD_TEMPLATE.md`

### Layer 3: MCP Server Hints

**Mechanism:** Server responses include optional `hint` field that Claude interprets.

**Examples:**

```json
// vibe_inbox response with 5+ unread
{
  "inbox": [...],
  "unread_count": 7,
  "hint": "structured_triage_recommended"
}

// vibe_who response with new person online
{
  "online": ["@scriptedfantasy", "@newperson"],
  "hint": "surprise_suggestion",
  "suggestion": {
    "handle": "@newperson",
    "reason": "just_joined",
    "context": "Building something interesting"
  }
}

// vibe_dm response after sending
{
  "status": "sent",
  "hint": "offer_memory_save",
  "suggested_memory": "Discussed X, follow up on Y"
}
```

**Claude Behavior:** When hint is present, Claude triggers appropriate flow:
- `structured_triage_recommended` → Inbox Triage flow
- `surprise_suggestion` → Proactive alert with engagement options
- `offer_memory_save` → Ask if user wants to save memory

---

## Mode Toggle

### Structured Mode (default)

All /vibe interactions use AskUserQuestion flows. User experiences:
- Guided recipient selection
- Intent/tone choices
- Memory surfacing
- Draft approval

### Freeform Mode

Raw /vibe commands, no structured flows. User experiences:
- Direct command execution
- Claude uses judgment but doesn't prompt with choices
- Faster for power users who know what they want

### Toggle Commands

```
"vibe freeform"    → Disable structured mode
"vibe dashboard"   → Re-enable structured mode
"vibe guided"      → Re-enable structured mode (alias)
```

### Persistence

Mode preference stored in `~/.vibe/config.json`:

```json
{
  "structured_mode": true,
  "default_tone": "casual",
  "platforms_enabled": ["vibe", "x", "whatsapp"]
}
```

---

## Files Created

```
/Users/seth/vibe-dashboard-spec/
├── VIBE_DASHBOARD_UX_SPEC.md      # This file (main spec)
├── VIBE_CLAUDE_MD_TEMPLATE.md     # Template for CLAUDE.md injection

/Users/seth/.claude/skills/
└── vibe-dashboard.md              # Skill file with flow definitions
```

---

## Implementation Checklist

### Phase 1: Local Testing (Complete)
- [x] Prototype Compose Assistant flow
- [x] Prototype Inbox Triage flow
- [x] Prototype Discovery Mode flow
- [x] Prototype Unified Inbox (multi-platform)
- [x] Prototype Serendipity Mode
- [x] Write main UX spec
- [x] Create skill file
- [x] Create CLAUDE.md template

### Phase 2: Server Integration
- [ ] Add hint field to MCP server responses
- [ ] Implement structured_triage_recommended hint
- [ ] Implement surprise_suggestion hint
- [ ] Implement offer_memory_save hint

### Phase 3: Install/Uninstall Hooks
- [ ] Update install script to inject CLAUDE.md content
- [ ] Update install script to copy skill file
- [ ] Add uninstall hooks to clean up

### Phase 4: Multi-Platform Bridges
- [ ] X/Twitter read integration
- [ ] X/Twitter write integration
- [ ] WhatsApp integration
- [ ] Telegram integration
- [ ] Unified inbox aggregation

### Phase 5: Polish
- [ ] User preference persistence
- [ ] Outbox queue for offline messages
- [ ] Cross-session follow-up reminders
