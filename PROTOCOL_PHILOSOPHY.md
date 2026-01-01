# /vibe Protocol Philosophy

> **"Messages may contain meaning. Memory requires consent."**

---

## The Architectural Shift

**From:** Linguistic affordances (text is truth, prone to hallucination)
**To:** Structured protocol (payloads are truth, text is commentary)

This is the difference between Discord (chat) and /vibe (substrate).

---

## The Three Principles

### 1. Payloads Are First-Class Citizens

Messages carry **state**, not just **text**.

```
Text = commentary (creative, expressive, ambiguous)
Payload = truth (deterministic, inspectable, stable)
```

Agents reason over the JSON state, not parse ASCII art.

### 2. ONE Schema Before Generalization

Start concrete. Ship tic-tac-toe. Learn from real games. Then extract patterns.

Do not design the general protocol first. Let it emerge.

### 3. Rendering Is Subordinate

The ASCII board is a **view**, not the **source of truth**.

Multiple renderers are possible. Storage doesn't care about UI. Agents can reason over state.

---

## Memory: Promotion, Not Capture

Memory is the most dangerous feature. Here's the only viable shape.

### The Rule

Only memories that were **already summarized** can be saved.

- No raw logs
- No payload dumps
- No background harvesting

**Memory is a promotion, not a capture.**

### The Flow

1. Session happens
2. Smart Summary is generated
3. Human explicitly says: `vibe remember`
4. System confirms: "Save this to memory? [y/n]"
5. If yes: stored per-thread, attributed, append-only

### The Constraints

| Constraint | Why |
|------------|-----|
| **Local-first** | User can inspect `~/.vibe/memory/` |
| **Explicit consent** | No ambient surveillance |
| **Thread-scoped** | Memories don't leak across contexts |
| **Inspectable** | Plain JSONL, no encryption |
| **Append-only** | Audit trail, no silent edits |

---

## Guardrails: Protocol Over Panopticon

### Do Not Activate Payloads (Yet)

Payloads are for **observation**, not **automation**.

Right now:
- Game state updates the board
- Code reviews render as cards
- Handoffs show context

DO NOT add (yet):
- Auto-running skills based on payloads
- Background agents parsing every message
- Inferring intent from payload patterns

**You need trust before automation.**

### Avoid Inference

Do not let the system "guess" what a payload means.

Let the schema define meaning. Don't add magical inference layers.

### No Global Storage (Yet)

Keep memory **local or per-thread**.

Phase 2 (shared memory) requires community consent model. Do not jump there without demand.

---

## The Forcing Function

Before shipping any memory feature, ask:

1. **Does this feel like a notebook, or surveillance?**
2. **Can the user inspect the raw file?**
3. **Is promotion explicit, not ambient?**

If any answer is wrong, don't ship it.

---

## What This Enables

The social substrate for human-agent collaboration:

| Component | What It Does |
|-----------|--------------|
| **Presence** | Who's here + what they're working on |
| **Memory** | What happened (with consent) |
| **Endings** | Session closures with meaning |
| **State** | Shared, structured, inspectable truth |

**This is not incremental on Discord/Slack. This is orthogonal.**

---

*Jan 1, 2026 — The moment /vibe crossed from chat to protocol.*
