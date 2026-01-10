# Weekend Vercel Cleanup Plan - ARCHIVE Strategy

**Created:** Jan 10, 2026
**Execute:** When fresh and caffeinated
**Duration:** ~2-3 hours
**Philosophy:** ARCHIVE not DELETE - preserve for potential revival

---

## Your Current Context (from @seth)

**Active focus areas (Q1 2026):**
- ✅ Spirit Protocol token launch
- ✅ SOLIENNE daily manifesto automation (Art Dubai Apr 15-19)
- ✅ NODE opening (Jan 22-26 - 12 days away!)
- ✅ Relocation planning (SF → Hudson/Beacon/Europe Feb 2026)

**Recent ships (vibecodings shows 57 projects, 52 live):**
- Dec 27: MIYOMI Trading Dashboard
- Dec 26: 1943 Stockton, LIMEN, Relocation Dashboard
- Dec 26: Spirit Whitepaper rc7.1
- Dec 4: Dubai Proposals Hub, Agent V

**Ecosystem health:**
- 18 Spirit/Eden projects (mostly orphaned - need linking)
- 6 SOLIENNE projects (all active)
- 6 /vibe projects (2 duplicates to clean)
- 60 total Vercel projects, only 5 linked locally

---

## Phase 1: Safe /vibe Cleanup (30 min)

### Step 1A: Backup Current State (5 min)

```bash
cd ~/Desktop
mkdir vercel-backup-$(date +%Y%m%d)
cd vercel-backup-$(date +%Y%m%d)

# Save project list
vercel project ls > projects-before.txt

# Save domain mappings
vercel domains ls > domains-before.txt

# Verify production works
curl -I https://slashvibe.dev | grep "HTTP" > production-status.txt

# Screenshot Vercel dashboard (manual)
```

### Step 1B: Delete Duplicates (10 min)

**Project 1: vibe (duplicate of vibe-public)**

Via Vercel Dashboard:
1. Go to: https://vercel.com/sethvibes/vibe/settings/advanced
2. Scroll to "Delete Project"
3. Type: `vibe`
4. Click Delete

**Project 2: vibe-repo (broken, returns 404)**

Via Vercel Dashboard:
1. Go to: https://vercel.com/sethvibes/vibe-repo/settings/advanced
2. Type: `vibe-repo`
3. Click Delete

**Verify deletion:**
```bash
vercel project ls | grep "^  vibe " && echo "ERROR: vibe still exists" || echo "✓ vibe deleted"
vercel project ls | grep "vibe-repo" && echo "ERROR: vibe-repo still exists" || echo "✓ vibe-repo deleted"
```

### Step 1C: Rename for Consistency (5 min)

**vibe-public → vibe-platform**

Via Vercel Dashboard:
1. Go to: https://vercel.com/sethvibes/vibe-public/settings
2. Under "General" → "Project Name"
3. Change to: `vibe-platform`
4. Click Save

**Update local config:**
```bash
cd ~/Projects/vibe

# Edit .vercel/project.json
# Change "projectName": "vibe-public" → "projectName": "vibe-platform"
```

### Step 1D: Link Missing vibe Projects (5 min)

```bash
# Link vibestation
cd ~/Projects/vibestation
vercel link --project vibestation --confirm

# Link letsvibe-fm (podcast)
cd ~/Projects/lets-vibe-podcast
vercel link --project letsvibe-fm --confirm
```

### Step 1E: Verify Everything Works (5 min)

```bash
# Check production site
curl -I https://slashvibe.dev | grep "HTTP/2 200" && echo "✅ Production OK"

# Check vibestation
curl -I https://vibestation.guide | grep "HTTP/2 200" && echo "✅ Vibestation OK"

# Check deleted projects return 404
curl -I https://vibe-weld.vercel.app 2>&1 | grep -E "404|Could not" && echo "✅ Duplicate gone"
```

**After Phase 1:** 60 → 58 projects, vibe ecosystem clean ✅

---

## Phase 2: Archive Old Prototypes (45 min)

**Philosophy:** Vercel keeps deleted projects for 7 days. After that, they're gone forever. Archive preserves work while cleaning active dashboard.

### Candidates for Archival (need your review)

#### v0 Prototypes (29+ days old, pre-Spirit work)
| Project | Age | Last Deploy | Decision |
|---------|-----|-------------|----------|
| v0-image-analysis | 29d | Nov 11 | ⚠️ Archive? |
| v0-image-analysis-ln | 29d | Nov 11 | ⚠️ Archive? |
| v0-creative-documentation-approach | 29d+ | Oct? | ⚠️ Archive? |

**Check these first:**
```bash
# View v0 projects
vercel inspect v0-image-analysis.vercel.app
```

**If confirmed old, archive:**
- Delete from Vercel (Settings → Advanced → Delete)
- Projects stay in trash for 7 days
- Can restore from: https://vercel.com/sethvibes/deleted

#### Dynamic Prototypes (check if superseded)
| Project | Status | Superseded By? |
|---------|--------|----------------|
| amanda-dynamic-prototype | Unknown | Check path |
| solienne-dynamic-prototype | Unknown | Solienne v6.0? |

**Before archiving:**
```bash
# Check if these have unique code worth preserving
ls -la ~/Projects/ | grep -i amanda
ls -la ~/Projects/ | grep -i prototype
```

#### Potential Duplicates (need verification)
| Pair | Check |
|------|-------|
| design-critic-agent vs design-critic-real-ai | Same content? |
| stairs-website vs stairs-website-pdm4 | pdm4 = version 4? |
| mcp vs mcp-server | Same docs? |

**Verification script:**
```bash
# Compare deployment dates
vercel inspect design-critic-agent.vercel.app --json | jq '.createdAt'
vercel inspect design-critic-real-ai.vercel.app --json | jq '.createdAt'
```

### Safe Archival Process

**For each project to archive:**

1. **Document before archiving:**
   ```bash
   PROJECT_NAME="v0-image-analysis"
   vercel inspect ${PROJECT_NAME}.vercel.app --json > ~/Desktop/vercel-backup-$(date +%Y%m%d)/${PROJECT_NAME}-backup.json
   ```

2. **Check for local files:**
   ```bash
   ls -la ~/Projects/ | grep -i "${PROJECT_NAME}"
   ls -la ~/.Trash/ | grep -i "${PROJECT_NAME}"
   ```

3. **Archive via Vercel:**
   - Go to project settings → Advanced
   - Click Delete
   - **Recoverable for 7 days** at: https://vercel.com/sethvibes/deleted

4. **Document in archive log:**
   ```bash
   echo "$(date +%Y-%m-%d) Archived: ${PROJECT_NAME} - Reason: Old v0 prototype" >> ~/Desktop/vercel-backup-$(date +%Y%m%d)/ARCHIVE_LOG.txt
   ```

---

## Phase 3: Link Spirit/Eden Projects (60 min - CRITICAL)

**Problem:** 18 Spirit/Eden projects with ZERO local links
**Impact:** Can't deploy updates, don't know which code maps to which project

### Spirit Protocol Core (Priority 1)

```bash
# Link main Spirit site
cd ~/spiritprotocol.io
vercel link --project spiritprotocol.io --confirm

# Link Spirit Index
cd ~/spirit-sdk  # or wherever this lives
vercel link --project spirit-index --confirm

# Link Agent V
cd ~/Projects/agentv.spiritprotocol.io  # or wherever
vercel link --project agentv.spiritprotocol.io --confirm
```

### Eden Ecosystem Mapping (Priority 2)

**CRITICAL QUESTION:** Which Eden is production?

| Project | Guess | Check |
|---------|-------|-------|
| eden | Original? | `vercel inspect eden.vercel.app` |
| eden2 | Current? | `vercel inspect eden2.vercel.app` |
| eden2038 | Future? | `vercel inspect eden2038.vercel.app` |

**Before linking, determine:**
```bash
# Which domains point where?
vercel domains ls | grep eden

# Which was deployed most recently?
vercel project ls | grep eden

# Which local directory is the source?
ls -la ~/Projects/ | grep -i eden
ls -la ~/ | grep -i eden
```

**Once determined, link active Eden projects:**
```bash
# Example (adjust based on findings)
cd ~/eden-platform  # or wherever production code lives
vercel link --project eden2 --confirm  # or whichever is production

cd ~/Projects/eden-financial-dashboards
vercel link --project eden-financial-dashboards --confirm

cd ~/Projects/node-artist-relations
vercel link --project node-artist-relations --confirm
```

### SOLIENNE Projects (Priority 3)

```bash
# Link main Solienne site
cd ~/Projects/solienne-ai
vercel link --project solienne --confirm

# Link Spring 2026 (Art Dubai)
cd ~/Projects/solienne-spring-2026
vercel link --project solienne-spring-2026 --confirm
```

### Personal Sites (Priority 4)

```bash
cd ~/Projects/sethgoldstein.com
vercel link --project sethgoldstein.com --confirm

cd ~/Projects/sara-sauer
vercel link --project sara-sauer --confirm

cd ~/Projects/pm-agents
vercel link --project pm-agents --confirm
```

---

## Phase 4: Update Documentation (15 min)

### Update CLAUDE.md with New Structure

Add to `~/CLAUDE.md`:

```markdown
## Vercel Project Mapping (Jan 2026 Cleanup)

### /vibe Ecosystem
- vibe-platform (was vibe-public) → ~/Projects/vibe
- vibecodings → ~/Projects/vibecodings
- vibestation → ~/Projects/vibestation
- letsvibe-fm → ~/Projects/lets-vibe-podcast

### Spirit Protocol
- spiritprotocol.io → ~/spiritprotocol.io
- spirit-index → [TBD - find source]
- agentv.spiritprotocol.io → [TBD - find source]

### Eden (Production)
- [TBD - identify which Eden is production]
- eden-financial-dashboards → ~/Projects/eden-financial-dashboards
- node-artist-relations → ~/Projects/node-artist-relations

### SOLIENNE
- solienne → ~/Projects/solienne-ai
- solienne-spring-2026 → ~/Projects/solienne-spring-2026

### Personal
- sethgoldstein.com → ~/Projects/sethgoldstein.com
- sara-sauer → ~/Projects/sara-sauer
- pm-agents → ~/Projects/pm-agents

### Archived (Jan 10, 2026)
- vibe (duplicate)
- vibe-repo (broken)
- [add others as you archive them]
```

### Create Vercel Projects Inventory

```bash
cd ~/Projects/vibe
cat > VERCEL_PROJECTS_INVENTORY.md << 'EOF'
# Vercel Projects Inventory

**Last Updated:** $(date +%Y-%m-%d)
**Total Projects:** [count after cleanup]
**Linked Locally:** [count after linking]

## Active Projects by Ecosystem

[Paste cleaned-up list from Phase 3]

## Archived Projects

[List what you archived with dates and reasons]

EOF
```

---

## Success Criteria

After cleanup, you should have:

### Metrics
- ✅ **Projects:** 60 → ~45-50 (25% reduction)
- ✅ **Linked:** 5 → ~35-40 (7x improvement!)
- ✅ **Duplicates:** 0 (clean namespace)
- ✅ **Orphaned Spirit projects:** 0 (all linked)

### Outcomes
- ✅ Can deploy to any project from local directory
- ✅ Know which Vercel project serves which product
- ✅ No confusion about production vs old versions
- ✅ Archive log for potential project revival
- ✅ Updated CLAUDE.md with current structure

---

## Rollback Procedures

### If something breaks:

**Restore deleted project (within 7 days):**
1. Go to: https://vercel.com/sethvibes/deleted
2. Find the project
3. Click "Restore"

**Redeploy production:**
```bash
cd ~/Projects/vibe
vercel --prod --yes
```

**Revert Vercel project rename:**
1. Go to project settings
2. Rename back to original
3. Takes effect immediately

---

## Pre-Flight Checklist

Before starting, confirm:

- [ ] Read this entire document
- [ ] Well-rested and caffeinated
- [ ] Vercel dashboard open in browser
- [ ] Terminal ready
- [ ] ~2-3 hours available
- [ ] Understand which projects are critical (Spirit, SOLIENNE, NODE, vibe)
- [ ] Know that deleted projects are recoverable for 7 days

---

## Questions to Answer During Cleanup

Write answers in `~/Desktop/vercel-backup-$(date +%Y%m%d)/DECISIONS.txt`:

### Critical Decisions

1. **Which Eden is production?** (eden, eden2, eden2038)
   - Where is the source code?
   - Which domain(s) does it serve?
   - Answer: ___________________

2. **Spirit Protocol source locations:**
   - Where is spiritprotocol.io code? (~/spiritprotocol.io?)
   - Where is spirit-index code? (~/spirit-sdk?)
   - Where is agentv code?
   - Answers: ___________________

3. **Archive these old prototypes?** (Y/N for each)
   - [ ] v0-image-analysis (29d old)
   - [ ] v0-image-analysis-ln (29d old)
   - [ ] v0-creative-documentation-approach
   - [ ] amanda-dynamic-prototype
   - [ ] solienne-dynamic-prototype
   - [ ] design-critic-real-ai (if duplicate)
   - [ ] stairs-website-pdm4 (if duplicate)
   - [ ] relocation-deploy (if duplicate of relocation-dashboard)

4. **Generic project purposes:**
   - What is "website" project for? ___________________
   - What is "landing" project for? ___________________
   - Are "mcp" and "mcp-server" duplicates? ___________________

---

## Execution Order (Recommended)

**Saturday Morning (Fresh Start):**
1. ☕ Phase 1: vibe cleanup (30 min) - SAFE, well-documented
2. ☕ Phase 2: Archive old prototypes (45 min) - SAFE, 7-day recovery
3. 🍽️ Lunch break

**Saturday Afternoon:**
4. ☕ Phase 3: Link Spirit/Eden (60 min) - REQUIRES YOUR KNOWLEDGE
5. ☕ Phase 4: Update docs (15 min) - Document new structure

**Total:** 2.5 hours + breaks

---

## After Cleanup: Ongoing Maintenance

**New project checklist:**
- [ ] Create in Vercel
- [ ] Link locally: `vercel link --project [name]`
- [ ] Add to CLAUDE.md mapping
- [ ] Add to vibecodings if user-facing

**Before deleting any project:**
- [ ] Check vibecodings.json - is it catalogued?
- [ ] Check CLAUDE.md - is it referenced?
- [ ] Export deployment info: `vercel inspect [url] --json`
- [ ] Archive (don't permanently delete) first

---

## Help & Resources

**If stuck:**
- Full architecture analysis: `~/Projects/vibe/VERCEL_ARCHITECTURE_ANALYSIS.md`
- Detailed cleanup plan: `~/Projects/vibe/VERCEL_CLEANUP_PLAN.md`
- Rollback procedures: Above in this document

**Vercel CLI commands:**
```bash
vercel project ls                    # List all projects
vercel domains ls                    # List all domains
vercel inspect [url]                 # Get deployment info
vercel link --project [name]         # Link local dir to project
vercel --prod                        # Deploy to production
```

**Recovery:**
- Deleted projects: https://vercel.com/sethvibes/deleted (7 days)
- Previous deployments: Project page → Deployments tab → Promote
- Backup files: `~/Desktop/vercel-backup-YYYYMMDD/`

---

**Ready to execute?** Start when fresh. Take breaks. Archive (don't delete) when unsure. You've got this! 🚀
