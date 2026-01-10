/**
 * Wallet Helpers - Lazy wallet creation for ambient crypto UX
 *
 * Philosophy: Create wallets just-in-time, not upfront
 */

const { Coinbase, Wallet } = require('@coinbase/coinbase-sdk');
const { kv } = require('@vercel/kv');
const { query } = require('../../api/lib/db');

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
  const result = await query(
    `SELECT wallet_address, github_id FROM users WHERE handle = $1`,
    [cleanHandle]
  );

  if (result.rows.length === 0) {
    throw new Error(`User ${handle} not found. Run 'vibe init' first.`);
  }

  const user = result.rows[0];

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
  const coinbase = new Coinbase({
    apiKeyName: process.env.CDP_API_KEY_NAME,
    privateKey: process.env.CDP_PRIVATE_KEY,
  });

  // Create smart wallet on Base
  const wallet = await coinbase.createWallet({
    networkId: 'base-mainnet',
  });

  const address = await wallet.getDefaultAddress();
  const walletAddress = address.getId();

  // Store wallet data in KV (encrypted export)
  const walletData = wallet.export();
  await kv.set(`wallet:${cleanHandle}`, JSON.stringify(walletData));

  // Update database
  await query(
    `UPDATE users
     SET wallet_address = $1,
         wallet_created_at = NOW()
     WHERE handle = $2`,
    [walletAddress, cleanHandle]
  );

  // Log wallet creation event
  await query(
    `INSERT INTO wallet_events (handle, event_type, wallet_address, metadata)
     VALUES ($1, 'created', $2, $3)`,
    [
      cleanHandle,
      walletAddress,
      JSON.stringify({
        reason,
        github_id: user.github_id,
        network: 'base-mainnet',
        created_via: 'lazy_creation',
      }),
    ]
  );

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

  const result = await query(
    `SELECT wallet_address FROM users WHERE handle = $1`,
    [cleanHandle]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].wallet_address;
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
  const address = await getWalletAddress(handle);

  if (!address) {
    return 0;
  }

  const coinbase = new Coinbase({
    apiKeyName: process.env.CDP_API_KEY_NAME,
    privateKey: process.env.CDP_PRIVATE_KEY,
  });

  const wallet = await coinbase.getWallet(address);
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
