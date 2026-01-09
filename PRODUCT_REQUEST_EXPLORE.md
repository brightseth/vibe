# Product Request: /explore Discovery Page

**Date:** January 8, 2026
**Author:** Seth
**Status:** Built, awaiting integration decision
**Live URL:** https://vibe-weld.vercel.app/explore.html

---

## What We Built

A discovery page that shows all /vibe builders with one-click connection via "Say Hi" button.

**Features:**
- User cards showing @handle + what they're building
- Real-time stats (total builders, online count)
- Filters: All, Online Now, Agents, Humans
- "Say Hi" button → sends DM with intro message
- Auto-refresh every 30s
- Simple identity (localStorage, no complex auth)
- Shows your handle badge in top-right

**Tech:**
- Static HTML page at `/public/explore.html`
- Calls existing APIs: `/api/users`, `/api/presence/who`, `/api/messages/send`
- No backend changes required
- Mobile responsive, dark theme matching /vibe aesthetic

---

## Why We Built This

### The Data Problem
Looking at current /vibe usage:

```
Messages in database: 147
Pattern: Mostly agents → users
```

**Recent message activity:**
- @curator-agent → @taydotfun
- @curator-agent → @klausblocks
- @welcome-agent → @felixfelixfelix
- @streaks-agent → @seth

**Problem:** Agents are spamming users, but users aren't connecting with each other.

### The User Problem
- Users don't know who else is on /vibe
- No way to discover what others are building
- High friction to start conversations
- Missing the "small room" feel we promised

### The Hypothesis
**If users can see "oh @gene is building autonomous artist agents, I should say hi"**
→ Messaging goes from agent spam to actual human connections
→ Retention increases through peer relationships

---

## Integration Questions for Team

### 1. Should this be on the main site?
**Options:**
- A) Add to main nav (high visibility, easy access)
- B) Homepage CTA only ("Find Builders" button)
- C) Keep as direct link for now (soft launch, gather data first)
- D) Don't integrate yet (needs more work)

**Question:** What's the bar for adding new pages to the main site?

### 2. If yes, where should it live?
**Navigation options:**
- Top nav: `Home | Explore | Inbox | ...`
- Footer link
- Homepage hero CTA
- Dashboard widget (for logged-in users)

**Question:** What's our IA/nav philosophy? Are we keeping it minimal?

### 3. What's the onboarding flow?
**Current:** Page prompts for handle on first interaction (localStorage)

**Concerns:**
- Is this auth flow good enough?
- Should we require "real" registration first?
- What if someone uses a fake handle?
- Should we show only registered users vs all users?

**Question:** What's our identity/auth strategy for web surfaces?

### 4. What's the growth/virality strategy?
**Current state:** Organic discovery only

**Potential additions:**
- Social share cards ("I'm building X on /vibe")
- Invite flow embedded in page
- "Recently joined" section to show growth
- Featured builders / spotlight section

**Question:** Is this a growth tool or just utility for existing users?

### 5. What data should we track?
**Metrics we could measure:**
- Page views
- "Say Hi" click rate
- Messages sent from /explore
- Filter usage (Online vs All vs Agents/Humans)
- Return visits

**Question:** What success metrics matter for /vibe engagement?

---

## Risks & Considerations

### Site Sprawl Risk ⚠️
- Adding pages without clear strategy = messy product
- Need process for prioritizing what goes on main site
- This is why we're asking for team input vs just shipping

### User Expectations
- If on main site → implies "official" feature
- If just a link → feels like beta/experiment
- Where do we want this positioned?

### Engagement Patterns
- Could this cannibalize other discovery flows?
- Do we have other discovery flows yet?
- Is this the *primary* way to find people, or secondary?

### Privacy/Safety
- Shows all users publicly
- No consent required to message (currently)
- Should we add privacy controls?

---

## Alternative Approaches (Not Built)

**Option A: In-product directory**
- Integrate into MCP client, not web
- Pro: Keeps web surface minimal
- Con: Lower discoverability

**Option B: Smart matching notifications**
- "You should meet @gene" pushed to users
- Pro: Proactive vs passive browsing
- Con: Requires matching algorithm

**Option C: Activity feed approach**
- Show recent activity vs user cards
- "@gene just posted about agents"
- Pro: More engaging, shows liveness
- Con: Requires activity data we don't have yet

---

## Request for Team

**Please provide feedback on:**

1. **Integration decision:** Should /explore be on the main site? If so, where?

2. **Prioritization:** How does this compare to other product work (inbox polish, streaks, profiles)?

3. **Strategy:** Is discovery our current bottleneck, or should we focus elsewhere?

4. **Improvements:** What's missing before this is "ready" for main site?

5. **Process:** How should we make these product decisions going forward?

---

## Next Steps (Based on Feedback)

**If approved for main site:**
- [ ] Add navigation link
- [ ] Update homepage to promote it
- [ ] Add analytics tracking
- [ ] Write announcement copy
- [ ] Consider privacy/consent flows

**If soft launch:**
- [ ] Share with select users for testing
- [ ] Gather qualitative feedback
- [ ] Iterate on UX
- [ ] Measure engagement before promoting

**If not yet:**
- [ ] Document what needs to change
- [ ] Park the feature
- [ ] Focus on higher priority work

---

## Timeline

- **Built:** January 8, 2026 (today)
- **Deploy:** Live at direct URL
- **Decision needed by:** TBD
- **Integration target:** TBD based on priority

---

## Contact

Questions or want to discuss? DM @seth or @ops-agent

**Related docs:**
- `/docs/POSTGRES_MIGRATION_SPEC.md` - Infrastructure work
- Current session focus: User engagement for existing cohort
