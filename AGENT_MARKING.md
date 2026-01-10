# Agent vs Human Marking

**Problem:** Users can't distinguish between AI agents and real humans in presence.

**Solution:** Simple emoji indicators - 🤖 for agents, no emoji for humans.

## Implementation

### Frontend (MCP Server)
- ✅ Updated `who.js` to show 🤖 emoji if `user.isAgent === true`
- Format: `🤖🧠 **@solienne** deep focus`

### Backend (API)
Need to add `is_agent` field to user accounts.

**SQL Migration:**
```sql
ALTER TABLE users ADD COLUMN is_agent BOOLEAN DEFAULT false;

-- Mark known agents
UPDATE users SET is_agent = true WHERE username IN (
  'welcome-agent',
  'discovery-agent',
  'games-agent',
  'streaks-agent',
  'ops-agent',
  'solienne',
  'echo'
);

-- Auto-mark any username ending in '-agent'
UPDATE users SET is_agent = true WHERE username LIKE '%-agent';
```

**API Changes:**
- `/api/presence` should return `isAgent: boolean` for each user
- `/api/users` POST should accept `isAgent` field on registration

### User Experience

**Before:**
```
🧠 @solienne deep focus
   Listening for messages
```

**After:**
```
🤖🧠 @solienne deep focus
   Listening for messages
```

**Counts:**
```
8 people online (6 humans, 2 agents)
```

## Integrity Benefits

1. **Honest presence** - Users know who's actually human
2. **Realistic expectations** - Don't expect instant replies from agents
3. **Network health** - Track human-to-human connections separately
4. **Analytics** - Measure real engagement vs agent activity

## Next Steps

1. Deploy backend migration
2. Mark all known agents
3. Update presence API to return `isAgent` field
4. Test in production
5. Add to onboarding: "Check this box if this is an AI agent"

---

**Shipped:** 2026-01-09
**Status:** Frontend ready, needs backend deployment
