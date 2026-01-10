# Coinbase Developer Platform Integration — /vibe Economic Layer

**Started:** January 9, 2026
**Goal:** Ship AI-native economic infrastructure in 2-3 weeks
**Architecture:** Smart wallets + X402 + 8802 + Spirit Protocol alignment

---

## Why CDP, Not Privy or Stripe

**First principles:**
- /vibe is infrastructure for AI-native builder services
- Claude agents need wallets (session keys, programmable money)
- Spirit Protocol agents will use same infrastructure
- We need generative onchain primitives (X402, 8802), not just send/receive

**CDP delivers:**
- ✅ Smart wallets (Account Abstraction, not EOAs)
- ✅ Session keys (agents spend up to $X without user approval)
- ✅ Base L2 native (they built the chain)
- ✅ Programmable (deploy contracts, X402, 8802)
- ✅ AI-first design (Vercel AI SDK integration)
- ✅ MPC wallets (users own keys, can export)

**See:** [PLATFORM_STRATEGY.md](./PLATFORM_STRATEGY.md) for full decision rationale

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  /vibe Identity (@handle)               │
│  - GitHub OAuth (existing)              │
│  - Social graph (ships, reputation)     │
│  - Economic identity (wallet)           │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  CDP Smart Wallet                       │
│  - Account Abstraction (ERC-4337)       │
│  - Session keys (agent autonomy)        │
│  - Paymaster (gasless for users)        │
│  - MPC (user owns keys)                 │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  Base L2 Contracts                      │
│  - USDC (native token)                  │
│  - X402 (micropayment primitive)        │
│  - Escrow (ping.money, bounties)        │
│  - EAS (8802 attestations)              │
└─────────────────────────────────────────┘
```

---

## Phase 1: CDP Setup & Basic Wallet (Week 1)

### 1.1 Get API Access

**Apply:** https://www.coinbase.com/cloud/products/developer-platform

**What we need:**
- CDP API key
- Base network RPC endpoint
- Smart wallet factory contract address
- Paymaster contract address (for gas sponsorship)

**Form fields:**
- Project: /vibe - Terminal-native social for builders
- Use case: Economic infrastructure for AI agents + builder services
- Volume estimate: 100-500 wallets in first month
- Integration: MCP server (Claude Code)

**Expected turnaround:** 1-3 business days

### 1.2 Project Structure

```
vibe/
├── api/
│   └── wallet/
│       ├── create.ts          - Create smart wallet on vibe init
│       ├── balance.ts         - Query USDC balance
│       ├── session-key.ts     - Grant agent spending limit
│       ├── deposit.ts         - Card → USDC onramp
│       ├── withdraw.ts        - Send to external wallet
│       └── history.ts         - Transaction log
│
├── contracts/
│   ├── X402.sol               - Micropayment primitive
│   ├── VibeEscrow.sol         - Escrow for services (ping, bounties)
│   ├── ReputationAttestation.sol  - 8802 reputation token
│   └── deploy/
│       ├── deploy-x402.ts
│       ├── deploy-escrow.ts
│       └── verify.ts
│
├── mcp-server/
│   └── tools/
│       ├── wallet-balance.js  - "check my vibe balance"
│       ├── wallet-deposit.js  - "add $50 to wallet"
│       ├── wallet-send.js     - "send @alice $10"
│       ├── wallet-history.js  - "show payment history"
│       └── wallet-export.js   - "export my wallet keys"
│
└── lib/
    └── cdp/
        ├── client.ts          - CDP SDK wrapper
        ├── smart-wallet.ts    - Wallet operations
        ├── session-keys.ts    - Agent autonomy
        └── contracts.ts       - Contract interactions
```

### 1.3 Database Schema

```sql
-- Add wallet info to users
ALTER TABLE users ADD COLUMN wallet_address VARCHAR(42);
ALTER TABLE users ADD COLUMN wallet_provider VARCHAR(20) DEFAULT 'cdp';
ALTER TABLE users ADD COLUMN wallet_created_at TIMESTAMP;
ALTER TABLE users ADD COLUMN session_key_active BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN session_key_limit INTEGER; -- USDC cents
ALTER TABLE users ADD COLUMN session_key_expires_at TIMESTAMP;

-- Transaction log
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  from_handle VARCHAR(50),
  to_handle VARCHAR(50),
  from_address VARCHAR(42),
  to_address VARCHAR(42),
  amount_usdc INTEGER,  -- cents
  tx_hash VARCHAR(66),
  service VARCHAR(50),  -- 'ping', 'tip', 'bounty', 'x402'
  status VARCHAR(20),   -- 'pending', 'confirmed', 'failed', 'refunded'
  block_number INTEGER,
  gas_sponsored BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  metadata JSONB
);

CREATE INDEX idx_transactions_from ON transactions(from_handle);
CREATE INDEX idx_transactions_to ON transactions(to_handle);
CREATE INDEX idx_transactions_service ON transactions(service);
CREATE INDEX idx_transactions_status ON transactions(status);

-- Session key log (for security audit)
CREATE TABLE session_keys (
  id UUID PRIMARY KEY,
  user_handle VARCHAR(50),
  public_key VARCHAR(132),
  limit_usdc INTEGER,
  spent_usdc INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revoke_reason TEXT
);
```

### 1.4 Environment Variables

```bash
# .env.cdp
CDP_API_KEY=your_api_key_here
CDP_API_SECRET=your_api_secret_here
CDP_NETWORK=base-mainnet  # or base-sepolia for testnet
CDP_PAYMASTER_ADDRESS=0x...  # Gas sponsorship contract
CDP_SMART_WALLET_FACTORY=0x...  # Wallet factory contract

# Base L2
BASE_RPC_URL=https://mainnet.base.org
BASE_CHAIN_ID=8453

# Contracts (deployed addresses)
X402_CONTRACT_ADDRESS=0x...
ESCROW_CONTRACT_ADDRESS=0x...
ATTESTATION_CONTRACT_ADDRESS=0x...
```

---

## Phase 2: Smart Wallet Creation (Week 1, Day 1-3)

### Implementation

**File:** `lib/cdp/smart-wallet.ts`

```typescript
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk'
import { ethers } from 'ethers'

interface SmartWalletConfig {
  userId: string        // GitHub ID
  handle: string        // @seth
  socialProvider: 'github'
}

export class VibeSmartWallet {
  private sdk: CoinbaseWalletSDK
  private provider: ethers.providers.Provider

  constructor() {
    this.sdk = new CoinbaseWalletSDK({
      appName: '/vibe',
      appLogoUrl: 'https://slashvibe.dev/logo.png',
      apiKey: process.env.CDP_API_KEY!,
      apiSecret: process.env.CDP_API_SECRET!
    })

    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.BASE_RPC_URL
    )
  }

  /**
   * Create smart wallet for new user
   * - Uses GitHub OAuth for authentication
   * - Deploys smart wallet contract (ERC-4337)
   * - Returns deterministic address
   */
  async createWallet(config: SmartWalletConfig): Promise<string> {
    // Create smart wallet via CDP
    const wallet = await this.sdk.createSmartWallet({
      chain: 'base',
      socialAuth: {
        provider: config.socialProvider,
        userId: config.userId
      },
      accountAbstraction: true,  // ERC-4337
      paymasterAddress: process.env.CDP_PAYMASTER_ADDRESS
    })

    const address = await wallet.getAddress()

    // Store in database
    await db.users.update({
      where: { handle: config.handle },
      data: {
        wallet_address: address,
        wallet_provider: 'cdp',
        wallet_created_at: new Date()
      }
    })

    console.log(`Created smart wallet for ${config.handle}: ${address}`)

    return address
  }

  /**
   * Get USDC balance for handle
   */
  async getBalance(handle: string): Promise<number> {
    const user = await db.users.findUnique({
      where: { handle },
      select: { wallet_address: true }
    })

    if (!user?.wallet_address) {
      throw new Error('No wallet found for ' + handle)
    }

    // USDC contract on Base
    const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      this.provider
    )

    const balance = await usdcContract.balanceOf(user.wallet_address)

    // USDC has 6 decimals
    return balance.div(1e6).toNumber()
  }

  /**
   * Send USDC to another vibe user
   */
  async send(
    from: string,
    to: string,
    amount: number,
    memo?: string
  ): Promise<string> {
    const fromUser = await db.users.findUnique({ where: { handle: from } })
    const toUser = await db.users.findUnique({ where: { handle: to } })

    if (!fromUser?.wallet_address || !toUser?.wallet_address) {
      throw new Error('Wallet not found')
    }

    const wallet = await this.sdk.getWallet(fromUser.wallet_address)

    // USDC transfer
    const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    const tx = await wallet.sendTransaction({
      to: USDC_ADDRESS,
      data: encodeFunctionCall('transfer', [
        toUser.wallet_address,
        amount * 1e6  // Convert to USDC decimals
      ])
    })

    // Log transaction
    await db.transactions.create({
      data: {
        from_handle: from,
        to_handle: to,
        from_address: fromUser.wallet_address,
        to_address: toUser.wallet_address,
        amount_usdc: amount * 100,  // Store as cents
        tx_hash: tx.hash,
        service: 'transfer',
        status: 'pending',
        metadata: { memo }
      }
    })

    // Wait for confirmation
    await tx.wait()

    await db.transactions.update({
      where: { tx_hash: tx.hash },
      data: {
        status: 'confirmed',
        confirmed_at: new Date(),
        block_number: tx.blockNumber
      }
    })

    return tx.hash
  }
}
```

**File:** `api/wallet/create.ts`

```typescript
import { VibeSmartWallet } from '../../lib/cdp/smart-wallet'

export default async function handler(req, res) {
  const { handle, githubId } = req.body

  const wallet = new VibeSmartWallet()

  try {
    const address = await wallet.createWallet({
      userId: githubId,
      handle,
      socialProvider: 'github'
    })

    return res.json({
      success: true,
      address,
      message: `Smart wallet created for @${handle}`
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
```

**File:** `mcp-server/tools/wallet-balance.js`

```javascript
const config = require('../config')
const { VibeSmartWallet } = require('../../lib/cdp/smart-wallet')

const definition = {
  name: 'vibe_balance',
  description: 'Check your /vibe wallet balance (USDC)',
  inputSchema: {
    type: 'object',
    properties: {}
  }
}

async function handler(args) {
  const myHandle = config.getHandle()
  const wallet = new VibeSmartWallet()

  try {
    const balance = await wallet.getBalance(myHandle)
    const user = await db.users.findUnique({
      where: { handle: myHandle },
      select: { wallet_address: true }
    })

    return {
      display: `## /vibe Wallet

**@${myHandle}**

💰 Balance: $${balance.toFixed(2)} USDC

**Address:** \`${user.wallet_address}\`
**Network:** Base L2
**Gas:** Sponsored (free)

**Commands:**
- "add $50" - Deposit via card
- "send @alice $10" - Pay another user
- "withdraw to 0x..." - Send to external wallet
- "payment history" - View transactions

**Smart wallet features:**
- ✅ Gasless transactions (we sponsor)
- ✅ Session keys (agents can spend up to limit)
- ✅ MPC keys (you own them)
- ✅ Export to MetaMask anytime`
    }
  } catch (error) {
    return {
      display: `⚠️ Error: ${error.message}\n\nRun "vibe init" to create your wallet.`
    }
  }
}

module.exports = { definition, handler }
```

---

## Phase 3: Session Keys for Agents (Week 1, Day 4-7)

### Why Session Keys Matter

**Without session keys:**
```
User: "vibe ask expert about Rust"

Claude:
1. Queries graph → finds @bob
2. **STOPS: "Approve payment of $50?"**
3. User approves
4. Creates escrow
5. Notifies expert
```

**With session keys:**
```
User: "vibe ask expert about Rust"

Claude:
1. Queries graph → finds @bob
2. Creates escrow (within $50 session limit)
3. Notifies expert
**DONE. No approval needed.**
```

Session keys = **agent autonomy**. This is what makes it AI-native.

### Implementation

**File:** `lib/cdp/session-keys.ts`

```typescript
export class SessionKeyManager {
  /**
   * Grant Claude agent permission to spend up to limit
   * Valid for 24 hours
   */
  async createSessionKey(
    handle: string,
    limit: number,  // USDC
    expiresIn: number = 86400000  // 24 hours
  ): Promise<string> {
    const user = await db.users.findUnique({ where: { handle } })

    const wallet = await sdk.getWallet(user.wallet_address)

    // Generate ephemeral keypair for agent
    const sessionKeypair = ethers.Wallet.createRandom()

    // Grant permissions on smart wallet
    const sessionKey = await wallet.grantSessionKey({
      publicKey: sessionKeypair.publicKey,
      permissions: {
        maxAmount: limit * 1e6,  // USDC cents
        validUntil: Date.now() + expiresIn,
        allowedContracts: [
          process.env.ESCROW_CONTRACT_ADDRESS,
          process.env.X402_CONTRACT_ADDRESS,
          process.env.ATTESTATION_CONTRACT_ADDRESS
        ],
        allowedMethods: [
          'createEscrow',
          'payMicropayment',
          'attest'
        ]
      }
    })

    // Store session key (encrypted)
    await db.session_keys.create({
      data: {
        user_handle: handle,
        public_key: sessionKeypair.publicKey,
        private_key_encrypted: encrypt(sessionKeypair.privateKey),
        limit_usdc: limit * 100,  // Store as cents
        spent_usdc: 0,
        created_at: new Date(),
        expires_at: new Date(Date.now() + expiresIn)
      }
    })

    // Update user
    await db.users.update({
      where: { handle },
      data: {
        session_key_active: true,
        session_key_limit: limit * 100,
        session_key_expires_at: new Date(Date.now() + expiresIn)
      }
    })

    return sessionKeypair.publicKey
  }

  /**
   * Execute transaction with session key (agent autonomy)
   */
  async executeWithSessionKey(
    handle: string,
    contract: string,
    method: string,
    params: any[]
  ): Promise<string> {
    // Get active session key
    const sessionKey = await db.session_keys.findFirst({
      where: {
        user_handle: handle,
        expires_at: { gt: new Date() },
        revoked_at: null
      },
      orderBy: { created_at: 'desc' }
    })

    if (!sessionKey) {
      throw new Error('No active session key. Run "grant agent $50" first.')
    }

    // Check if within spending limit
    if (sessionKey.spent_usdc >= sessionKey.limit_usdc) {
      throw new Error(`Session limit exceeded ($${sessionKey.limit_usdc / 100})`)
    }

    // Decrypt session key
    const privateKey = decrypt(sessionKey.private_key_encrypted)
    const signer = new ethers.Wallet(privateKey, provider)

    // Execute transaction
    const contractInstance = new ethers.Contract(contract, ABI, signer)
    const tx = await contractInstance[method](...params)

    // Update spent amount (estimate from params)
    const estimatedAmount = estimateTransactionValue(method, params)
    await db.session_keys.update({
      where: { id: sessionKey.id },
      data: { spent_usdc: sessionKey.spent_usdc + estimatedAmount }
    })

    return tx.hash
  }

  /**
   * Revoke session key
   */
  async revokeSessionKey(handle: string, reason?: string) {
    await db.session_keys.updateMany({
      where: {
        user_handle: handle,
        revoked_at: null
      },
      data: {
        revoked_at: new Date(),
        revoke_reason: reason || 'User revoked'
      }
    })

    await db.users.update({
      where: { handle },
      data: {
        session_key_active: false,
        session_key_limit: null,
        session_key_expires_at: null
      }
    })
  }
}
```

**File:** `mcp-server/tools/wallet-grant-session.js`

```javascript
const { SessionKeyManager } = require('../../lib/cdp/session-keys')

const definition = {
  name: 'vibe_grant_agent',
  description: 'Grant Claude agent permission to spend up to a limit without approval',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Max amount Claude can spend (e.g., 50 for $50)'
      },
      duration: {
        type: 'string',
        description: 'How long: "1h", "24h", "7d" (default: 24h)'
      }
    },
    required: ['limit']
  }
}

async function handler(args) {
  const { limit, duration = '24h' } = args
  const myHandle = config.getHandle()

  const durationMs = parseDuration(duration)
  const sessionMgr = new SessionKeyManager()

  const publicKey = await sessionMgr.createSessionKey(
    myHandle,
    limit,
    durationMs
  )

  return {
    display: `## Agent Spending Permission Granted

✅ Claude can now spend up to **$${limit}** on your behalf

**Details:**
- Valid for: ${duration}
- Can be used for: routing experts, micropayments, attestations
- Will NOT prompt you for approval (unless limit exceeded)

**What this enables:**
- "vibe ask expert" → Claude pays automatically
- X402 micropayments → Per-request billing
- Escrow creation → Instant service payments

**Security:**
- Session key is ephemeral (expires in ${duration})
- Spending limit: $${limit} total
- Only works for approved contracts
- You can revoke anytime: "revoke agent"

**Check status:** "agent status"

---

**Example:**
You: "Ask an expert about WebSocket reconnection, budget $50"

Claude: [autonomous]
1. Queries graph → finds @rob
2. Creates $50 escrow (NO APPROVAL NEEDED)
3. Notifies @rob
4. Done.

This is how AI-native payments work.`
  }
}

module.exports = { definition, handler }
```

---

## Phase 4: X402 Micropayment Contract (Week 2)

### What is X402?

**HTTP 402 Payment Required** - A primitive for pay-per-request services

**Use cases:**
- Spirit Protocol agents charge $0.001 per API call
- Claude Code plugin charges $0.10 per query
- Routing fee for expert matching ($0.50 per route)
- API rate limiting via payments (instead of keys)

**Architecture:**

```
Client → X402 Micropayment → Service
         (pays $0.001)      (executes)
```

### Smart Contract

**File:** `contracts/X402.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * X402 Micropayment Contract
 *
 * Enables pay-per-request services:
 * - Spirit Protocol agents charge per API call
 * - vibe routing charges per expert match
 * - Any service can charge micropayments
 */
contract X402Micropayments is Ownable {
    IERC20 public usdc;

    struct Payment {
        address payer;
        address recipient;
        uint256 amount;
        string service;
        bytes32 requestId;
        uint256 timestamp;
    }

    mapping(bytes32 => Payment) public payments;
    mapping(address => uint256) public balances;

    event PaymentMade(
        bytes32 indexed requestId,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        string service
    );

    event Withdrawal(
        address indexed recipient,
        uint256 amount
    );

    constructor(address _usdcAddress) {
        usdc = IERC20(_usdcAddress);
    }

    /**
     * Pay for a service request
     * @param recipient Service provider address
     * @param amount Payment amount (USDC cents)
     * @param service Service identifier ("ping_routing", "spirit_api", etc.)
     * @param requestId Unique request identifier
     */
    function payForRequest(
        address recipient,
        uint256 amount,
        string calldata service,
        bytes32 requestId
    ) external {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        require(payments[requestId].timestamp == 0, "Request already paid");

        // Transfer USDC from payer to contract
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );

        // Record payment
        payments[requestId] = Payment({
            payer: msg.sender,
            recipient: recipient,
            amount: amount,
            service: service,
            requestId: requestId,
            timestamp: block.timestamp
        });

        // Credit recipient balance
        balances[recipient] += amount;

        emit PaymentMade(requestId, msg.sender, recipient, amount, service);
    }

    /**
     * Withdraw accumulated balance
     */
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");

        balances[msg.sender] = 0;

        require(
            usdc.transfer(msg.sender, amount),
            "USDC transfer failed"
        );

        emit Withdrawal(msg.sender, amount);
    }

    /**
     * Get payment details
     */
    function getPayment(bytes32 requestId) external view returns (Payment memory) {
        return payments[requestId];
    }

    /**
     * Get balance for address
     */
    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }
}
```

### Deployment Script

**File:** `contracts/deploy/deploy-x402.ts`

```typescript
import { ethers } from 'hardhat'

async function main() {
  const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

  console.log('Deploying X402 Micropayments contract to Base...')

  const X402 = await ethers.getContractFactory('X402Micropayments')
  const x402 = await X402.deploy(USDC_BASE)

  await x402.deployed()

  console.log('X402 deployed to:', x402.address)
  console.log('USDC address:', USDC_BASE)

  // Save to .env
  console.log('\nAdd to .env:')
  console.log(`X402_CONTRACT_ADDRESS=${x402.address}`)

  // Verify on Basescan
  console.log('\nVerifying on Basescan...')
  await run('verify:verify', {
    address: x402.address,
    constructorArguments: [USDC_BASE]
  })

  console.log('✅ Deployment complete!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

### Usage Example

**File:** `lib/cdp/x402-client.ts`

```typescript
export class X402Client {
  private contract: ethers.Contract

  constructor() {
    this.contract = new ethers.Contract(
      process.env.X402_CONTRACT_ADDRESS!,
      X402_ABI,
      provider
    )
  }

  /**
   * Pay for a service request via X402
   * Used for: ping routing, Spirit API calls, etc.
   */
  async payForRequest(
    payer: string,
    recipient: string,
    amount: number,  // USDC
    service: string,
    requestId: string
  ): Promise<string> {
    const sessionMgr = new SessionKeyManager()

    // Execute with session key (no approval needed)
    const txHash = await sessionMgr.executeWithSessionKey(
      payer,
      process.env.X402_CONTRACT_ADDRESS!,
      'payForRequest',
      [
        recipient,
        amount * 1e6,  // Convert to USDC decimals
        service,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(requestId))
      ]
    )

    // Log transaction
    await db.transactions.create({
      data: {
        from_handle: payer,
        to_address: recipient,
        amount_usdc: amount * 100,
        tx_hash: txHash,
        service: 'x402_' + service,
        status: 'pending',
        metadata: { requestId, service }
      }
    })

    return txHash
  }

  /**
   * Example: Charge routing fee when matching expert
   */
  async chargeRoutingFee(
    asker: string,
    expert: string,
    questionId: string
  ): Promise<void> {
    const ROUTING_FEE = 0.50  // $0.50 per route

    const expertUser = await db.users.findUnique({
      where: { handle: expert },
      select: { wallet_address: true }
    })

    await this.payForRequest(
      asker,
      expertUser!.wallet_address,
      ROUTING_FEE,
      'ping_routing',
      questionId
    )

    console.log(`Charged ${asker} $${ROUTING_FEE} routing fee`)
  }
}
```

---

## Phase 5: ping.money Integration with Smart Contracts (Week 2-3)

**File:** `prototypes/ping-integration/escrow-via-smart-contract.ts`

```typescript
import { SessionKeyManager } from '../../lib/cdp/session-keys'
import { X402Client } from '../../lib/cdp/x402-client'

/**
 * Route question to ping.money using CDP smart contracts
 * - Creates escrow via smart contract (not ping API)
 * - Charges routing fee via X402
 * - Notifies expert via ping + vibe
 */
export async function routeToPingWithSmartContract(
  asker: string,
  expert: string,
  question: string,
  amount: number
) {
  const x402 = new X402Client()
  const sessionMgr = new SessionKeyManager()

  // 1. Charge routing fee ($0.50)
  const questionId = generateQuestionId()
  await x402.chargeRoutingFee(asker, expert, questionId)

  // 2. Create escrow (via session key, no approval)
  const escrowTx = await sessionMgr.executeWithSessionKey(
    asker,
    process.env.ESCROW_CONTRACT_ADDRESS!,
    'createEscrow',
    [
      expert,  // recipient
      amount * 1e6,  // USDC amount
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes(questionId)),
      24 * 60 * 60  // 24 hour timeout
    ]
  )

  // 3. Notify ping.money (they handle answer collection)
  await fetch('https://api.ping-money.com/v1/questions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VIBE_PING_SERVICE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question,
      expert_handle: expert,
      amount,
      source: 'vibe',
      source_metadata: {
        asker,
        escrow_tx: escrowTx,
        routing_method: 'graph_smart_contract'
      }
    })
  })

  // 4. Notify expert via vibe DM
  await store.sendMessage(
    'system',
    expert,
    `💰 New $${amount} Question via /vibe × ping

**From:** @${asker}

**Question:**
${question}

**Escrow:** $${amount} USDC locked onchain
**Contract:** ${escrowTx}

Answer in ping terminal to claim payment.

_Matched via /vibe graph because of your shipped projects._`,
    'dm'
  )

  return {
    questionId,
    escrowTx,
    routingFee: 0.50,
    status: 'pending_answer'
  }
}
```

---

## Success Metrics (2-3 Week Timeline)

### Week 1 Goals
- ✅ CDP API access approved
- ✅ First smart wallet created
- ✅ USDC balance check working
- ✅ Session key granted and tested

### Week 2 Goals
- ✅ X402 contract deployed to Base
- ✅ Escrow contract deployed
- ✅ ping.money integration using smart contracts
- ✅ 5 test transactions successful

### Week 3 Goals
- ✅ 20 beta users with wallets
- ✅ 10 successful ping routings via escrow
- ✅ Agent autonomy working (no approval prompts)
- ✅ Public launch ready

---

## Next Immediate Actions

1. **Apply for CDP access** (today)
2. **Set up project structure** (today)
3. **Deploy test smart wallet** (when API approved)
4. **Test session keys** (week 1)
5. **Deploy X402 contract** (week 2)
6. **Ship ping integration** (week 2-3)

---

**Let's build the future of AI-native economic infrastructure.**

**Started:** January 9, 2026
**Target ship:** End of January 2026
**First transaction:** Within 2 weeks

🚀
