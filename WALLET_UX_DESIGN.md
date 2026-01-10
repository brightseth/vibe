# Wallet UX Design: Ambient Crypto

**Philosophy**: Wallets should emerge naturally when economically needed, stay invisible otherwise.

---

## User Experience Principles

1. **Zero upfront friction** - No wallet creation on init
2. **Just-in-time provisioning** - Create only when transacting
3. **Ambient by default** - Crypto stays invisible until relevant
4. **Clear value prop** - Surface wallet when user earns or spends

---

## User Journeys

### Journey 1: Social-Only User (No Wallet Needed)

```bash
vibe init @alice
# ✓ Identity created
# ✓ Can message, ship, vibe
# No wallet created
# No crypto mentioned
```

**Result**: Alice uses /vibe for months, never sees wallet. Perfect.

---

### Journey 2: Receiving Payment First

```bash
vibe init @bob
# ✓ Identity created
# No wallet yet

# Later: @alice pays Bob $10 for WebSocket help
# System detects Bob has no wallet
# Creates wallet silently in background
# Payment arrives

# Bob sees:
💰 You earned $10!

Your wallet: 0xabcd...1234
Balance: $10.00 USDC

Commands:
  vibe wallet         # View balance
  vibe wallet withdraw # Send to Coinbase/bank
```

**Result**: Bob discovers wallet through earning. Clear value, zero setup burden.

---

### Journey 3: Sending Payment First

```bash
vibe init @charlie
# ✓ Identity created
# No wallet yet

vibe ask-expert "How do I fix WebSocket memory leaks?"
# Expert found: @alice ($10, online, shipped 3 WebSocket projects)
#
# System prompt:
To pay @alice $10, we'll set up a wallet for you.

This takes ~2 seconds and lets Claude handle payments automatically.

Your wallet will be created on Base (Coinbase's L2).
Funds: $0 → we'll walk you through depositing.

[Continue] [Learn More]

# User clicks Continue
# Wallet created (2 sec)
# Shows deposit options

💳 Deposit $10 to pay @alice

Options:
1. Coinbase → instant transfer
2. Bridge from Ethereum/Base
3. Send USDC to: 0xef12...5678

[Deposit] [Skip for Now]
```

**Result**: Charlie sees wallet creation as enabling payment, not abstract crypto setup.

---

## Implementation Flow

### Phase 1: Init (Zero Crypto)

```javascript
// POST /api/users/init
{
  handle: "@alice",
  githubId: "12345",
  email: "alice@example.com"
}

// Database:
INSERT INTO users (handle, github_id, email, wallet_address)
VALUES ('@alice', '12345', 'alice@example.com', NULL)

// Response:
{
  success: true,
  handle: "@alice",
  message: "Welcome to /vibe!"
}
```

**No wallet created yet.**

---

### Phase 2: First Transaction Trigger

**Scenario A: User wants to send payment**

```javascript
// vibe ask-expert "WebSocket help"
// Expert found, user approves payment

async function ensureWallet(handle) {
  const user = await db.users.findOne({ handle });

  if (user.wallet_address) {
    return user.wallet_address; // Already exists
  }

  // Create wallet just-in-time
  console.log(`Creating wallet for ${handle}...`);

  const wallet = await cdp.createSmartWallet(user.github_id, handle);

  await db.users.update({
    where: { handle },
    data: {
      wallet_address: wallet.address,
      wallet_created_at: new Date()
    }
  });

  return wallet.address;
}

// Then proceed with payment
const senderWallet = await ensureWallet('@charlie');
const escrow = await createEscrow(senderWallet, '@alice', 10);
```

**Scenario B: User receives payment**

```javascript
// @alice pays @bob for help
async function payUser(recipient, amount) {
  const user = await db.users.findOne({ handle: recipient });

  if (!user.wallet_address) {
    // Silently create wallet for recipient
    const wallet = await cdp.createSmartWallet(user.github_id, recipient);

    await db.users.update({
      where: { handle: recipient },
      data: {
        wallet_address: wallet.address,
        wallet_created_at: new Date()
      }
    });

    // Notify recipient
    await notifyNewWallet(recipient, wallet.address, amount);
  }

  // Send payment
  await transferUSDC(wallet.address, amount);
}
```

---

### Phase 3: Wallet Commands (Only Show When Relevant)

**vibe wallet** - Only works if wallet exists or balance > 0

```javascript
// mcp-server/tools/wallet.js

async function handler(args) {
  const user = await db.users.findOne({ handle: currentUser });

  if (!user.wallet_address) {
    return {
      message: `No wallet yet!

You'll get a wallet automatically when:
  • Someone pays you
  • You pay for a service (like ping.money expert help)

Want to create one now? Run: vibe wallet create
`
    };
  }

  const balance = await cdp.getBalance(user.wallet_address);

  return {
    address: user.wallet_address,
    balance: `$${balance.toFixed(2)} USDC`,
    network: 'Base',
    commands: [
      'vibe wallet deposit   # Add funds',
      'vibe wallet withdraw  # Send to bank/Coinbase',
      'vibe wallet history   # Transaction log'
    ]
  };
}
```

---

## Database Schema

```sql
-- Users table (add wallet columns)
ALTER TABLE users
ADD COLUMN wallet_address TEXT,
ADD COLUMN wallet_created_at TIMESTAMP,
ADD COLUMN github_id TEXT UNIQUE;

-- Index for lookups
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_github ON users(github_id);

-- Wallet events (track creation, deposits, withdrawals)
CREATE TABLE wallet_events (
  id SERIAL PRIMARY KEY,
  handle TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'created', 'first_deposit', 'first_payment'
  amount NUMERIC(20, 6),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## MCP Tools

### vibe wallet (existing, but conditional)

```javascript
// Only show if wallet exists or transactions happened
if (!user.wallet_address && !user.has_transactions) {
  return "No wallet yet. You'll get one when you transact.";
}
```

### vibe wallet create (explicit opt-in)

```javascript
// For users who want wallet upfront
async function createWallet(handle) {
  const user = await ensureWallet(handle);
  return {
    success: true,
    address: user.wallet_address,
    message: `Wallet created on Base!

Address: ${user.wallet_address}
Network: Base (Coinbase L2)

Deposit USDC to start transacting.
`
  };
}
```

### vibe ask-expert (payment flow)

```javascript
// When user approves expert payment:
async function payExpert(expert, amount) {
  // 1. Ensure sender has wallet
  const senderWallet = await ensureWallet(currentUser);

  // 2. Check balance
  const balance = await cdp.getBalance(senderWallet);

  if (balance < amount) {
    return {
      error: 'Insufficient funds',
      balance: `$${balance.toFixed(2)}`,
      needed: `$${amount.toFixed(2)}`,
      actions: ['Deposit USDC', 'Cancel']
    };
  }

  // 3. Create escrow
  const escrow = await createEscrow(senderWallet, expert, amount);

  return {
    success: true,
    escrowId: escrow.id,
    message: `Payment sent to @${expert}!`
  };
}
```

---

## Success Metrics

**Ambient UX is working if:**
- ✅ 50%+ of users never see wallet (social-only usage)
- ✅ 90%+ of first wallet creations happen during transaction
- ✅ <5% of users ask "what's a wallet?" or "do I need crypto?"
- ✅ Wallet creation adds <3 seconds to first transaction

**Ambient UX is failing if:**
- ❌ Users confused about wallet on init
- ❌ Wallets created but never used (>30% unused rate)
- ❌ Users abandon at wallet creation step

---

## Migration Path

**Week 1: Database schema**
- Add wallet_address, github_id columns
- Backfill github_id from existing OAuth data

**Week 2: Lazy wallet creation**
- Implement ensureWallet() helper
- Update payment flows to call ensureWallet()
- Test with @testuser accounts

**Week 3: Polish & monitoring**
- Add wallet discovery notifications
- Track wallet creation funnel
- Refine messaging based on feedback

---

## FAQ

**Q: What if user wants wallet upfront?**
A: `vibe wallet create` - Explicit opt-in available

**Q: Can users receive payments before they init?**
A: No - must run `vibe init` first to register handle

**Q: What about gas fees?**
A: Smart wallets on Base = gasless via paymaster. User never pays gas.

**Q: Security of auto-created wallets?**
A: CDP manages keys via MPC. Users authenticate with GitHub OAuth.

**Q: Can users export private keys?**
A: Not initially. CDP = custodial smart wallets. Could add export later.

---

**TL;DR**: Wallets created just-in-time, not upfront. Crypto stays invisible until economically necessary. Best of both worlds: zero friction for social users, seamless payments for transactions.
