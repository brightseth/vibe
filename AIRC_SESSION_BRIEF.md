# AIRC Session Brief

**Purpose:** Advance the AIRC protocol spec independently from /vibe development.

---

## What is AIRC?

**AIRC: Agent Identity & Relay Communication**
*"Like IRC, but for AI agents."*

A minimal open protocol for AI agents to communicate socially — what MCP is to tools, AIRC is to presence + messaging.

---

## Current State

- **Spec:** `/Users/seth/vibe-public/AIRC_SPEC.md` (~700 lines, comprehensive)
- **GitHub:** https://github.com/brightseth/vibe-platform/blob/main/AIRC_SPEC.md
- **Status:** Draft v0.1, ready for external review

---

## What's Done

- 6 primitives defined (Identity, Presence, Message, Payload, Thread, Consent)
- Canonical JSON signing spec
- API endpoints defined
- Error codes
- Security considerations
- Examples
- Implementation checklist

---

## What Needs Work

### Immediate (This Session)

1. **Finalize for announcement** — Review spec for any gaps before sharing publicly
2. **Write announcement post** — Twitter thread or blog post explaining AIRC
3. **Create pitch deck** — 5-7 slides for reaching out to Cursor, Replit, MCP maintainers
4. **Draft outreach emails** — Templates for DevRel contacts

### Technical Improvements

5. **Add more payload examples** — Chess, poker, collaborative editing, task handoff
6. **Capability negotiation section** — What happens when receiver doesn't support a payload type
7. **Versioning rules** — How to handle protocol upgrades
8. **Test vectors** — Canonical signing examples for cross-implementation testing

### Strategic

9. **Comparison doc** — AIRC vs alternatives (why not just webhooks?)
10. **FAQ** — Anticipated questions from skeptics

---

## Key Design Decisions (Already Made)

1. **Canonical JSON signing** — Sign full object minus signature field
2. **Public keys from day 1** — Build for federation even if v0.1 is centralized
3. **Consent required** — Can't message strangers without handshake
4. **Payloads interpreted, not rendered** — No UI coupling
5. **Polling-first** — Stateless, works everywhere

---

## Advisor Feedback to Address

- "Consent is the moat" — Transforms from dumb pipe to social graph
- "Code wins arguments" — Reference implementation (/vibe) is key
- "Independent launch first" — Prove it works, then pitch to labs
- Consider "Coordination" framing for enterprise (vs "Social" for consumer)

---

## Target Audience for Outreach

1. **MCP maintainers** — Ensure no conflict with their roadmap
2. **Cursor/Anysphere** — Building multiplayer editor, need this protocol
3. **Replit (Amjad)** — "Software creation as a social act"
4. **Agent frameworks** — AutoGen, CrewAI, LangGraph
5. **Anthropic/OpenAI DevRel** — After proving traction

---

## Files Reference

```
/Users/seth/vibe-public/
├── AIRC_SPEC.md          # The protocol spec
├── STATUS_JAN_2_2026.md  # Full project status
└── api/                  # Reference implementation (vibe)
```

---

## Session Goals

By end of this session, have:
- [ ] Spec reviewed and polished
- [ ] Announcement draft ready
- [ ] Outreach materials prepared
- [ ] Clear next steps documented

---

*This brief created Jan 3, 2026 for parallel AIRC development session.*
