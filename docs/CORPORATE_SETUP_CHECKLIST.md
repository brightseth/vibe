# /vibe Corporate Setup Checklist

**Status:** Planning
**Target:** Delaware C-Corp, 100% founder-owned
**Advisor Equity:** 10% to USV/Fred Wilson (incubation via Eden SAFE)

---

## THE STACK (Seth's Picks)

| Function | Service | Notes |
|----------|---------|-------|
| Entity Formation | **Otoco** | On-chain Delaware formation |
| Banking | **Mercury** | Startup-friendly, API access |
| Cards (Primary) | **Ramp** | Expense tracking, team cards |
| Cards (Backup) | **Brex** | If Ramp declines |
| Payments | **Stripe** | If needed for billing |
| Payroll | **Gusto** | When employees needed |
| Crypto/Treasury | **Coinbase** | On-ramp/off-ramp |
| Wallet Auth | **Privy** | Web3 auth infrastructure |
| Domains | **name.com** | Domain management |
| AI | **Claude** (Anthropic) | Already using |
| Code | **Git** (GitHub) | Already using |
| Deploy | **Vercel** | Already using |
| Agents | **Manus** | Multi-agent orchestration |

---

## GET A LAWYER FIRST

This checklist is for planning. Before executing:
- [ ] Consult startup lawyer (Fenwick, WSGR, or Gunderson)
- [ ] Consult tax advisor for equity grants
- [ ] Review Eden SAFE for any /vibe-related provisions

---

## Phase 1: Entity Formation (Otoco)

### On-Chain Delaware C-Corp
- [ ] Go to otoco.io
- [ ] Connect wallet (can use Privy for auth)
- [ ] Select Delaware C-Corp
- [ ] Company name: "Vibe Technologies, Inc." or "Slash Vibe, Inc."
- [ ] Authorized shares: 10,000,000 common
- [ ] Par value: $0.0001 per share
- [ ] Deploy on-chain (Base or Ethereum mainnet)
- [ ] Receive NFT representing ownership

### Otoco Benefits
- Fast (minutes, not days)
- On-chain record of incorporation
- Composable with DeFi/DAOs later
- Still legally valid Delaware entity

### Alternative: Traditional Formation
If prefer traditional route:
- Clerky ($799 + state fees)
- Stripe Atlas ($500, includes Mercury)

---

## Phase 2: Banking & Finance

### Mercury (Primary Banking)
- [ ] Apply at mercury.com
- [ ] Requires: EIN, Certificate of Incorporation
- [ ] Features: Free wires, API, team cards
- [ ] Timeline: 1-3 days after incorporation

### Ramp (Corporate Cards)
- [ ] Apply at ramp.com
- [ ] Requires: Mercury account funded
- [ ] Features: Auto-categorization, spend limits
- [ ] Track agent API costs separately
- [ ] Virtual cards for each service

### Brex (Backup)
- [ ] If Ramp declines (needs revenue history)
- [ ] More startup-friendly approval

### Coinbase (Crypto)
- [ ] Business account at coinbase.com/institutional
- [ ] For: Treasury management, crypto payments
- [ ] On-ramp/off-ramp USD <-> crypto

---

## Phase 3: Cap Table & Equity

### On-Chain Cap Table (via Otoco)
- [ ] Issue founder tokens on-chain
- [ ] 9,000,000 tokens to Seth (90%)
- [ ] 1,000,000 tokens reserved for USV grant (10%)
- [ ] Programmable vesting if needed

### USV/Fred Equity Grant
**NEEDS LAWYER REVIEW**

Options:
1. **Direct founder grant:** 1,000,000 shares (10%) at incorporation
   - Simple, clean
   - Fred pays tax on FMV (near $0 at founding)

2. **Advisor shares with vesting:** 4-year vest, 1-year cliff
   - More typical for advisors
   - Tax-efficient for recipient

3. **Token grant:** If doing on-chain cap table
   - 1,000,000 governance tokens
   - Can be vesting or immediate

**Recommendation:** Direct grant at founding if FMV is near zero.

---

## Phase 4: Auth & Infrastructure

### Privy (Wallet Auth)
- [ ] Sign up at privy.io
- [ ] For: User authentication with wallets
- [ ] Supports: Email, social, and wallet login
- [ ] Good for: Progressive web3 onboarding

### Stripe (Payments - if needed)
- [ ] Set up at stripe.com
- [ ] For: Subscription billing, if monetizing
- [ ] Can wait until revenue model clear

---

## Phase 5: Payroll & HR (When Needed)

### Gusto
- [ ] Set up when you have first employee
- [ ] Handles: Payroll, benefits, compliance
- [ ] Integrates with Mercury

---

## Phase 6: Operations

### Domains (name.com)
- [x] slashvibe.dev - owned
- [ ] vibe.inc or vibe.co - consider acquiring
- [ ] team@slashvibe.dev - set up email

### API Keys & Services
- [x] Anthropic: vibe-agents-jan26 (agents)
- [x] Anthropic: vibe-dev-jan26 (dev)
- [ ] Move to company Anthropic account
- [x] Neon Postgres - set up
- [ ] Vercel - transfer to company account

---

## Timeline

| Week | Action |
|------|--------|
| 1 | Lawyer consultation, decide on structure |
| 1 | Otoco formation (or Clerky if traditional) |
| 1 | Mercury application |
| 2 | EIN received, Mercury approved |
| 2 | On-chain cap table, issue shares |
| 2 | USV equity grant executed |
| 3 | Ramp cards, expense tracking |
| 3 | Transfer Vercel/services to company |
| 3 | Privy setup for wallet auth |

---

## Cost Estimate (Year 1)

| Item | Cost |
|------|------|
| Otoco formation | ~$300-500 + gas |
| Delaware franchise tax | $225 |
| Registered agent | $50/year |
| Mercury | Free |
| Ramp | Free |
| Gusto | ~$40/mo when needed |
| Lawyer (equity docs) | $2,000-5,000 |
| **Total** | ~$3,000-6,000 |

---

## Key Decisions Needed

1. **Company name:** "Vibe Technologies, Inc." vs "Slash Vibe, Inc."
2. **Formation method:** Otoco (on-chain) vs Clerky (traditional)
3. **USV equity structure:** Direct grant vs advisor shares vs tokens
4. **IP assignment:** Does Eden have any claim to /vibe IP?
5. **Timing:** Incorporate before or after raising?

---

## Why On-Chain Formation (Otoco)?

1. **Speed** - Minutes instead of days
2. **Cost** - Competitive with traditional
3. **Composability** - Can integrate with DeFi later
4. **Transparency** - On-chain record
5. **Aligned** - /vibe is building for AI agents, on-chain makes sense
6. **Future-proof** - Easy to add token-based governance

---

## Resources

- Otoco: https://otoco.io
- Mercury: https://mercury.com
- Ramp: https://ramp.com
- Brex: https://brex.com
- Coinbase: https://coinbase.com
- Privy: https://privy.io
- Gusto: https://gusto.com
- Stripe: https://stripe.com

---

*Last updated: 2026-01-08*
