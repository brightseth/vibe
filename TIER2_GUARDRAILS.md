# /vibe Tier 2 Guardrails — Jan 1, 2026

**Advisor review complete. Tier 1 shipped. Now: observe, don't add.**

---

## The North Star

> "It remembers what mattered, and forgets everything else."

If you protect that sentence, you win.
If you violate it, you become another chat product.

---

## Advisor Verdicts (All Questions Answered)

| Question | Answer | Action |
|----------|--------|--------|
| ID generation | Sufficient for local-only | Keep as-is |
| File locking | Low risk | Don't add yet |
| Scaling (count reads file) | Correct tradeoff | Keep it |
| Full-text search | Don't add yet | Substring is enough |
| Encryption | Plaintext is correct | Keep it |
| Sync | Treat like publishing | Design carefully later |
| Pruning/TTL | Never auto-prune | Deletion = human-initiated |

**Overall verdict:** "Clean, restrained, and trustworthy."

---

## Tier 2A: Observe, Don't Add (1-2 weeks)

Before writing more code, answer these with **real usage**:

1. How often do people run `vibe remember`?
2. How often do they run `vibe recall`?
3. Do they recall before asking questions?
4. Which category dominates? (preference / concern / decision / fact)

**Diagnosis:**
- If `recall < remember` → memory is hoarding
- If `remember < recall` → memory is gold
- If both are low → UX friction, not missing features

**Do nothing else until you know this.**

---

## Tier 2B: Async Handoffs (Next Real Win)

This should come **before** presence inference or DNA matching.

**Why:**
- Directly uses summary + context + memory
- Creates continuity across time
- Feels magical without surveillance

**Shape it narrowly:**

```
vibe handoff @agent
```

**Payload:**
- Last summary
- Optional context snapshot
- Optional "what I need next"

**No automation. No inference. Just packaging.**

---

## Tier 2C: Presence Inference (Only After Trust)

When you do this, keep it explainable:

> "Marked 🔥 shipping because you sent 6 messages + committed code."

**If you can't explain it in one sentence, don't ship it.**

---

## What NOT to Build (Still)

| Anti-Feature | Why |
|--------------|-----|
| Channels | Creates performance, kills intimacy |
| Feeds | Platform behavior, not room behavior |
| Auto-suggestions | Violates consent |
| Matchmaking | "People you should talk to" is creepy |
| Memory-based nudging | Converts room into product |

**These all convert a room into a platform.**

---

## Minor Code Improvements (Non-Blocking)

### 1. Add input validation to `remember()`

```javascript
if (!observation || observation.length > 1000) {
  throw new Error('observation must be 1-1000 chars');
}
```

### 2. Add error handling to `recall()`

```javascript
} catch (e) {
  console.error(`Corrupted memory at line ${idx}:`, e.message);
  return null;
}
```

### 3. Consider adding `vibe backup`

```
vibe backup
# Creates ~/.vibe/backups/2026-01-02T10-30-00/
```

**None of these are blocking. Ship now, iterate based on usage.**

---

## The Wedge Test

> "Did someone save a memory, then recall it days later to inform a decision?"

If that happens **once**, Tier 1 succeeded.

---

## Immediate Actions

1. **Freeze Tier 1 for a week**
2. **Dogfood with real collaborators**
3. **Log friction, not ideas**

When someone says:

> "Just check vibe, it remembers"

—you're done.

---

*Advisor feedback integrated Jan 1, 2026*
