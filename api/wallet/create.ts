import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCDPClient } from '../../lib/cdp/client';
import { kv } from '@vercel/kv';
import { query } from '../../api/lib/db';

/**
 * POST /api/wallet/create
 *
 * Create a smart wallet for a new /vibe user
 *
 * Called automatically during `vibe init` if user doesn't have a wallet
 *
 * Request body:
 * {
 *   "handle": "@seth",
 *   "githubId": "12345",
 *   "email": "seth@example.com" (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "address": "0x...",
 *   "message": "Smart wallet created on Base"
 * }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { handle, githubId, email } = req.body;

    if (!handle || !githubId) {
      return res.status(400).json({
        error: 'Missing required fields: handle, githubId',
      });
    }

    // Check if wallet already exists
    const existingWallet = await kv.get(`wallet:${handle}`);
    if (existingWallet) {
      return res.status(400).json({
        error: 'Wallet already exists for this handle',
        address: JSON.parse(existingWallet as string).address,
      });
    }

    // Create smart wallet via CDP
    const cdp = getCDPClient();
    const wallet = await cdp.createSmartWallet(githubId, handle);

    // Store wallet data in KV (encrypted wallet export)
    await kv.set(`wallet:${handle}`, wallet.walletData);

    // Update users table with wallet address
    await query(
      `UPDATE users
       SET wallet_address = $1,
           wallet_provider = 'cdp',
           wallet_created_at = NOW()
       WHERE handle = $2`,
      [wallet.address, handle.replace('@', '')]
    );

    // Log wallet creation event
    await query(
      `INSERT INTO wallet_events (handle, event_type, wallet_address, metadata)
       VALUES ($1, 'created', $2, $3)`,
      [
        handle.replace('@', ''),
        wallet.address,
        JSON.stringify({
          provider: 'cdp',
          network: 'base',
          githubId,
          email: email || null,
        }),
      ]
    );

    return res.status(200).json({
      success: true,
      address: wallet.address,
      network: 'base',
      message: `✓ Smart wallet created on Base

Your address: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}

To enable Claude to spend without prompts:
  vibe session-key --limit 10

This allows autonomous transactions up to $10 USDC.`,
    });
  } catch (error: any) {
    console.error('Wallet creation error:', error);

    return res.status(500).json({
      error: 'Failed to create wallet',
      details: error.message,
    });
  }
}
