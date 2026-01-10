/**
 * Wallet Helpers - Lazy wallet creation for ambient crypto UX
 *
 * Philosophy: Create wallets just-in-time, not upfront
 */

const { Coinbase, Wallet } = require('@coinbase/coinbase-sdk');
const { kv } = require('@vercel/kv');
const { sql } = require('../../api/lib/db');

/**
 * Ensure user has a wallet, create if needed (lazy creation)
 *
 * @param {string} handle - User handle (e.g., "@seth")
 * @param {string} reason - Why wallet is needed (for logging/analytics)
 * @returns {Promise<string>} Wallet address
 */
async function ensureWallet(handle, reason = 'transaction') {
  const cleanHandle = handle.replace('@', '');

  // Check if wallet already exists
  const result = await sql`
    SELECT wallet_address, github_id FROM users WHERE username = ${cleanHandle}
  `;

  if (result.length === 0) {
    throw new Error(`User ${handle} not found. Run 'vibe init' first.`);
  }

  const user = result[0];

  // Wallet already exists
  if (user.wallet_address) {
    console.log(`✓ Wallet exists for ${handle}: ${user.wallet_address}`);
    return user.wallet_address;
  }

  // Need to create wallet (lazy creation)
  console.log(`Creating wallet for ${handle} (reason: ${reason})...`);

  if (!user.github_id) {
    throw new Error(`No GitHub ID for ${handle}. Cannot create wallet.`);
  }

  // Initialize CDP
  Coinbase.configure({
    apiKeyName: process.env.CDP_API_KEY_NAME,
    privateKey: process.env.CDP_PRIVATE_KEY,
  });

  // Create smart wallet on Base
  const wallet = await Wallet.create({
    networkId: 'base-mainnet',
  });

  const address = await wallet.getDefaultAddress();
  const walletAddress = address.getId();

  // Store wallet data in KV (encrypted export)
  const walletData = wallet.export();
  await kv.set(`wallet:${cleanHandle}`, JSON.stringify(walletData));

  // Update database
  await sql`
    UPDATE users
    SET wallet_address = ${walletAddress},
        wallet_created_at = NOW()
    WHERE username = ${cleanHandle}
  `;

  // Log wallet creation event
  const metadata = JSON.stringify({
    reason,
    github_id: user.github_id,
    network: 'base-mainnet',
    created_via: 'lazy_creation',
  });

  await sql`
    INSERT INTO wallet_events (handle, event_type, wallet_address, metadata)
    VALUES (${cleanHandle}, 'created', ${walletAddress}, ${metadata})
  `;

  console.log(`✓ Wallet created for ${handle}: ${walletAddress}`);

  return walletAddress;
}

/**
 * Get wallet address for a user (returns null if no wallet yet)
 *
 * @param {string} handle - User handle
 * @returns {Promise<string|null>} Wallet address or null
 */
async function getWalletAddress(handle) {
  const cleanHandle = handle.replace('@', '');

  const result = await sql`
    SELECT wallet_address FROM users WHERE username = ${cleanHandle}
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0].wallet_address;
}

/**
 * Check if user has a wallet
 */
async function hasWallet(handle) {
  const address = await getWalletAddress(handle);
  return !!address;
}

/**
 * Get USDC balance for a user
 *
 * @param {string} handle - User handle
 * @returns {Promise<number>} Balance in USDC
 */
async function getBalance(handle) {
  const cleanHandle = handle.replace('@', '');

  // Get wallet address from database
  const result = await sql`
    SELECT wallet_address FROM users WHERE username = ${cleanHandle}
  `;

  if (result.length === 0 || !result[0].wallet_address) {
    return 0;
  }

  const walletId = result[0].wallet_address;

  // Configure CDP if not already configured
  Coinbase.configure({
    apiKeyName: process.env.CDP_API_KEY_NAME,
    privateKey: process.env.CDP_PRIVATE_KEY,
  });

  // Fetch wallet by ID
  const wallet = await Wallet.fetch(walletId);
  const balance = await wallet.getBalance('usdc');

  // Convert from smallest unit (6 decimals for USDC)
  return parseFloat(balance.toString()) / 1e6;
}

/**
 * Notify user about their new wallet
 */
async function notifyNewWallet(handle, address, reason, amount = null) {
  const message = amount
    ? `💰 You just earned $${amount}!

Your /vibe wallet was created to receive payment.

Address: ${address.slice(0, 6)}...${address.slice(-4)}
Network: Base (Coinbase L2)

Commands:
  vibe wallet         # View balance
  vibe wallet withdraw # Send to Coinbase/bank
`
    : `💳 Wallet created!

To ${reason}, we set up a wallet for you.

Address: ${address.slice(0, 6)}...${address.slice(-4)}
Network: Base (Coinbase L2)

This lets you transact with other builders on /vibe.
`;

  // TODO: Send notification via /vibe DM or webhook
  console.log(`Wallet notification for ${handle}:`, message);

  return message;
}

module.exports = {
  ensureWallet,
  getWalletAddress,
  hasWallet,
  getBalance,
  notifyNewWallet,
};
