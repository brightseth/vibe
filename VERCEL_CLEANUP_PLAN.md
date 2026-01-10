# Safe Vercel Cleanup Plan - WITH ROLLBACK STEPS

## Status: READY TO EXECUTE (Safe & Reversible)

---

## What We Found

### ✅ letsvibe.fm - KEEP IT (Podcast is Active!)

**Status:** Podcast launched Jan 8, 2026, very much active, launch Feb 10
**Problem:** Domain exists but returns 404 - website not built yet
**Action:** KEEP the Vercel project, need to build the website
**Files:** Planning docs exist in `~/Projects/lets-vibe-podcast/` but no web frontend yet

### ❌ vibe & vibe-repo - Safe to Delete (Duplicates/Broken)

**vibe** - Exact duplicate of vibe-public (same content)
**vibe-repo** - Returns 404, abandoned test project

---

## Pre-Cleanup Safety Checklist

### 1. Document Current State (BEFORE touching anything)

```bash
# Save current project list
vercel project ls > ~/Desktop/vercel-projects-backup-$(date +%Y%m%d).txt

# Save domain mappings
vercel domains ls > ~/Desktop/vercel-domains-backup-$(date +%Y%m%d).txt

# Verify production sites work
curl -I https://slashvibe.dev | grep "HTTP"
curl -I https://vibestation.guide | grep "HTTP"
curl -I https://vibecodings-phi.vercel.app | grep "HTTP"
```

### 2. Screenshot Evidence

Take screenshots of:
- [ ] Vercel dashboard showing all projects
- [ ] vibe-public project settings
- [ ] vibe project settings (the duplicate)
- [ ] vibe-repo project settings

**Why:** If something goes wrong, we have visual proof of what existed.

---

## Phase 1: DELETE DUPLICATES (5 minutes, fully reversible within 7 days)

### SAFE DELETION: vibe (duplicate project)

**What it is:** Duplicate of vibe-public serving same content
**Domain:** vibe-weld.vercel.app (unused vercel.app subdomain)
**Risk level:** 🟢 ZERO RISK - not production, can restore within 7 days

#### Steps:

1. **Document before delete:**
   ```bash
   vercel inspect vibe-weld.vercel.app --json > ~/Desktop/vibe-project-backup.json
   ```

2. **Delete via Vercel dashboard:**
   - Go to: https://vercel.com/sethvibes/vibe/settings/advanced
   - Scroll to "Delete Project"
   - Type project name: `vibe`
   - Click "Delete"

3. **Verify deletion:**
   ```bash
   vercel project ls | grep "^  vibe " || echo "✅ vibe deleted"
   ```

#### ROLLBACK IF NEEDED (within 7 days):
- Vercel keeps deleted projects for 7 days
- Go to: https://vercel.com/sethvibes/deleted
- Click "Restore" next to `vibe`
- **OR** just redeploy from the repo since it's a duplicate anyway

---

### SAFE DELETION: vibe-repo (broken project)

**What it is:** Test project that returns 404
**Domain:** vibe-repo-two.vercel.app (unused)
**Risk level:** 🟢 ZERO RISK - already broken, not in use

#### Steps:

1. **Document before delete:**
   ```bash
   vercel inspect vibe-repo-two.vercel.app --json > ~/Desktop/vibe-repo-backup.json
   ```

2. **Delete via Vercel dashboard:**
   - Go to: https://vercel.com/sethvibes/vibe-repo/settings/advanced
   - Scroll to "Delete Project"
   - Type project name: `vibe-repo`
   - Click "Delete"

3. **Verify deletion:**
   ```bash
   vercel project ls | grep "vibe-repo" || echo "✅ vibe-repo deleted"
   ```

#### ROLLBACK IF NEEDED:
- Restore from https://vercel.com/sethvibes/deleted within 7 days
- **OR** just ignore it since it was broken anyway

---

## Phase 2: RENAME FOR CONSISTENCY (2 minutes, instant rollback)

### SAFE RENAME: vibe-public → vibe-platform

**What it is:** Production project serving slashvibe.dev
**Current name:** vibe-public
**New name:** vibe-platform (matches GitHub repo name)
**Risk level:** 🟡 LOW RISK - cosmetic rename, instant rollback

#### Steps:

1. **BEFORE rename - verify production works:**
   ```bash
   curl -I https://slashvibe.dev | grep "HTTP/2 200" && echo "✅ Production working"
   ```

2. **Rename via Vercel dashboard:**
   - Go to: https://vercel.com/sethvibes/vibe-public/settings
   - Under "General" → "Project Name"
   - Change `vibe-public` → `vibe-platform`
   - Click "Save"

3. **AFTER rename - verify production still works:**
   ```bash
   curl -I https://slashvibe.dev | grep "HTTP/2 200" && echo "✅ Production still working"
   ```

4. **Update local .vercel/project.json:**
   ```bash
   cd ~/Projects/vibe
   # Update projectName field from "vibe-public" to "vibe-platform"
   ```

#### INSTANT ROLLBACK IF NEEDED:
- Go back to settings, rename from `vibe-platform` → `vibe-public`
- **Note:** Domain aliases (slashvibe.dev) are NOT affected by project name
- Rename is purely cosmetic, doesn't affect deployment or DNS

---

## Phase 3: VERIFY EVERYTHING WORKS

### Critical Production Sites

After cleanup, verify these still work:

```bash
# Main production site
curl -I https://slashvibe.dev
# Should return: HTTP/2 200

# Other vibe ecosystem sites
curl -I https://vibestation.guide
curl -I https://vibecodings-phi.vercel.app

# Check that deleted projects return nothing
curl -I https://vibe-weld.vercel.app 2>&1 | grep "404\|Could not resolve"
curl -I https://vibe-repo-two.vercel.app 2>&1 | grep "404\|Could not resolve"
```

### What Should Work After Cleanup

✅ slashvibe.dev → loads /vibe platform
✅ vibestation.guide → loads hardware guide
✅ vibecodings → loads project directory
❌ vibe-weld.vercel.app → 404 (deleted)
❌ vibe-repo-two.vercel.app → 404 (deleted)
⏳ letsvibe.fm → still 404 (need to build website - separate task)

---

## Emergency Rollback Procedures

### If slashvibe.dev goes down:

**Immediate action:**
```bash
# Redeploy from current branch
cd ~/Projects/vibe
vercel --prod --yes
```

**If that doesn't work:**
- Go to: https://vercel.com/sethvibes/vibe-platform/deployments
- Find last working deployment (should be recent)
- Click "..." → "Promote to Production"

### If you deleted wrong project:

- Go to: https://vercel.com/sethvibes/deleted
- Click "Restore" next to the project name
- Wait 30 seconds for restore to complete

### If rename breaks something (unlikely):

- Go back to project settings
- Rename back to original name
- Takes effect immediately

---

## Execution Order (Safest to Riskiest)

### Step 1: Backup (1 min)
```bash
cd ~/Desktop
vercel project ls > vercel-backup-$(date +%Y%m%d-%H%M).txt
vercel domains ls >> vercel-backup-$(date +%Y%m%d-%H%M).txt
```

### Step 2: Delete vibe-repo (1 min) - SAFEST
- Returns 404 already
- Not used anywhere
- Zero risk

### Step 3: Delete vibe (1 min) - SAFE
- Duplicate of vibe-public
- Not production
- Can restore if needed

### Step 4: Rename vibe-public → vibe-platform (1 min) - LOW RISK
- Purely cosmetic
- Doesn't affect domains or deployments
- Instant rollback by renaming back

### Step 5: Verify (1 min)
- Check slashvibe.dev works
- Check deleted projects are gone
- Update local config

**Total time: 5 minutes**

---

## What NOT to Touch

**DON'T delete or modify:**
- vibecodings (active project directory)
- vibestation (active hardware guide)
- letsvibe-fm (active podcast, needs website built)
- Any Spirit Protocol projects
- Any personal/client sites

---

## Success Criteria

After cleanup, you should have:

1. **3 vibe projects** (down from 6):
   - ✅ vibe-platform (production: slashvibe.dev)
   - ✅ vibecodings (active: vibecodings.vercel.app)
   - ✅ vibestation (active: vibestation.guide)
   - ✅ letsvibe-fm (needs work: letsvibe.fm)

2. **Clean naming**:
   - GitHub: brightseth/vibe-platform ✅
   - Vercel: vibe-platform ✅
   - Local: ~/Projects/vibe (can rename later)

3. **Zero downtime**:
   - slashvibe.dev still works
   - No broken deployments

---

## Let's Vibe FM - Separate Task

**Problem:** Domain works, deployment succeeds, but returns 404
**Cause:** No website files exist yet
**Solution:** Need to build a landing page/podcast site

**Next steps (after cleanup):**
1. Create simple landing page in `~/Projects/lets-vibe-podcast/public/`
2. Add basic info: hosts, launch date, signup for updates
3. Deploy to letsvibe-fm Vercel project
4. Add podcast RSS feed when episodes are ready

**This is NOT part of the cleanup - separate feature work.**

---

## Ready to Execute?

**Checklist before starting:**
- [ ] Read this entire document
- [ ] Understand rollback procedures
- [ ] Have Vercel dashboard open
- [ ] Created backup file of current projects
- [ ] Confirmed slashvibe.dev is working right now

**When you're ready, start with Step 1 (backups) and work through in order.**

**Questions before proceeding?** Let's discuss any concerns.
