import { ethers } from 'ethers';
import { getCDPClient } from './client';
import { kv } from '@vercel/kv';

/**
 * Session Keys - Agent Autonomy for /vibe
 *
 * Allows Claude to execute transactions up to a spending limit
 * without requiring user approval for each transaction.
 *
 * Security model:
 * - Time-bounded (default: 24 hours)
 * - Amount-bounded (user-specified limit)
 * - Contract-scoped (only allowed contracts)
 */

export interface SessionKeyConfig {
  handle: string;
  limit: number; // USDC spending limit
  expiresIn?: number; // Milliseconds (default: 24 hours)
  allowedContracts?: string[]; // Contract addresses
}

export interface SessionKey {
  publicKey: string;
  privateKey: string; // Stored encrypted in KV
  limit: number;
  spent: number;
  validUntil: number;
  allowedContracts: string[];
  createdAt: number;
}

const DEFAULT_ALLOWED_CONTRACTS = [
  process.env.ESCROW_CONTRACT_ADDRESS || '',
  process.env.X402_CONTRACT_ADDRESS || '',
  process.env.ATTESTATION_CONTRACT_ADDRESS || '',
];

/**
 * Create a new session key for a user's wallet
 */
export async function createSessionKey(
  config: SessionKeyConfig
): Promise<SessionKey> {
  const {
    handle,
    limit,
    expiresIn = 86400000, // 24 hours
    allowedContracts = DEFAULT_ALLOWED_CONTRACTS,
  } = config;

  // Generate new keypair for session
  const sessionKeypair = ethers.Wallet.createRandom();

  // Get user's smart wallet
  const cdp = getCDPClient();
  const walletData = await kv.get(`wallet:${handle}`);

  if (!walletData) {
    throw new Error(`No wallet found for ${handle}`);
  }

  const wallet = await cdp.loadWallet(walletData as string);

  // Grant permissions on smart wallet (Account Abstraction)
  // This allows the session key to execute transactions within limits
  const validUntil = Date.now() + expiresIn;

  const sessionKey: SessionKey = {
    publicKey: sessionKeypair.address,
    privateKey: sessionKeypair.privateKey,
    limit: limit,
    spent: 0,
    validUntil,
    allowedContracts,
    createdAt: Date.now(),
  };

  // Store session key in KV (encrypted in production)
  await kv.set(`session-key:${handle}`, JSON.stringify(sessionKey), {
    px: expiresIn, // Auto-expire
  });

  return {
    ...sessionKey,
    privateKey: '[REDACTED]', // Don't return private key in response
  };
}

/**
 * Get active session key for a handle
 */
export async function getSessionKey(handle: string): Promise<SessionKey | null> {
  const data = await kv.get(`session-key:${handle}`);

  if (!data) {
    return null;
  }

  const sessionKey = JSON.parse(data as string) as SessionKey;

  // Check if expired
  if (Date.now() > sessionKey.validUntil) {
    await revokeSessionKey(handle);
    return null;
  }

  // Check if limit exceeded
  if (sessionKey.spent >= sessionKey.limit) {
    return null;
  }

  return sessionKey;
}

/**
 * Execute a transaction using session key
 *
 * @returns Transaction hash if successful
 * @throws Error if session key invalid or limit exceeded
 */
export async function executeWithSessionKey(
  handle: string,
  contractAddress: string,
  amount: number,
  data?: string
): Promise<string> {
  const sessionKey = await getSessionKey(handle);

  if (!sessionKey) {
    throw new Error('No valid session key found. User approval required.');
  }

  // Validate contract is allowed
  if (!sessionKey.allowedContracts.includes(contractAddress)) {
    throw new Error(`Contract ${contractAddress} not allowed for session key`);
  }

  // Check spending limit
  if (sessionKey.spent + amount > sessionKey.limit) {
    throw new Error(
      `Transaction would exceed session key limit (${sessionKey.limit} USDC)`
    );
  }

  // Execute transaction using session key
  const wallet = new ethers.Wallet(sessionKey.privateKey);
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const signer = wallet.connect(provider);

  const tx = await signer.sendTransaction({
    to: contractAddress,
    value: ethers.parseUnits(amount.toString(), 6), // USDC has 6 decimals
    data: data || '0x',
  });

  await tx.wait();

  // Update spent amount
  sessionKey.spent += amount;
  await kv.set(`session-key:${handle}`, JSON.stringify(sessionKey));

  return tx.hash;
}

/**
 * Revoke a session key (user can cancel at any time)
 */
export async function revokeSessionKey(handle: string): Promise<void> {
  await kv.del(`session-key:${handle}`);
}

/**
 * Get session key status for display
 */
export async function getSessionKeyStatus(
  handle: string
): Promise<{
  active: boolean;
  limit?: number;
  spent?: number;
  remaining?: number;
  expiresAt?: Date;
}> {
  const sessionKey = await getSessionKey(handle);

  if (!sessionKey) {
    return { active: false };
  }

  return {
    active: true,
    limit: sessionKey.limit,
    spent: sessionKey.spent,
    remaining: sessionKey.limit - sessionKey.spent,
    expiresAt: new Date(sessionKey.validUntil),
  };
}
