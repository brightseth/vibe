# Vercel Project Organization Audit - January 2026

## Executive Summary

**Status:** 6 vibe-related Vercel projects found, **2 are duplicates/broken** and should be cleaned up.

**Impact:** Wasting deployment slots, causing confusion about which project is production, potential for accidental deployments to wrong project.

**Recommendation:** Delete 2 projects, rename 1 project, establish clear naming conventions.

---

## Current State

### Active & Correct Projects ✅

| Project Name | Domain | Purpose | Local Directory | Status |
|-------------|--------|---------|-----------------|--------|
| **vibe-public** | slashvibe.dev | /vibe platform (APIs + web) | ~/Projects/vibe | ✅ PRODUCTION |
| **vibecodings** | vibecodings-phi.vercel.app | Project directory showcase | ~/Projects/vibecodings | ✅ ACTIVE |
| **vibestation** | vibestation.guide | Hardware guide (Wirecutter style) | ~/Projects/vibestation | ✅ ACTIVE |

### Duplicate/Broken Projects ❌

| Project Name | Domain | Issue | Recommendation |
|-------------|--------|-------|----------------|
| **vibe** | vibe-weld.vercel.app | DUPLICATE of vibe-public, same content | 🗑️ DELETE |
| **vibe-repo** | vibe-repo-two.vercel.app | Returns 404, broken deployment | 🗑️ DELETE |
| **letsvibe-fm** | letsvibe.fm | Returns 404, podcast project abandoned? | 🗑️ DELETE or FIX |

### Unlinked Local Projects

| Local Directory | Vercel Status | Purpose |
|----------------|---------------|---------|
| ~/Projects/vibe-dashboard | Not linked | Unknown/abandoned? |
| ~/Projects/lets-vibe-podcast | Not linked | Podcast project |

---

## Problem Diagnosis

### Issue 1: Duplicate Deployments

**Problem:**
- `vibe-public` (correct) and `vibe` (old) both serve the same /vibe platform content
- Local directory `~/Projects/vibe` is linked to `vibe-public`, but project ID `prj_xoioGDbQzfnjY5PFvQqcdFOUmy5r` (the "vibe" project) is in `.vercel/project.json`

**What happened:**
1. Original deployment was to project named "vibe"
2. Later created "vibe-public" for production
3. Both still exist and get deployments
4. Recent rename to vibe-platform → need to clean this up

**Risk:**
- Confusion about which is production
- Wasting Vercel deployment quota
- Could deploy to wrong project accidentally

### Issue 2: Broken/Abandoned Projects

**Problem:**
- `vibe-repo` returns 404 (likely test project, never cleaned up)
- `letsvibe-fm` returns 404 (podcast project abandoned?)

**Risk:**
- Taking up project slots in Vercel dashboard
- DNS/domain pointing to broken site
- Confusion when browsing Vercel projects

### Issue 3: Inconsistent Naming

**Current naming:**
- Platform repo: `brightseth/vibe-platform` (just renamed)
- Vercel project: `vibe-public` (old name)
- Local directory: `~/Projects/vibe` (old name)

**Ideal naming (for consistency):**
- Platform repo: `brightseth/vibe-platform` ✅
- Vercel project: `vibe-platform` (rename needed)
- Local directory: `~/Projects/vibe` (keep as-is, or rename to vibe-platform)

---

## Recommended Actions

### Phase 1: Immediate Cleanup (5 minutes)

**DELETE these Vercel projects:**

1. **vibe** (prj_xoioGDbQzfnjY5PFvQqcdFOUmy5r)
   - Go to: https://vercel.com/sethvibes/vibe/settings/advanced
   - Scroll to "Delete Project"
   - Confirm deletion
   - **Why:** Duplicate of vibe-public, serves same content

2. **vibe-repo** (prj_nG2QwkI9ABQM900ifNrXBY0ZE4st)
   - Go to: https://vercel.com/sethvibes/vibe-repo/settings/advanced
   - Delete
   - **Why:** Returns 404, abandoned test project

3. **letsvibe-fm** (prj_pRRTJe7XNxmOwVxxaGxWncfMVavb) - KEEP & FIX
   - **Status:** Podcast is ACTIVE (launched Jan 8, 2026, launch Feb 10)
   - **Issue:** Domain exists but no website built yet
   - **Action:** Keep the Vercel project, need to build landing page
   - **Files:** Planning docs in `~/Projects/lets-vibe-podcast/` but no web frontend

### Phase 2: Rename for Consistency (2 minutes)

**RENAME Vercel project:**

1. **vibe-public → vibe-platform**
   - Go to: https://vercel.com/sethvibes/vibe-public/settings
   - Under "General" → "Project Name"
   - Rename to: `vibe-platform`
   - **Why:** Matches GitHub repo name (brightseth/vibe-platform)

2. **Update local .vercel/project.json**
   ```bash
   cd ~/Projects/vibe
   # Update projectName in .vercel/project.json from "vibe-public" to "vibe-platform"
   ```

### Phase 3: Optional Local Cleanup

**RENAME local directory (optional):**
```bash
cd ~/Projects
mv vibe vibe-platform
# Update any scripts/aliases that reference ~/Projects/vibe
```

**Benefit:** Full naming consistency across GitHub → Vercel → Local

**Risk:** May break existing terminal sessions, scripts, or Claude Code sessions pointing to old path

**Recommendation:** Do this later when you have time to update references

---

## After Cleanup: Ideal State

### Production Projects

| Local Directory | GitHub Repo | Vercel Project | Domain |
|----------------|-------------|----------------|--------|
| ~/Projects/vibe-platform | brightseth/vibe-platform | vibe-platform | slashvibe.dev |
| ~/Projects/vibecodings | brightseth/vibecodings | vibecodings | vibecodings.vercel.app |
| ~/Projects/vibestation | brightseth/vibestation | vibestation | vibestation.guide |

### Naming Convention Established

**Pattern:** `{product-name}` everywhere
- GitHub: `brightseth/{product-name}`
- Vercel: `{product-name}`
- Local: `~/Projects/{product-name}`
- Domain: `{product-name}.com` or custom

**Examples:**
- vibe-platform (slashvibe.dev custom domain)
- vibestation (vibestation.guide custom domain)
- vibecodings (default vercel.app subdomain)

---

## Vercel Project Quota

**Current usage:** 20+ projects deployed
**Vercel Hobby Plan Limit:** 100 projects
**Status:** ✅ Well within limits, but good to clean up anyway

---

## Execution Checklist

- [ ] Delete `vibe` project (duplicate)
- [ ] Delete `vibe-repo` project (broken)
- [ ] Decide on `letsvibe-fm` (delete or fix?)
- [ ] Rename `vibe-public` → `vibe-platform`
- [ ] Update `.vercel/project.json` locally
- [ ] (Optional) Rename `~/Projects/vibe` → `~/Projects/vibe-platform`
- [ ] Verify slashvibe.dev still works after cleanup
- [ ] Update CLAUDE.md with new paths if renamed locally

---

## Related Ecosystem Projects

For reference, here are other active Vercel projects in your ecosystem:

| Project | Domain | Purpose |
|---------|--------|---------|
| spiritprotocol.io | spiritprotocolio-ochre.vercel.app | Spirit Protocol landing |
| spirit-index | spiritindex.org | Spirit Protocol index |
| sara-sauer | sarasauer.com | Sara Sauer artist site |
| sethgoldstein.com | sethgoldstein.com | Personal site |
| pm-agents | pm-agents.vercel.app | PM agents project |
| airc | airc.chat | AIRC protocol site |

These are separate and should remain as-is.

---

**Next Step:** Start with Phase 1 (delete duplicates) - safest and highest impact cleanup.
