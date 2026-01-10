# Ambient Crypto Implementation

**Status**: Ready for testing
**Date**: 2026-01-10
**Philosophy**: Wallets emerge when needed, stay invisible otherwise

---

## What We Built

### Core Components

**1. Wallet Helpers** (`lib/cdp/wallet-helpers.js`)
- `ensureWallet()` - Lazy wallet creation
- `getWalletAddress()` - Check if wallet exists
- `hasWallet()` - Boolean check
- `getBalance()` - USDC balance on Base
- `notifyNewWallet()` - User notifications

**2. MCP Tool** (`mcp-server/tools/wallet.js`)
- `vibe wallet` - View status/balance
- `vibe wallet create` - Explicit opt-in
- `vibe wallet deposit` - Funding instructions
- `vibe wallet withdraw` - Send to Coinbase/bank
- `vibe wallet history` - Transaction log

**3. Database Schema** (`api/migrations/add-wallet-columns.sql`)
- `users.wallet_address` - Smart wallet address (nullable)
- `users.wallet_created_at` - Creation timestamp
- `users.github_id` - OAuth identifier
- `wallet_events` - Transaction history

**4. Smart Contracts** (Deployed on Base Sepolia)
- `X402Micropayments` - Pay-per-request primitive
- `VibeEscrow` - Peer-to-peer escrow

---

## User Experience Flows

### Flow 1: Social-Only User (No Wallet)

```bash
$ vibe init @alice
✓ Identity created
✓ Can message, ship, vibe

$ vibe who
@bob (online, shipped 3 projects)
@charlie (deep mode, working on API)

$ vibe dm @bob "hey!"
✓ Message sent

# Weeks pass, Alice never sees wallet
# Perfect UX - crypto stayed invisible
```

---

### Flow 2: User Receives Payment First

```bash
$ vibe init @bob
✓ Identity created

# Later: @alice pays Bob $10 for WebSocket debugging help
# System creates wallet silently in background

$ vibe inbox
💰 New notification from system:

You just earned $10!

Your /vibe wallet was created to receive payment.

Address: 0xabcd...1234
Network: Base (Coinbase L2)

Commands:
  vibe wallet         # View balance
  vibe wallet withdraw # Send to Coinbase/bank

$ vibe wallet
💰 Your /vibe Wallet

Address: 0xabcd...1234
Balance: $10.00 USDC
Network: Base (Coinbase L2)

Recent activity:
  created      $0.00    Jan 10
  received     $10.00   Jan 10
```

---

### Flow 3: User Wants to Pay (First Transaction)

```bash
$ vibe init @charlie
✓ Identity created

$ vibe ask-expert "How do I fix WebSocket memory leaks?"
Expert found: @alice
  • $10/question
  • Online now
  • Shipped 3 WebSocket projects
  • Helped 12 people, 4.8⭐

To pay @alice, we'll set up a wallet for you.

This takes ~2 seconds and lets Claude handle payments automatically.
Your wallet will be created on Base (Coinbase's L2).

Current balance: $0
You'll need to deposit $10 to continue.

[Create Wallet & Deposit] [Cancel]

# User clicks Create Wallet & Deposit
# Wallet created (2 sec)

✓ Wallet created!

Address: 0xef12...5678
Balance: $0.00 USDC

To pay @alice $10, deposit USDC:

Options:
1. Coinbase → instant transfer
2. Bridge from Ethereum
3. Send USDC to: 0xef12...5678

[I've Deposited] [Cancel]

# User deposits via Coinbase
# 30 seconds later

✓ Deposit confirmed: $15.00 USDC

Creating escrow for @alice...
✓ Payment sent!

@alice will be notified and can answer your question.
Funds released when you approve the answer (or after 48h timeout).
```

---

## Technical Implementation

### 1. Lazy Wallet Creation

**Before (Bad UX):**
```javascript
// vibe init always creates wallet
async function init(handle, githubId) {
  const wallet = await cdp.createWallet(githubId); // Always create
  await db.users.create({ handle, wallet: wallet.address });
}
// Problem: Creates infrastructure users may never use
```

**After (Ambient UX):**
```javascript
// vibe init just stores identity
async function init(handle, githubId) {
  await db.users.create({
    handle,
    github_id: githubId,
    wallet_address: null // No wallet yet!
  });
}

// Wallet created on first transaction
async function payExpert(sender, recipient, amount) {
  const senderWallet = await ensureWallet(sender, 'payment');
  // Creates wallet only if doesn't exist
  // Returns existing address otherwise

  await createEscrow(senderWallet, recipient, amount);
}
```

---

### 2. Database Schema

```sql
-- Users table (wallet columns nullable)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  github_id TEXT UNIQUE,
  wallet_address TEXT,            -- Null until first transaction
  wallet_created_at TIMESTAMP,    -- When wallet was created
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wallet events (track lifecycle)
CREATE TABLE wallet_events (
  id SERIAL PRIMARY KEY,
  handle TEXT NOT NULL,
  event_type TEXT NOT NULL,       -- 'created', 'deposit', 'payment_sent', etc.
  amount NUMERIC(20, 6),          -- USDC (6 decimals)
  transaction_hash TEXT,          -- Blockchain tx hash
  metadata JSONB,                 -- Context (reason, source, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3. MCP Tool Integration

**Add to `mcp-server/index.js`:**

```javascript
const vibeWallet = require('./tools/wallet');

server.addTool({
  name: vibeWallet.name,
  description: vibeWallet.description,
  parameters: vibeWallet.parameters,
  handler: async (args, context) => {
    return await vibeWallet.handler(args, context);
  },
});
```

---

### 4. Payment Flow Integration

**Example: ping.money expert payments**

```javascript
// prototypes/ping-integration/vibe_route_to_ping.js

const { ensureWallet, getBalance } = require('../../lib/cdp/wallet-helpers');
const { createEscrow } = require('../../lib/cdp/escrow');

async function routeToPingWithSmartContract(data) {
  const { expert, question, amount, asker } = data;

  // 1. Ensure asker has wallet (lazy creation)
  const askerWallet = await ensureWallet(asker.handle, 'ping_payment');

  // 2. Check balance
  const balance = await getBalance(asker.handle);

  if (balance < amount) {
    return {
      error: 'insufficient_funds',
      balance: `$${balance.toFixed(2)}`,
      needed: `$${amount.toFixed(2)}`,
      message: `You need $${(amount - balance).toFixed(2)} more.

Deposit USDC: vibe wallet deposit
`,
    };
  }

  // 3. Ensure expert has wallet (create silently if needed)
  const expertWallet = await ensureWallet(expert.handle, 'ping_receive');

  // 4. Create escrow via smart contract
  const escrowId = ethers.id(question + Date.now());

  const txHash = await createEscrow({
    from: askerWallet,
    to: expertWallet,
    amount,
    question,
    escrowId,
  });

  // 5. Dual notification (ping + vibe)
  await notifyViaVibe(expert.handle, question, amount, escrowId);
  await notifyViaPing(expert.handle, question, escrowId);

  return {
    success: true,
    escrowId,
    txHash,
    message: `Payment sent to @${expert.handle}!`,
  };
}
```

---

## Deployment Checklist

### Phase 1: Database Migration

```bash
# Run migration
psql $POSTGRES_URL < api/migrations/add-wallet-columns.sql

# Verify
psql $POSTGRES_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name LIKE 'wallet%';"
```

### Phase 2: Update MCP Server

```bash
# Add wallet tool to mcp-server/index.js
# Register vibe_wallet tool

# Restart server
vibe reload
```

### Phase 3: Test Flows

**Test 1: Wallet status (no wallet yet)**
```bash
vibe wallet
# Should show: "No wallet yet! You'll get one when you transact."
```

**Test 2: Create wallet explicitly**
```bash
vibe wallet create
# Should create wallet, return address
```

**Test 3: View balance**
```bash
vibe wallet
# Should show address, $0.00 balance
```

**Test 4: Deposit instructions**
```bash
vibe wallet deposit
# Should show address, deposit options
```

### Phase 4: Monitor Metrics

**Success metrics:**
- % of users with no wallet after 7 days
- Wallet creation funnel (trigger → created → funded)
- Time-to-first-transaction
- Wallet abandonment rate

**Track with:**
```sql
-- Users without wallets
SELECT COUNT(*) FROM users WHERE wallet_address IS NULL;

-- Wallets created but never funded
SELECT COUNT(*) FROM users
WHERE wallet_address IS NOT NULL
AND wallet_address NOT IN (
  SELECT DISTINCT wallet_address FROM wallet_events WHERE event_type = 'deposit'
);

-- Wallet creation reasons
SELECT metadata->>'reason', COUNT(*)
FROM wallet_events
WHERE event_type = 'created'
GROUP BY metadata->>'reason';
```

---

## Testing Scenarios

### Scenario 1: Social-only user (never needs wallet)

```bash
# Init
vibe init @testuser1

# Use social features
vibe who
vibe dm @someone "hey"
vibe ship "built cool thing"

# Check wallet (should be none)
vibe wallet
# Expected: "No wallet yet! You'll get one when you transact."
```

### Scenario 2: User receives payment first

```bash
# Init (no wallet)
vibe init @testuser2

# Simulate payment from another user
# (via admin endpoint or test script)
curl -X POST http://localhost:3000/api/wallet/pay \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "@testuser2",
    "amount": 10,
    "sender": "@testadmin"
  }'

# Check wallet (should be created + funded)
vibe wallet
# Expected: Address, $10.00 balance
```

### Scenario 3: User wants to pay

```bash
# Init (no wallet)
vibe init @testuser3

# Try to pay (triggers wallet creation)
vibe ask-expert "WebSocket help"
# System should:
# 1. Detect no wallet
# 2. Create wallet
# 3. Show balance ($0)
# 4. Prompt for deposit
```

---

## Rollback Plan

If ambient crypto UX causes issues:

**Immediate rollback:**
```bash
# Disable lazy creation
export DISABLE_LAZY_WALLET_CREATION=true

# Force wallet creation on init (old behavior)
# Update vibe init to always call ensureWallet()
```

**Database rollback:**
```sql
-- Remove wallet columns (loses data!)
ALTER TABLE users
DROP COLUMN IF EXISTS wallet_address,
DROP COLUMN IF EXISTS wallet_created_at,
DROP COLUMN IF EXISTS github_id;

DROP TABLE IF EXISTS wallet_events;
```

---

## Next Steps

**Week 1: Deploy + Monitor**
- Run database migration
- Deploy wallet helpers
- Register MCP tool
- Monitor wallet creation funnel

**Week 2: Integrate with payments**
- Update ping.money integration
- Test escrow flows
- Add session keys for autonomy

**Week 3: Polish + Scale**
- Add withdrawal functionality
- Improve deposit UX
- Build transaction history view
- Scale to production

---

## Success Criteria

✅ **Ambient UX working if:**
- 50%+ users never see wallet (social-only)
- 90%+ wallets created during transaction (not upfront)
- <5% users confused about wallets
- <3 seconds added to first transaction

❌ **UX failing if:**
- Users confused about wallets on init
- High wallet abandonment (>30% unused)
- Users ask "why do I need crypto?"

---

**Status**: Implementation complete, ready for testing ✓

Next: Deploy database migration, test flows, integrate with ping.money
