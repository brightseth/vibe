# Coinbase Developer Platform API Application

**Apply at**: https://www.coinbase.com/cloud/products/developer-platform

---

## Application Form Responses

Use these responses when filling out the CDP application:

### Basic Information

**Project Name**: /vibe

**Project Website**: https://slashvibe.dev

**GitHub**: https://github.com/brightseth/vibe

**Project Type**: Developer Tools / Social Infrastructure

---

### Project Description

**What are you building?**

```
/vibe is a terminal-native social layer for Claude Code users.
We're building economic infrastructure that enables AI agents
to autonomously manage wallets and execute transactions for
peer-to-peer services.

Key features:
- Smart wallets for developers and AI agents
- Session keys for autonomous transactions (agents can spend
  without approval prompts)
- Micropayment primitives (X402 protocol)
- Escrow for expertise marketplace (ping.money integration)
- Onchain reputation via attestations (EAS)
```

**Use Case**:

```
We're integrating CDP to enable:

1. WALLET CREATION
   - Auto-create smart wallets on Base when users initialize /vibe
   - GitHub OAuth → wallet (no seed phrases)
   - Account Abstraction (gasless transactions via paymaster)

2. AGENT AUTONOMY
   - Session keys: Users grant AI agents spending permissions
     (e.g., "$10 limit for 24 hours")
   - Agents can execute transactions without approval prompts
   - Critical for peer services (expert marketplace, content
     monetization)

3. MICROPAYMENTS
   - X402 pay-per-request primitive
   - USDC-based escrow for peer transactions
   - Revenue sharing with service providers

4. REPUTATION
   - Onchain attestations via EAS
   - Proof of expertise (GitHub activity → attestation)
   - Portable reputation across protocols
```

**Why CDP?**

```
CDP is uniquely suited for AI-native infrastructure:

- Smart Wallets: Account Abstraction out of the box (no EOA key
  management)
- Session Keys: Native support for delegated spending (critical
  for agent autonomy)
- Base L2: Low fees, USDC native, strong ecosystem
- Developer Experience: TypeScript SDK, great docs
- Alignment: Coinbase's vision for onchain economy aligns with
  our mission

Alternatives (Privy, Stripe) don't support session keys or AA
natively.
```

---

### Technical Details

**Expected Volume (First Month)**:
- 100-500 wallets
- 1,000-5,000 transactions
- Primarily small USDC transfers ($1-50)

**Expected Volume (3 Months)**:
- 1,000-2,500 wallets
- 10,000-25,000 transactions
- Growing marketplace activity

**Integration Method**:
- MCP server (Model Context Protocol for Claude Code)
- TypeScript/Node.js backend
- Next.js API routes
- Vercel deployment

**Network**: Base (Layer 2)

**Token**: USDC (native on Base)

---

### Technical Architecture

**How will you use CDP?**

```
WALLET LIFECYCLE:

1. User runs `vibe init @seth`
2. GitHub OAuth → userId
3. POST /api/wallet/create
   - CDP.createWallet({ userId, chain: 'base', accountAbstraction: true })
   - Store wallet data in KV
   - Return address to user
4. User can check balance, deposit, withdraw via commands

SESSION KEYS:

1. User runs `vibe session-key --limit 10`
2. Generate ephemeral keypair
3. Grant spending permission on smart wallet via CDP SDK
4. Store session key in KV with expiry
5. AI agent can now execute transactions autonomously:
   - createEscrow(expert, amount) → no approval needed
   - payForRequest(service, amount) → no approval needed
   - Agent checks remaining budget before transactions

SMART CONTRACTS:

We deploy custom contracts for:
- X402.sol: Micropayment primitive (pay-per-request)
- VibeEscrow.sol: Escrow for peer services
- ReputationAttestation.sol: EAS integration

Users' CDP smart wallets interact with these contracts via
session keys.
```

**Security Model**:

```
- Wallet private keys: Managed by CDP (MPC), never exposed
- Session keys: Time-bounded (24h), amount-bounded (user limit),
  contract-scoped
- User control: Can revoke session keys anytime
- Smart contracts: Audited, ReentrancyGuard, emergency withdraw
```

---

### Business Model

**How do you monetize?**

```
Platform fee on transactions:
- 2.5% on escrow transactions
- Revenue split with service providers (e.g., 50/50 with
  ping.money)
- Premium features (e.g., priority expert matching)

CDP integration enables this by making transactions seamless
(no manual wallet management, no approval fatigue).
```

---

### Contact Information

**Name**: Seth Goldstein

**Email**: seth@slashvibe.dev (or your preferred email)

**Role**: Founder / Technical Lead

**Twitter/X**: @brightseth

---

### Additional Context

**Why Base?**

```
- USDC native (no bridging)
- Low fees ($0.01 avg transaction)
- Strong ecosystem (Coinbase, Farcaster, etc.)
- Developer-friendly (EVM-compatible)
- Aligned with our target users (builders)
```

**Integration Timeline**:

```
Week 1: Wallet creation + balance checking
Week 2: Session keys + autonomous transactions
Week 3: Smart contract deployment + testing
Week 4: ping.money integration (expertise marketplace)
```

**Open Source**:

```
Yes - /vibe MCP server is open source
GitHub: https://github.com/brightseth/vibe

Smart contracts will be verified on Basescan.
```

---

## What to Expect After Applying

**Timeline**: 1-3 business days for approval

**What you'll receive**:
- CDP API key name
- CDP private key
- Base RPC endpoint
- Smart wallet factory contract address
- Paymaster contract address (for gasless transactions)
- Documentation access

**Next Steps After Approval**:
1. Add credentials to `.env`
2. Deploy smart contracts to Base
3. Test wallet creation
4. Implement session keys
5. Ship ping.money integration

---

## Questions They Might Ask

**Q: Why not use Coinbase Wallet SDK?**
A: We need programmatic wallet creation (GitHub OAuth → wallet) and session keys for AI agents. CDP provides server-side SDK for this.

**Q: What's your expected gas usage?**
A: Low - using Base L2 (~$0.01/tx) + paymaster for gasless UX. Estimated $50-200/month in gas for first 1,000 users.

**Q: How do you handle key management?**
A: CDP handles it via MPC. We never touch private keys. Users authenticate via GitHub OAuth, CDP maps userId → wallet.

**Q: Regulatory compliance?**
A: Non-custodial wallets (users control via GitHub auth). Peer-to-peer transactions (no money transmission). We're infrastructure, not financial service.

---

## Follow-Up Email Template

If you want to send a follow-up or clarification:

```
Subject: CDP API Application - /vibe (AI-Native Social Infrastructure)

Hi Coinbase Cloud team,

I submitted an application for CDP API access for /vibe, our
terminal-native social layer for Claude Code users.

Quick context:
- Building economic infrastructure for AI agents
- Need smart wallets + session keys for autonomous transactions
- Integrating expertise marketplace (ping.money) with escrow
- Target: 100-500 wallets in first month on Base

Happy to provide more details or jump on a call to discuss
the architecture.

Thanks!
Seth
```

---

**Ready to apply?** Visit: https://www.coinbase.com/cloud/products/developer-platform

Once approved, continue with `CDP_INTEGRATION_SETUP.md`.
