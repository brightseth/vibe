# Vercel Architecture Analysis - Complete Overview

## Executive Summary

**Total Vercel Projects:** 60
**Local Projects Linked:** 5 (only 8% of deployments!)
**Active Ecosystems:** 7 major areas
**Recommended for cleanup:** 15-20 projects (old prototypes, duplicates, abandoned)

---

## Current Architecture by Ecosystem

### 1. /vibe Ecosystem (6 projects)

| Project | Domain | Status | Action |
|---------|--------|--------|--------|
| **vibe-public** | slashvibe.dev | ✅ PRODUCTION | Rename → vibe-platform |
| **vibe** | vibe-weld.vercel.app | ❌ DUPLICATE | DELETE (dup of vibe-public) |
| **vibe-repo** | vibe-repo-two.vercel.app | ❌ BROKEN | DELETE (404) |
| **vibecodings** | vibecodings-phi.vercel.app | ✅ ACTIVE | Keep |
| **vibestation** | vibestation.guide | ✅ ACTIVE | Keep + link local |
| **letsvibe-fm** | letsvibe.fm | ⏳ NEEDS WORK | Keep + build site |

**Local mapping:**
- ✅ `~/Projects/vibe` → vibe-public
- ✅ `~/Projects/vibecodings` → vibecodings
- ❌ `~/Projects/vibestation` → NOT LINKED (should be)
- ❌ `~/Projects/lets-vibe-podcast` → NOT LINKED (should be)

---

### 2. Spirit Protocol Ecosystem (18 projects!)

**Core Platform:**
| Project | Domain | Purpose | Action |
|---------|--------|---------|--------|
| **spiritprotocol.io** | spiritprotocolio-ochre.vercel.app | Main landing | ✅ Keep |
| **spirit-index** | spiritindex.org | Protocol index | ✅ Keep |
| **agentv.spiritprotocol.io** | agentv.spiritprotocol.io | Agent viewer | ✅ Keep |
| **txs** | txs-alpha.vercel.app | Transaction explorer | ✅ Keep |

**Eden Projects (14!):**
| Project | Purpose | Status |
|---------|---------|--------|
| **eden** | Original Eden | ⚠️ Check if obsolete |
| **eden2** | Eden v2 | ⚠️ Check if obsolete |
| **eden2038** | Eden future version? | ❓ Unknown |
| **eden-academy** | Training platform | ✅ Active? |
| **eden-financial-dashboards** | Admin/metrics | ✅ Keep |
| **eden-gateway** | API gateway | ✅ Keep |
| **eden-genesis-registry** | Registry system | ✅ Keep |
| **eden-jobs** | Job queue | ✅ Keep |
| **automata** | Agent automation? | ❓ Check status |
| **miyomi-agent** | Specific agent | ❓ Check status |
| **miyomi-dashboard** | Agent dashboard | ❓ Check status |
| **nft-arena** | NFT marketplace? | ⚠️ Old project? |
| **ghost-x-bridge** | Social bridge | ✅ Keep (6d old) |
| **loancast** | ❓ Unknown | ❓ Check status |

**Local mapping:**
- ❌ `~/spirit-sdk` → NOT LINKED
- ❌ `~/spirit-contracts-core` → NOT LINKED
- ❌ `~/spiritprotocol.io` → NOT LINKED

**⚠️ MAJOR ISSUE:** 18 Spirit projects but NONE are linked to local directories!

---

### 3. SOLIENNE Ecosystem (6 projects)

| Project | Domain | Purpose | Action |
|---------|--------|---------|--------|
| **solienne** | solienne.ai | ✅ PRODUCTION | Keep |
| **solienne.ai** | solienneai.vercel.app | ❌ DUPLICATE? | Check if needed |
| **solienne-spring-2026** | solienne-spring-2026.vercel.app | Art Dubai prep | ✅ Keep |
| **solienne-gallery** | solienne-gallery.vercel.app | Gallery view | ✅ Keep |
| **solienne-ledger-proposal** | solienne-ledger-proposal.vercel.app | Partnership deck | ✅ Keep (18d) |
| **solienne-dynamic-prototype** | solienne-dynamic-prototype.vercel.app | Prototype | ⚠️ Check if obsolete |

**Local mapping:**
- ❌ `~/Projects/solienne-ai` → NOT LINKED
- ❌ `~/Projects/solienne-spring-2026` → NOT LINKED

---

### 4. NODE Foundation (1 project)

| Project | Domain | Purpose | Action |
|---------|--------|---------|--------|
| **node-artist-relations** | node-artist-relations.vercel.app | Artist pipeline | ✅ Keep |

**Local mapping:**
- ❌ `~/Projects/node-artist-relations` → NOT LINKED

---

### 5. AIRC Protocol (2 projects)

| Project | Domain | Purpose | Action |
|---------|--------|---------|--------|
| **airc** | airc.chat | Protocol site | ✅ Keep |
| **mcp** | mcp-sethvibes.vercel.app | MCP docs? | ⚠️ Check purpose |
| **mcp-server** | mcp-server-sethvibes.vercel.app | MCP server docs? | ⚠️ Duplicate of mcp? |

**Local mapping:**
- ❌ `~/Projects/airc` → NOT LINKED
- ❌ `~/Projects/airc-mcp` → NOT LINKED

---

### 6. Personal/Portfolio (7 projects)

| Project | Domain | Purpose | Action |
|---------|--------|---------|--------|
| **sethgoldstein.com** | sethgoldstein.com | Personal site | ✅ Keep |
| **sara-sauer** | sarasauer.com | Sara artist site | ✅ Keep |
| **pm-agents** | pm-agents.vercel.app | PM project | ✅ Keep |
| **website** | website-sethvibes.vercel.app | ❓ Generic name | ⚠️ Check purpose |
| **landing** | landing-sethvibes.vercel.app | ❓ Generic name | ⚠️ Check purpose |
| **agentgram** | agentgram.vercel.app | Social for agents? | ✅ Keep (4d) |
| **agents-sdk** | agents-sdk-nine.vercel.app | SDK docs | ✅ Keep |

**Local mapping:**
- ❌ `~/Projects/sethgoldstein.com` → NOT LINKED
- ❌ `~/Projects/sara-sauer` → NOT LINKED
- ❌ `~/Projects/pm-agents` → NOT LINKED
- ❌ `~/Projects/agentgram` → NOT LINKED

---

### 7. Relocation / Real Estate (3 projects)

| Project | Domain | Purpose | Action |
|---------|--------|---------|--------|
| **relocation-dashboard** | relocation-dashboard.vercel.app | Planning tool | ✅ Keep |
| **relocation-deploy** | relocation-deploy.vercel.app | ❌ DUPLICATE? | Check vs dashboard |
| **1943-stockton** | 1943-stockton.vercel.app | Specific property? | ✅ Keep |

---

### 8. Experimental / Prototypes (12 projects)

| Project | Last Updated | Likely Status |
|---------|--------------|---------------|
| **v0-image-analysis** | 29d | ⚠️ Old v0 prototype |
| **v0-image-analysis-ln** | 29d | ⚠️ Old v0 prototype |
| **v0-creative-documentation-approach** | 29d+ | ⚠️ Old v0 prototype |
| **amanda-dynamic-prototype** | ❓ | ⚠️ Old prototype |
| **design-critic-agent** | ❓ | ⚠️ Check if active |
| **design-critic-real-ai** | ❓ | ⚠️ Duplicate? |
| **dubai-proposals** | 25d | Art Dubai prep, keep for now |
| **symbient-world-congress** | 5d | Recent, likely active |
| **limen** | 14d | ❓ Check purpose |
| **stairs-website** | ❓ | ❓ Unknown |
| **stairs-website-pdm4** | ❓ | ❌ Likely duplicate |
| **7colores-deploy** | 11d | ❓ Client project? |

---

### 9. Misc / Uncategorized (5 projects)

| Project | Purpose |
|---------|---------|
| **ai-state-sale** | ❓ Unknown |
| **silicon-alley-genealogy** | Recent (4h), likely active |
| **goldylocks-site** | ❓ Unknown |
| **clothingmachine** | ❓ Unknown |

---

## Critical Problems Identified

### Problem 1: Massive Linking Gap (CRITICAL)

**Only 5 of 60 projects are linked to local directories.**

**Impact:**
- Can't easily deploy updates to 55 projects
- Don't know which local code maps to which Vercel deployment
- Risk of deploying wrong code to production
- Hard to maintain and update projects

**Solution:** Create `.vercel/project.json` files in local directories

---

### Problem 2: Spirit Protocol Orphaned (HIGH PRIORITY)

**18 Spirit/Eden projects with ZERO local links**

**Questions:**
- Where is the source code for these deployed from?
- Are they deployed from different machines?
- Are some duplicates/abandoned?

**Action needed:**
- Map each Spirit project to its source
- Link local directories (spirit-sdk, spiritprotocol.io, etc.)
- Identify and delete obsolete Eden versions (eden vs eden2 vs eden2038)

---

### Problem 3: Duplicate Projects

**Confirmed duplicates:**
- `vibe` + `vibe-public` (same content)
- `solienne` + `solienne.ai` (likely same)
- `mcp` + `mcp-server` (likely same docs)
- `relocation-dashboard` + `relocation-deploy` (likely same)
- `design-critic-agent` + `design-critic-real-ai` (likely same)
- `stairs-website` + `stairs-website-pdm4` (likely same)

**Estimated waste:** 6+ duplicate projects

---

### Problem 4: Abandoned Prototypes

**Old v0 prototypes (29d+):**
- v0-image-analysis
- v0-image-analysis-ln
- v0-creative-documentation-approach
- amanda-dynamic-prototype
- solienne-dynamic-prototype

**Likely safe to delete:** 5+ old prototypes

---

### Problem 5: Generic Names

**Unclear purposes:**
- `website` (which website?)
- `landing` (landing for what?)
- `eden` vs `eden2` vs `eden2038` (which is production?)

**Impact:** Confusion, hard to manage, risk of mistakes

---

## Recommended Architecture Cleanup Plan

### Phase 1: Immediate Deletions (Low Risk)

**Delete these 10 projects:**

1. ✅ `vibe` - duplicate of vibe-public
2. ✅ `vibe-repo` - broken (404)
3. ⚠️ `v0-image-analysis` - old prototype (29d)
4. ⚠️ `v0-image-analysis-ln` - old prototype (29d)
5. ⚠️ `v0-creative-documentation-approach` - old prototype
6. ⚠️ `amanda-dynamic-prototype` - old prototype
7. ⚠️ `solienne-dynamic-prototype` - old prototype
8. ⚠️ `stairs-website-pdm4` - likely duplicate
9. ⚠️ `relocation-deploy` - likely duplicate of relocation-dashboard
10. ⚠️ `design-critic-real-ai` - likely duplicate of design-critic-agent

**After Phase 1:** 60 → 50 projects

---

### Phase 2: Link Local Directories (CRITICAL)

**High priority linkings:**

**Spirit Protocol (must do):**
```bash
cd ~/spiritprotocol.io
vercel link --project spiritprotocol.io

cd ~/spirit-sdk
# Determine which Vercel project this maps to

# Map each Eden project to source
```

**Personal sites:**
```bash
cd ~/Projects/sethgoldstein.com
vercel link --project sethgoldstein.com

cd ~/Projects/sara-sauer
vercel link --project sara-sauer

cd ~/Projects/node-artist-relations
vercel link --project node-artist-relations
```

**vibe ecosystem:**
```bash
cd ~/Projects/vibestation
vercel link --project vibestation

cd ~/Projects/lets-vibe-podcast
vercel link --project letsvibe-fm
```

---

### Phase 3: Rename for Clarity

**Rename these projects:**

1. `vibe-public` → `vibe-platform` (consistency with GitHub)
2. `website` → `[specific-name]` (what is this?)
3. `landing` → `[specific-name]` (landing for what?)
4. `mcp` → `mcp-docs` or delete if duplicate

---

### Phase 4: Eden Ecosystem Audit (HIGH PRIORITY)

**Questions to answer:**

1. Which Eden is production? (eden, eden2, eden2038?)
2. Where is source code for each?
3. Which can be archived/deleted?
4. What's the purpose of each component?

**Eden projects to audit:**
- [ ] eden (original?)
- [ ] eden2 (current?)
- [ ] eden2038 (future?)
- [ ] eden-academy (active)
- [ ] eden-financial-dashboards (active)
- [ ] eden-gateway (active)
- [ ] eden-genesis-registry (active)
- [ ] eden-jobs (active)

---

### Phase 5: Establish Naming Conventions

**Pattern:** `{ecosystem}-{component}-{variant}`

**Examples:**
- vibe-platform (not vibe-public)
- spirit-protocol-landing (not spiritprotocol.io)
- eden-platform-v2 (not eden2)
- solienne-production (not solienne.ai)

---

## Priority Actions (Do First)

### 1. Link Spirit Protocol Projects (TODAY)

**Why urgent:** 18 projects orphaned, highest risk area

**Steps:**
1. List all Spirit/Eden project source locations
2. Run `vercel link` in each directory
3. Document mapping in CLAUDE.md

---

### 2. Delete vibe Duplicates (TODAY)

**Low risk, high clarity benefit:**
- Delete `vibe` (duplicate)
- Delete `vibe-repo` (broken)
- Rename `vibe-public` → `vibe-platform`

---

### 3. Audit Old Prototypes (THIS WEEK)

**Check these before deleting:**
- v0-* projects (29d old)
- amanda-dynamic-prototype
- solienne-dynamic-prototype
- design-critic-* duplicates

---

### 4. Eden Architecture Review (THIS WEEK)

**Critical for Spirit Protocol health:**
- Which Eden is production?
- Where's the source code?
- What can be archived?

---

## Healthy End State

**After cleanup:**
- **~45-50 projects** (down from 60)
- **~35-40 linked** to local directories (up from 5!)
- **Clear naming** (no "website", "landing", etc.)
- **No duplicates**
- **Documented** ecosystem map

---

## Questions to Answer Before Proceeding

1. **Spirit Protocol:** Where is source code for the 18 Spirit/Eden projects?
2. **Eden versions:** Which Eden (eden/eden2/eden2038) is production?
3. **Generic projects:** What is "website" and "landing" for?
4. **Duplicates:** Confirm mcp vs mcp-server, solienne vs solienne.ai are duplicates
5. **Old prototypes:** Safe to delete v0-* projects from 29+ days ago?

---

## Next Steps

**Recommendation:** Do this in order:

1. **Today:** Review this document, answer questions above
2. **Today:** Delete vibe duplicates (safe, quick win)
3. **This week:** Link Spirit Protocol projects (critical for maintainability)
4. **This week:** Audit and delete old prototypes
5. **Next week:** Eden ecosystem review and cleanup
6. **Ongoing:** Establish and enforce naming conventions

---

**Total time investment:**
- Initial cleanup: 2-3 hours
- Full architecture fix: 1-2 days
- Long-term benefit: Massive (clear architecture, easy deployments, no confusion)
