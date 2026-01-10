# CDP Integration Setup Guide

**Status**: Phase 1 scaffolding complete ✓

This guide walks through setting up Coinbase Developer Platform (CDP) integration for /vibe's economic infrastructure.

---

## Prerequisites

1. **Apply for CDP API access**: https://www.coinbase.com/cloud/products/developer-platform
   - Project: /vibe - Terminal-native social for builders
   - Use case: Economic infrastructure for AI agents + builder services
   - Expected volume: 100-500 wallets in first month

2. **Base L2 RPC endpoint** (included with CDP access)

3. **GitHub OAuth** (already set up for /vibe)

---

## Phase 1: Environment Setup

### 1.1 Get CDP Credentials

After CDP approval, you'll receive:
- `CDP_API_KEY_NAME` - Your API key identifier
- `CDP_PRIVATE_KEY` - Your private key (keep secret!)
- `BASE_RPC_URL` - Base network RPC endpoint

### 1.2 Update Environment Variables

Add to `.env`:

```bash
# Coinbase Developer Platform
CDP_API_KEY_NAME=your-api-key-name
CDP_PRIVATE_KEY=your-private-key
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-KEY

# USDC on Base (Mainnet)
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Contract addresses (deploy first, then add)
X402_CONTRACT_ADDRESS=
ESCROW_CONTRACT_ADDRESS=
ATTESTATION_CONTRACT_ADDRESS=

# Fee collection
FEE_COLLECTOR=your-vibe-treasury-address
DEFAULT_ARBITER=your-arbiter-address
```

### 1.3 Install Dependencies

```bash
# CDP SDK
npm install @coinbase/coinbase-sdk

# Ethers v6 (for smart contract interactions)
npm install ethers@^6.0.0

# In contracts directory
cd contracts
npm install
```

---

## Phase 2: Deploy Smart Contracts

### 2.1 Compile Contracts

```bash
cd contracts
npx hardhat compile
```

This compiles:
- `X402.sol` - Micropayment primitive
- `VibeEscrow.sol` - Escrow for peer services

### 2.2 Deploy to Base

```bash
# Test on Base Sepolia first
npx hardhat run scripts/deploy-cdp.ts --network base-sepolia

# Then deploy to Base Mainnet
npx hardhat run scripts/deploy-cdp.ts --network base
```

### 2.3 Verify on Basescan

```bash
npx hardhat verify --network base <X402_ADDRESS> "<USDC_ADDRESS>" "<FEE_COLLECTOR>"
npx hardhat verify --network base <ESCROW_ADDRESS> "<USDC_ADDRESS>" "<FEE_COLLECTOR>" "<ARBITER>"
```

### 2.4 Update .env with Contract Addresses

Copy the deployed addresses to `.env`:

```bash
X402_CONTRACT_ADDRESS=0x...
ESCROW_CONTRACT_ADDRESS=0x...
```

---

## Phase 3: Database Schema Updates

### 3.1 Add Wallet Columns to Users Table

```sql
ALTER TABLE users
ADD COLUMN wallet_address TEXT,
ADD COLUMN wallet_provider TEXT DEFAULT 'cdp',
ADD COLUMN wallet_created_at TIMESTAMP;

CREATE INDEX idx_users_wallet_address ON users(wallet_address);
```

### 3.2 Create Wallet Events Table

```sql
CREATE TABLE wallet_events (
  id SERIAL PRIMARY KEY,
  handle TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'created', 'deposit', 'withdrawal', 'payment'
  wallet_address TEXT NOT NULL,
  amount NUMERIC(20, 6), -- USDC amount
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_events_handle ON wallet_events(handle);
CREATE INDEX idx_wallet_events_type ON wallet_events(event_type);
```

### 3.3 Create Session Keys Table

```sql
CREATE TABLE session_keys (
  id SERIAL PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  spend_limit NUMERIC(20, 6) NOT NULL,
  spent NUMERIC(20, 6) DEFAULT 0,
  valid_until TIMESTAMP NOT NULL,
  allowed_contracts TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

CREATE INDEX idx_session_keys_handle ON session_keys(handle);
CREATE INDEX idx_session_keys_valid ON session_keys(valid_until) WHERE revoked_at IS NULL;
```

---

## Phase 4: Test Wallet Creation

### 4.1 Create Test Wallet via API

```bash
curl -X POST http://localhost:3000/api/wallet/create \
  -H "Content-Type: application/json" \
  -d '{
    "handle": "@testuser",
    "githubId": "12345",
    "email": "test@example.com"
  }'
```

Expected response:
```json
{
  "success": true,
  "address": "0xabcd...1234",
  "network": "base",
  "message": "✓ Smart wallet created on Base..."
}
```

### 4.2 Check Balance

```bash
curl "http://localhost:3000/api/wallet/balance?handle=@testuser"
```

Expected response:
```json
{
  "balance": 0,
  "address": "0xabcd...1234",
  "network": "base",
  "formatted": "$0.00 USDC"
}
```

### 4.3 Fund Test Wallet

Send USDC to the wallet address from Coinbase or Bridge:
```
0xabcd...1234
```

Then verify balance again.

---

## Phase 5: Session Keys for Agent Autonomy

### 5.1 Create Session Key

Add endpoint to MCP server:

```bash
vibe session-key --limit 10
```

This:
- Generates ephemeral keypair
- Grants spending permission on smart wallet
- Stores in KV with 24-hour expiry
- Returns status

### 5.2 Test Autonomous Transaction

```typescript
// Claude can now execute transactions without approval prompts
import { executeWithSessionKey } from './lib/cdp/session-keys';

const txHash = await executeWithSessionKey(
  '@seth',
  process.env.X402_CONTRACT_ADDRESS!,
  5, // $5 USDC
  paymentData
);
```

---

## Phase 6: ping.money Integration

### 6.1 Update Prototype

Modify `prototypes/ping-integration/vibe_route_to_ping.js`:

```javascript
async function routeToPingWithSmartContract(data) {
  const { expert, question, amount, asker } = data;

  // Use session key for autonomous escrow creation
  const escrowId = ethers.id(question + Date.now());

  const txHash = await executeWithSessionKey(
    asker.handle,
    process.env.ESCROW_CONTRACT_ADDRESS,
    amount,
    encodeEscrowData(expert.address, amount, question)
  );

  // Dual notification
  await notifyViaVibe(expert.handle, question, amount);
  await notifyViaPing(expert.handle, question, escrowId);

  return { escrowId, txHash };
}
```

### 6.2 Test Full Flow

```bash
# In Claude Code
vibe ask-expert "How do I fix WebSocket memory leaks?"
```

Expected flow:
1. Query /vibe graph for WebSocket experts
2. Rank by ships + help history + online status
3. Create escrow via session key (no prompt!)
4. Notify expert via ping + vibe DM
5. Expert answers → escrow releases funds

---

## Testing Checklist

- [ ] CDP API credentials working
- [ ] Contracts deployed to Base
- [ ] Database schema updated
- [ ] Test wallet created
- [ ] USDC balance showing correctly
- [ ] Session key created
- [ ] Autonomous transaction works (no approval prompt)
- [ ] ping.money integration functional
- [ ] Full expert matching flow works

---

## Security Considerations

### Session Keys
- Maximum 24-hour validity
- User-specified spending limit
- Contract whitelist (only X402, Escrow, Attestation)
- Revocable at any time by user

### Smart Contracts
- ReentrancyGuard on all payable functions
- Ownable for admin functions
- Platform fee capped at 10%
- Emergency withdrawal for owner only

### Wallet Storage
- Wallet data encrypted in KV
- Private keys never exposed in API responses
- Session key private keys stored separately

---

## Next Steps After Setup

1. **Add X402 support to all services**
   - ping.money expert matching
   - /vibe premium features
   - Third-party integrations

2. **Deploy 8802 Attestation contract**
   - Onchain reputation tokens
   - Proof of expertise (ships)
   - Help history attestations

3. **Spirit Protocol integration**
   - Artist agent wallets
   - Autonomous treasury accumulation
   - Cross-protocol reputation

---

## Troubleshooting

### "USDC transfer failed"
- Check wallet has USDC balance
- Verify USDC approval for contract
- Confirm correct USDC address for Base

### "No valid session key found"
- Session key may have expired (24h limit)
- Create new session key: `vibe session-key --limit 10`

### "Contract not allowed for session key"
- Verify contract address in allowed list
- Check X402_CONTRACT_ADDRESS in .env

### "CDP SDK error"
- Verify API credentials in .env
- Check CDP_API_KEY_NAME and CDP_PRIVATE_KEY
- Ensure BASE_RPC_URL is correct

---

## Resources

- **CDP Docs**: https://docs.cdp.coinbase.com/
- **Base Docs**: https://docs.base.org/
- **USDC on Base**: https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- **Basescan**: https://basescan.org/
- **ping.money**: https://ping-money.com/

---

**Status**: Scaffolding complete, ready for CDP API approval ✓

Once API access is granted, follow Phase 2 (Deploy Contracts) → Phase 3 (Database) → Phase 4 (Test).
