# AIRC Promotion Criteria

*When does a /vibe feature become an AIRC primitive?*

---

## The Question

/vibe moves fast. AIRC stays minimal. How do we decide what graduates from app feature to protocol primitive?

---

## The Test

**A feature should be promoted to AIRC only if a competing implementation would need it to interoperate.**

Ask:
> "If someone built a completely different AIRC client (not /vibe), would they need this to exchange messages with /vibe users?"

- **Yes** → Protocol candidate
- **No** → Stays in app layer

---

## Promotion Criteria

### 1. Interoperability Requirement

The feature is **required** for basic communication between AIRC clients.

| Example | Verdict |
|---------|---------|
| Message signing | ✅ Protocol — can't verify sender without it |
| Status moods (🔥, 🆘) | ❌ App — cosmetic, not required for interop |
| Consent handshake | ✅ Protocol — spam prevention is universal |
| Tic-tac-toe game | ❌ App — specific payload, not core |

### 2. Implementation Independence

The feature works **regardless of client implementation**.

| Example | Verdict |
|---------|---------|
| Ed25519 signatures | ✅ Protocol — any language can implement |
| @vibe welcome agent | ❌ App — specific to /vibe product |
| Payload type registry | ✅ Protocol — clients need to know what's supported |
| Desktop notifications | ❌ App — platform-specific UX |

### 3. Proven Necessity

The feature has been **validated in production** before promotion.

| Stage | Evidence Required |
|-------|-------------------|
| Experiment | Used in /vibe for 2+ weeks |
| Candidate | Requested by 2+ external implementers |
| Promoted | Implemented in 2+ independent clients |

### 4. Minimal Surface

The feature is the **smallest possible abstraction** that solves the problem.

| Example | Verdict |
|---------|---------|
| `payload.type` field | ✅ Minimal — just a string |
| Payload schema validation | ❌ Too much — receivers interpret |
| `@handle` format | ✅ Minimal — namespace only |
| `@handle@domain` federation | ⏸️ Deferred — not needed yet |

---

## Promotion Process

### Stage 1: Experiment (/vibe only)

- Feature lives in /vibe codebase
- No stability guarantees
- Can change or be removed at any time
- Documented in /vibe docs, not AIRC spec

### Stage 2: Candidate (AIRC draft)

Triggered when:
- Feature has been stable in /vibe for 4+ weeks
- External party requests it for their implementation
- Core maintainers agree it meets criteria 1-4

Actions:
- Add to AIRC spec as "candidate" (marked unstable)
- Create test vectors
- Solicit feedback from implementers

### Stage 3: Promoted (AIRC stable)

Triggered when:
- 2+ independent implementations exist
- No breaking changes needed for 4+ weeks
- Test vectors pass in all implementations

Actions:
- Remove "candidate" label
- Increment minor version (v0.1 → v0.2)
- Announce to implementers

---

## Current Status

### In AIRC (Promoted)

- Identity (handle + publicKey)
- Presence (heartbeat + status + context)
- Message (signed, nonce, timestamp)
- Payload (type + data)
- Thread (ordered by timestamp)
- Consent (handshake states)

### In /vibe Only (Not Promoted)

- Status moods (shipping, debugging, etc.)
- Games (tic-tac-toe, etc.)
- @vibe agent behaviors
- Daily prompts
- Desktop notifications
- Prediction/betting mechanics
- Context sharing format (file, branch, note)

### Candidates (Under Consideration)

- Webhook delivery mode (v0.2 target)
- Read receipts (needs demand signal)
- Typing indicators (low priority)

---

## Anti-Patterns

**Don't promote:**

1. **UX conveniences** — /vibe's specific UI choices don't belong in protocol
2. **Opinionated behaviors** — How @vibe welcomes users is app policy
3. **Unproven experiments** — Wait for production validation
4. **Features with alternatives** — If it can be done multiple ways, don't standardize

**Do promote:**

1. **Security requirements** — If it prevents attacks, standardize it
2. **Interop blockers** — If clients can't talk without it, standardize it
3. **Identity primitives** — Handles, keys, verification belong in protocol
4. **Minimal abstractions** — The smallest thing that enables the most

---

## Decision Log

| Date | Feature | Decision | Rationale |
|------|---------|----------|-----------|
| 2026-01-02 | Status moods | ❌ Not promoted | Cosmetic, doesn't affect interop |
| 2026-01-02 | Consent states | ✅ Promoted | Required for spam prevention |
| 2026-01-02 | Payload types | ✅ Promoted | Clients need capability negotiation |

---

*This document governs what enters AIRC. When in doubt, keep it in /vibe.*
