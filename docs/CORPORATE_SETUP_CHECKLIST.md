# /vibe Corporate Setup Checklist

**Status:** Planning
**Target:** Delaware C-Corp, 100% founder-owned
**Advisor Equity:** 10% to USV/Fred Wilson (incubation via Eden SAFE)

---

## ⚠️ GET A LAWYER FIRST

This checklist is for planning. Before executing:
- [ ] Consult startup lawyer (Clerky, Fenwick, WSGR, or Gunderson)
- [ ] Consult tax advisor for equity grants
- [ ] Review Eden SAFE for any /vibe-related provisions

---

## Phase 1: Entity Formation

### Option A: Clerky (Recommended for Speed)
- [ ] Create account at clerky.com
- [ ] Delaware C-Corp formation (~$799 + state fees)
- [ ] Includes: Certificate of Incorporation, Bylaws, Board Consent
- [ ] Registered agent included
- [ ] Stock purchase agreement templates

### Option B: Stripe Atlas
- [ ] Alternative if you want banking bundled
- [ ] $500 one-time fee
- [ ] Includes: Entity + Mercury account

### Documents Needed:
- [ ] Company name: "Vibe Technologies, Inc." or "Slash Vibe, Inc."
- [ ] Authorized shares: 10,000,000 common
- [ ] Par value: $0.0001 per share
- [ ] Founder: Seth Rosenberg (100% at founding → 90% after USV grant)

---

## Phase 2: Banking & Finance

### Mercury (Business Banking)
- [ ] Apply at mercury.com
- [ ] Requires: EIN, Certificate of Incorporation
- [ ] Features: Free wires, API, team cards
- [ ] Timeline: 1-3 days after incorporation

### Ramp (Corporate Cards)
- [ ] Apply at ramp.com
- [ ] Requires: Mercury account funded
- [ ] Features: Auto-categorization, spend limits per team member
- [ ] Good for tracking agent API costs separately

### Brex Alternative
- [ ] If Ramp declines (needs revenue history)
- [ ] More startup-friendly approval

---

## Phase 3: Cap Table & Equity

### Carta Setup
- [ ] Create company at carta.com
- [ ] Upload incorporation docs
- [ ] Issue founder shares (9,000,000 shares)
- [ ] File 83(b) election within 30 days!

### USV/Fred Equity Grant
**⚠️ NEEDS LAWYER REVIEW**

Options:
1. **Direct founder grant:** 1,000,000 shares (10%) at incorporation
   - Fred pays tax on FMV (should be near $0 at founding)
   - Simple, clean

2. **Advisor shares with vesting:** 4-year vest, 1-year cliff
   - More typical for advisors
   - Tax-efficient for recipient

3. **SAFE conversion:** If Eden SAFE has /vibe provisions
   - Need to review Eden docs
   - May require formal carve-out

**Recommendation:** Direct grant at founding if FMV is near zero. Talk to lawyer about optimal structure.

### 409A Valuation
- [ ] Not needed until you have employees with options
- [ ] Carta can do this (~$1,500)

---

## Phase 4: Payroll & HR (When Needed)

### Gusto
- [ ] Set up when you have first employee
- [ ] Handles: Payroll, benefits, compliance
- [ ] Integrates with Mercury

### Deel Alternative
- [ ] For international contractors
- [ ] Handles compliance globally

---

## Phase 5: Operations

### Domain & Email
- [ ] slashvibe.dev - already owned
- [ ] vibe.inc or vibe.co - consider acquiring
- [ ] team@slashvibe.dev - set up Google Workspace

### API Keys & Services
- [x] Anthropic API key: vibe-agents-jan26 (for agents)
- [x] Anthropic API key: vibe-dev-jan26 (for dev)
- [ ] Move to company Anthropic account
- [ ] Neon Postgres - already set up
- [ ] Vercel - transfer to company account

---

## Timeline

| Week | Action |
|------|--------|
| 1 | Lawyer consultation, decide on structure |
| 1 | Clerky incorporation |
| 1 | Mercury application |
| 2 | EIN received, Mercury approved |
| 2 | Carta setup, issue shares |
| 2 | 83(b) election filed |
| 2 | USV equity grant executed |
| 3 | Ramp cards, expense tracking |
| 3 | Transfer Vercel/services to company |

---

## Cost Estimate (Year 1)

| Item | Cost |
|------|------|
| Clerky incorporation | $799 |
| Delaware franchise tax | $225 |
| Registered agent | $50/year |
| Mercury | Free |
| Ramp | Free |
| Carta | Free tier |
| Gusto | ~$40/mo when needed |
| Lawyer (equity docs) | $2,000-5,000 |
| **Total** | ~$3,500-6,500 |

---

## Key Decisions Needed

1. **Company name:** "Vibe Technologies, Inc." vs "Slash Vibe, Inc."
2. **USV equity structure:** Direct grant vs advisor shares vs SAFE conversion
3. **IP assignment:** Does Eden have any claim to /vibe IP?
4. **Timing:** Incorporate before or after raising?

---

## Resources

- Clerky: https://clerky.com
- Mercury: https://mercury.com
- Ramp: https://ramp.com
- Carta: https://carta.com
- Gusto: https://gusto.com
- YC Standard Docs: https://www.ycombinator.com/documents

---

*Last updated: 2026-01-08*
