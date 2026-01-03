# AIRC Session State — Jan 3, 2026

**Status:** Spec review complete, ready to continue

---

## Completed

- [x] Read AIRC_SPEC.md (700 lines)
- [x] Read AIRC_SESSION_BRIEF.md
- [x] Identified spec gaps

---

## Spec Gaps Identified (Pre-Announcement Fixes)

### 1. Capability Negotiation (Missing)
Spec says "Unknown types are ignored" but doesn't explain:
- What sender should do if recipient lacks capability
- How receiver should respond to unknown payloads
- Graceful degradation pattern

**Fix:** Add section 2.8 "Capability Negotiation"

### 2. Versioning Rules (Missing)
No guidance on:
- v0.2 clients talking to v0.1 registries
- Forward/backward compatibility
- Version negotiation

**Fix:** Add section 3.4 "Versioning"

### 3. Test Vectors (Missing)
No canonical signing examples for implementers to verify against.

**Fix:** Add Appendix C "Test Vectors" with:
- Sample keypair
- Sample message + expected canonical JSON + expected signature
- Sample heartbeat signing

### 4. Minor Issues
- Section 2.7 references wrong section
- `capabilities.delivery` allows webhook but webhook undefined in v0.1
- Key rotation "24h grace period" mechanics unclear
- Rate limiting (429) has no guidance on actual limits

---

## Next Steps (Pick Up Here)

### Option A: Fix Spec First (30 min)
1. Add capability negotiation section
2. Add versioning rules
3. Add test vectors
4. Fix minor issues

### Option B: Write Announcement First (15 min)
1. Draft Twitter thread (10 tweets)
2. Use spec as-is, iterate later

### Option C: Both in Parallel
1. You review announcement draft
2. I fix spec gaps

---

## Announcement Draft Outline (For Reference)

**Twitter Thread Structure:**
1. Hook: "AI agents can execute tools. They can delegate tasks. But they can't talk to each other."
2. Problem: MCP = tools, A2A = tasks, ??? = social coordination
3. Introduce AIRC: "Like IRC, but for AI agents"
4. Six primitives: Identity, Presence, Message, Payload, Thread, Consent
5. Key insight: Consent is the moat (transforms dumb pipe → social graph)
6. What it enables: Games, context sharing, task handoffs, pair programming
7. Reference implementation: /vibe (already works in Claude Code)
8. Open spec: CC0, anyone can implement
9. Call to action: "What would you build if your agent could talk to other agents?"
10. Link to spec

---

## Key Files

```
/Users/seth/vibe-public/
├── AIRC_SPEC.md              # The protocol spec (review complete)
├── AIRC_SESSION_BRIEF.md     # Session goals
├── AIRC_SESSION_STATE_JAN3.md # This file (resume here)
└── STATUS_JAN_2_2026.md      # Full project status
```

---

## Resume Command

```
cd /Users/seth/vibe-public
claude

"Read AIRC_SESSION_STATE_JAN3.md and continue where we left off. I want to [A/B/C]."
```

---

*Session paused Jan 3, 2026*
