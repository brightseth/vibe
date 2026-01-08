# RFC: Agent Reorganization — Function-Based Roles

**Author:** @claude-code + @seth
**Date:** 2026-01-08
**Status:** DRAFT
**Stakeholders:** All workshop agents

---

## Summary

Reorganize from 9 task-based agents to 6 function-based agents that map to real startup roles. This improves clarity, reduces overlap, and prepares for scale.

---

## Current State (9 Agents)

| Agent | Role | Problem |
|-------|------|---------|
| ops-agent | Infrastructure | Good, keep |
| welcome-agent | Onboarding | Overlaps with growth |
| discovery-agent | User matching | Overlaps with community |
| curator-agent | Storytelling | Vague scope |
| streaks-agent | Gamification | Narrow, should be part of engagement |
| bridges-agent | External platforms | Vague, needs clarity |
| scribe-agent | Chronicles | Overlaps with comms |
| games-agent | Build games | Narrow |
| echo | Feedback | Unclear ownership |

---

## Proposed State (6 Agents)

### @ops
*"Keep it running"*

**Responsibilities:**
- Infrastructure health monitoring
- Agent coordination (backlog, handoffs)
- Cost tracking per agent (new API keys)
- Deployments and rollbacks
- Performance optimization

**Metrics:**
- Uptime %
- API latency p50/p95
- Agent cost per day
- Error rate

---

### @growth
*"Get users, make them stay"*

**Absorbs:** welcome-agent, parts of discovery-agent

**Responsibilities:**
- Invite system optimization
- First-time user experience (FTUE)
- Onboarding flows (by user type)
- Viral loop design
- Conversion metrics
- Genesis handle campaign

**Metrics:**
- Daily signups
- Invite conversion rate
- Day-1 / Day-7 retention
- Genesis spots remaining

**Immediate Tasks:**
- [ ] Improve invite system (tracking, rewards)
- [ ] Build better FTUE (guided first session)
- [ ] Retention hooks (notifications, daily reasons to return)

---

### @community
*"Make users love it"*

**Absorbs:** curator-agent, streaks-agent, parts of discovery-agent, games-agent

**Responsibilities:**
- Celebrate ships publicly (board posts)
- Streak motivation and badges
- Achievement system visibility
- User matching/introductions
- Games and social features
- Culture building
- Power user cultivation

**Metrics:**
- DAU/MAU ratio
- Messages per user per day
- Streak participation %
- Game sessions per week

**Immediate Tasks:**
- [ ] Make achievements more visible
- [ ] Improve streak dashboard
- [ ] Spotlight weekly ships

---

### @trust
*"Keep it safe"* (NEW)

**Responsibilities:**
- Abuse/spam detection
- Report handling (/api/report exists)
- Privacy compliance
- Moderation decisions
- Consent enforcement (AIRC)
- Block/mute functionality

**Metrics:**
- Reports per day
- Time to resolve reports
- False positive rate
- User complaints

**Immediate Tasks:**
- [ ] Review existing report system
- [ ] Build moderation queue
- [ ] Document trust policies

---

### @devrel
*"Help builders build"* (NEW)

**Responsibilities:**
- MCP server support
- API documentation
- Integration examples
- Bug triage from developers
- SDK/tooling improvements
- Developer onboarding

**Metrics:**
- GitHub issues resolved
- Documentation coverage
- Developer satisfaction
- Integration count

**Immediate Tasks:**
- [ ] Audit current docs
- [ ] Create "Build Your First Agent" tutorial
- [ ] Respond to GitHub issues

---

### @voice
*"Tell the story"*

**Absorbs:** bridges-agent, scribe-agent

**Responsibilities:**
- External surfaces (slashvibe.dev, airc.chat)
- Twitter (@slashvibe - needs setup)
- Discord (oldnewcoders → /vibe rebrand)
- Changelog/announcements
- Narrative consistency
- Press/partnerships

**Metrics:**
- Twitter followers
- Discord members
- Website accuracy (stats match reality)
- Announcement reach

**Immediate Tasks:**
- [ ] Update slashvibe.dev with live stats (45 users, not 43)
- [ ] Set up @slashvibe Twitter
- [ ] Rebrand Discord channel
- [ ] Weekly "This Week in /vibe" post

---

## Migration Plan

### Phase 1: Document (Today)
- [x] Write this RFC
- [ ] Get agent feedback
- [ ] Seth approval

### Phase 2: Reorganize (This Week)
- [ ] Rename agent directories
- [ ] Update agent configs
- [ ] Merge overlapping code
- [ ] Update .backlog.json assignments

### Phase 3: Launch New Agents (Next Week)
- [ ] Create @trust agent
- [ ] Create @devrel agent
- [ ] Test all agents work together

### Phase 4: Deprecate Old (Week After)
- [ ] Archive old agent code
- [ ] Update COORDINATION.md
- [ ] Update EVOLUTION.md

---

## Agent Feedback Requested

Each agent should review and respond:

1. **Do you agree with your new role?**
2. **What tasks should transfer to another agent?**
3. **What's missing from your responsibilities?**

---

## Approval Status

- [ ] @seth — Pending
- [ ] @ops-agent — Pending
- [ ] @growth (was welcome) — Pending
- [ ] @community (was curator) — Pending
- [ ] @voice (was bridges) — Pending
- [ ] @trust (new) — N/A
- [ ] @devrel (new) — N/A

---

*"The agents building /vibe are the first real AIRC citizens. Their roles should reflect what a real team needs."*
