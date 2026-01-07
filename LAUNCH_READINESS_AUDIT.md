# /vibe Launch Readiness Audit

**Date**: January 7, 2026 (Updated)
**Auditor**: Claude Code
**Grade**: B+ for trusted friends | B- for open internet

---

## Executive Summary

/vibe has working HMAC auth, consent enforcement, **rate limiting on all APIs**, and **atomic handle uniqueness verification**. Presence is always-on (documented as known limitation) and there's no formal abuse reporting UI (users can block + DM @sethgoldstein). Ready for controlled sharing (50-100 builders) and demo recording.

---

## Blockers (Must Fix Before Strangers)

### 1. ~~No Rate Limiting on Public APIs~~ ✅ FIXED
**Status**: Implemented in `api/lib/ratelimit.js`

- 60 messages/min (authenticated)
- 10 messages/min (unauthenticated)
- 5 registrations/hour per IP
- 5 presence updates/10 seconds
- Sliding window with atomic Redis INCR + EXPIRE

---

### 2. ~~No Handle Uniqueness Verification~~ ✅ FIXED
**Status**: Implemented in `api/lib/handles.js`

- Atomic claim via Redis HSETNX (race-condition proof)
- Reserved handles: system (admin, root, etc.), brands (openai, anthropic, etc.), influencers (elon, naval, etc.)
- Returns 409 with suggestions if handle taken
- Validation: 3-20 chars, alphanumeric + underscore

---

### 3. Presence is Always-On (No Opt-In) — DOCUMENTED
**Risk**: Stalking. Anyone can see who's online and what they're working on.

**What exists**: Presence with rich context (file, mood, builderMode).

**What's missing**: No "invisible" mode. No way to hide from specific users. No privacy settings.

**Bad outcome**: User gets harassed, can't hide their online status.

**Fix (minimum)**: Add `visible: true|false` field to presence. Filter invisible users from `GET /api/presence`. Allow per-user blocking from presence.

**Time**: 2-3 hours

---

### 4. No Abuse Reporting Path
**Risk**: No recourse for harassment victims. No audit trail for disputes.

**What exists**: Block functionality works (`action: block` in consent API).

**What's missing**:
- No "report" action (report + block)
- No audit log of reports
- No mute (temporary block)
- No admin visibility into complaints

**Bad outcome**: Someone gets harassed, blocks the user, but you never know it happened. Pattern of abuse goes undetected.

**Fix**: Add `action: report` to consent API. Store reports in KV with timestamp + evidence. Weekly report digest for admin.

**Time**: 3-4 hours

---

### 5. Unbounded Message Retention
**Risk**: Privacy liability. Old messages never expire.

**What exists**: `INBOX_LIMIT = 100,000`, `THREAD_LIMIT = 50,000`. DELETE disabled.

**What's missing**: No TTL on messages. No user-initiated delete. No retention policy.

**Bad outcome**: User wants old conversation deleted. You can't help them. GDPR implications.

**Fix (minimum for alpha)**: Document retention policy. Add `DELETE /api/messages/:id` for users to delete their own sent messages.

**Time**: 2 hours

---

## Controls Already in Place

| Control | Status | Notes |
|---------|--------|-------|
| HMAC auth | ✅ Working | Timing-safe comparison, session-to-handle binding |
| Consent system | ✅ Working | request/accept/block flow, grandfathering for existing threads |
| Agent rate limits | ✅ Working | `rate-limiter.js` with hourly/daily caps per action |
| Message length cap | ✅ Working | 2000 char limit on text |
| System account bypass | ✅ Documented | `solienne`, `vibe`, `scout` bypass consent |
| Replay protection | ✅ Partial | AIRC signatures have 5-min timestamp window |

---

## Launch Recommendation

### ✅ Ready for Controlled Sharing

All critical blockers resolved:
- [x] Rate limiting on all APIs (implemented)
- [x] Handle uniqueness verification (implemented)
- [x] Known limitations documented in README
- [x] Block functionality + @echo for reports

### Next Steps

1. **Record demo** — Demo script ready at `DEMO_PROMPTS.md`
2. **Share to 50-100 builders** — Approval-on-request via DM
3. **Monitor** — Watch for abuse patterns, iterate

### Pre-Launch Checklist

- [x] Rate limiting on messages API
- [x] Handle uniqueness check
- [x] Retention policy documented
- [x] "How to report abuse" in README
- [ ] Kill switch documented and tested
- [ ] Monitoring: alert on >100 messages/hour from single user

---

## Appendix: Code References

| Component | File | Key Lines |
|-----------|------|-----------|
| Consent API | `api/consent.js` | Full AIRC consent flow |
| Message auth | `api/messages.js:431-469` | Token verification |
| Agent rate limiter | `agents/core/rate-limiter.js:17-40` | Limit definitions |
| Presence TTL | `api/presence.js:68` | `PRESENCE_TTL = 300` (5 min) |
| Session TTL | `api/presence.js:71` | `SESSION_TTL = 3600` (1 hour) |
