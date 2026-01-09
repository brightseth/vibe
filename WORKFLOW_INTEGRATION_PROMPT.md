# Session Launcher Workflow Integration

**Context:** You now have 13 context-aware Claude Code launchers set up. This prompt helps you internalize them into your daily workflow.

---

## The Core Habit

**Before opening a terminal, ask:**
*"What context am I working in?"*

Then type that alias instead of `claude`.

---

## Integration Strategy

### Week 1: Learn the aliases
Print this and keep visible:
```
airc              - AIRC protocol
vibe-user         - User-facing /vibe
vibe-agents       - Agent coordination
vibe-dev          - General /vibe dev

spirit            - Spirit Protocol
spirit-index      - Spirit Index
solienne          - Solienne manifesto
nodeopening       - NODE (20 days!)
vibestation       - Vibestation

seth              - Personal
goldybox          - Goldybox
kristiseth        - Kristi work
```

Type `sessions` in any terminal to see this list.

### Week 2: Build the muscle memory

**Morning routine:**
1. Open terminal 1 → type `airc` (AIRC work)
2. Open terminal 2 → type `nodeopening` (NODE prep)
3. Open terminal 3 → type `spirit` (Spirit Protocol)

Each window now has a clear title. No more "which project was I in?"

### Week 3: Context switching

When you switch contexts mid-day:
- Close the terminal (or background it)
- Open new terminal
- Type the new context alias

The title tells you immediately if you're in the right place.

---

## The Payoff

**Before:**
```bash
# Opens terminal
cd ~/Projects/vibe
# wait, was I doing AIRC or user features?
# checks git branch, looks at files
claude
```

**After:**
```bash
# Opens terminal
airc
# Title says "AIRC Development"
# Already in right directory
# Already using right API key
# Brain instantly in right context
```

---

## Power User Tips

**Split terminals by context:**
```
iTerm/Terminal Layout:
┌─────────────┬─────────────┐
│ AIRC Dev    │ NODE Opening│
│             │             │
├─────────────┼─────────────┤
│ Spirit      │ Personal    │
│             │             │
└─────────────┴─────────────┘
```

**Quick context check:**
Just glance at terminal title bar. No need to `pwd` or check git branch.

**API cost tracking:**
- `airc` uses separate key → separate billing
- Easy to see what AIRC development costs you

---

## Customization Points

**Add API keys per context:**
```bash
# Edit ~/.zshrc
alias solienne='cd ~/Projects/solienne-ai && export ANTHROPIC_API_KEY="sk-ant-solienne-key" && set_title "SOLIENNE" && claude'
```

**Add more contexts:**
```bash
alias eden='cd ~/eden-academy && set_title "EDEN" && claude'
```

**Chain with other tools:**
```bash
alias spirit='cd ~/spiritprotocol.io && git pull && set_title "SPIRITPROTOCOL" && claude'
```

---

## Key Question to Ask Yourself

**When you open 4 terminal windows today:**
- Will you be able to tell them apart?
- Will you remember which project context each one is in?

If not, this system solves that.

---

## Try This Today

1. Close all terminal windows
2. Open 3 new ones
3. Type: `airc`, `nodeopening`, `spirit`
4. Look at the titles
5. Work for an hour
6. Notice how you never lose context

---

**The real win:** You spend less cognitive load tracking "where am I?" and more on actual work.

---

*Review this in Week 2 to see if the aliases stuck. Adjust names if something feels awkward.*
