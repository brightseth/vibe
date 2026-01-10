# /vibe Branching Strategy

## The Problem
Multiple ideas prototyping in parallel → risk of:
- Breaking production
- Merge conflicts
- Frankenstein code
- Lost work

## The Solution: Feature Branch Workflow

### Branch Types

**main (production)**
- Always deployable
- Protected
- Only merge tested features
- Deploys to: slashvibe.dev

**feature/* (clean features)**
- One feature per branch
- Clean, tested code
- Ready to merge
- Example: `feature/discovery-ui`

**proto/* (rapid prototyping)**
- Experimental
- Break things freely
- Iterate fast
- Extract good parts to feature branches
- Example: `proto/search-experiment`

### Daily Workflow

#### Morning: Start New Ideas
```bash
# For each idea you want to explore:
git checkout main
git pull origin main
git checkout -b proto/discovery-ui

# Prototype fast, break things
# Vercel auto-deploys: vibe-public-git-proto-discovery-ui.vercel.app
```

#### During Day: Iterate
```bash
# Work on proto branch
git add .
git commit -m "wip: trying search UI"
git push origin proto/discovery-ui

# New preview URL on every push
# Test live without touching production
```

#### End of Day: Promote Winners
```bash
# When proto is good, create clean feature branch:
git checkout main
git checkout -b feature/discovery-ui

# Cherry-pick the good commits or rewrite cleanly
# Clean up, remove debug code, add tests

# Push feature branch
git push origin feature/discovery-ui

# Merge to main when ready
git checkout main
git merge feature/discovery-ui
git push origin main

# Delete proto branch (or keep for reference)
git branch -D proto/discovery-ui
git push origin --delete proto/discovery-ui
```

### Multi-Idea Coordination

**Scenario:** Working on 3 ideas simultaneously

```bash
# Idea 1: Discovery UI
git checkout -b proto/discovery-ui
# ... work work work ...
git push origin proto/discovery-ui

# Idea 2: DM Cards
git checkout main
git checkout -b proto/dm-cards
# ... work work work ...
git push origin proto/dm-cards

# Idea 3: Artifact Search
git checkout main
git checkout -b proto/search
# ... work work work ...
git push origin proto/search
```

**Each gets its own preview URL:**
- Proto 1: `vibe-public-git-proto-discovery-ui.vercel.app`
- Proto 2: `vibe-public-git-proto-dm-cards.vercel.app`
- Proto 3: `vibe-public-git-proto-search.vercel.app`

**End of Day Merge Party:**
```bash
# Pick the winners
git checkout main

# Merge Idea 1 (works great)
git merge proto/discovery-ui
git push

# Hold Idea 2 (needs more work)
# Keep proto/dm-cards alive for tomorrow

# Abandon Idea 3 (didn't pan out)
git branch -D proto/search
```

### Vercel Preview Deployments

**Automatic on every branch:**
- Push to any branch → instant preview URL
- Share with testers: "Check out vibe-public-git-proto-idea.vercel.app"
- No risk to production
- Test with real data (same DB/KV)

**Check deployment status:**
```bash
vercel ls  # See all deployments
```

### Avoiding Frankenstein Code

**Don't:**
- ❌ Work directly on main
- ❌ Merge untested code
- ❌ Let proto branches accumulate
- ❌ Mix multiple features in one branch

**Do:**
- ✅ One feature per branch
- ✅ Clean up before merging
- ✅ Delete merged branches
- ✅ Review diffs before merging
- ✅ Test preview URLs before merging to main

### Emergency: "I Broke Main"

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or go back further
git log --oneline  # Find good commit
git revert abc123
git push origin main

# Vercel auto-deploys, production restored in ~15 seconds
```

### Tips for Your Workflow

**Start of Day:**
```bash
git checkout main && git pull
git status  # Should be clean
```

**During Day:**
- Create proto branches freely
- Push often (Vercel gives you preview URLs)
- Test preview URLs with real users if needed

**End of Day:**
- Review what worked
- Promote good protos to feature branches
- Merge to main
- Clean up (delete old protos)

**Before Sleep:**
```bash
git checkout main
git log --oneline -5  # See what shipped today
git push origin main  # Make sure it's synced
```

### Common Patterns

**Pattern 1: Quick Fix**
```bash
# Don't need a branch for tiny fixes
git checkout main
git pull
# Fix typo, update copy, etc.
git add .
git commit -m "fix: typo in welcome message"
git push origin main
```

**Pattern 2: Experiment**
```bash
git checkout -b proto/crazy-idea
# Try something wild
# If it works → feature branch
# If it fails → delete branch
```

**Pattern 3: Multiple Days**
```bash
# Day 1: Start proto
git checkout -b proto/big-feature
# ... work ...
git push origin proto/big-feature

# Day 2: Continue
git checkout proto/big-feature
git pull origin proto/big-feature
# ... more work ...
git push

# Day 3: Ship it
git checkout main
git merge proto/big-feature
git push origin main
```

### Your Current Options

**Option 1: Keep main-only (current)**
- Fast
- Simple
- Risky for parallel ideas

**Option 2: Feature branches (recommended)**
- Isolated
- Preview URLs
- Clean merges
- 30 seconds overhead per branch

**Option 3: Develop + feature branches**
- Staging environment
- Test integrations
- More structure
- More overhead

## My Recommendation for You

**Use proto/* branches for rapid iteration:**
1. Idea → proto/idea-name
2. Push often (get preview URLs)
3. Good stuff → feature/idea-name (clean)
4. Merge to main end of day
5. Delete proto branches

**Stay on main for:**
- Tiny fixes
- Copy changes
- Version bumps
- Docs

**This matches your style:**
- Fast iteration ✅
- Multiple ideas in parallel ✅
- Preview without breaking prod ✅
- Clean main branch ✅
- End-of-day coordination ✅
