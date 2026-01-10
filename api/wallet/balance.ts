import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCDPClient } from '../../lib/cdp/client';
import { query } from '../../api/lib/db';

/**
 * GET /api/wallet/balance?handle=@seth
 *
 * Get USDC balance for a user's wallet
 *
 * Response:
 * {
 *   "balance": 50.25,
 *   "address": "0x...",
 *   "network": "base"
 * }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { handle } = req.query;

    if (!handle || typeof handle !== 'string') {
      return res.status(400).json({ error: 'Missing handle parameter' });
    }

    // Get wallet address from database
    const result = await query(
      `SELECT wallet_address, wallet_provider
       FROM users
       WHERE handle = $1`,
      [handle.replace('@', '')]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { wallet_address, wallet_provider } = result.rows[0];

    if (!wallet_address) {
      return res.status(404).json({
        error: 'No wallet found',
        message: 'Run "vibe wallet create" to set up your wallet',
      });
    }

    if (wallet_provider !== 'cdp') {
      return res.status(400).json({
        error: 'Wallet not managed by CDP',
        provider: wallet_provider,
      });
    }

    // Get balance from CDP
    const cdp = getCDPClient();
    const balance = await cdp.getUSDCBalance(wallet_address);

    return res.status(200).json({
      balance,
      address: wallet_address,
      network: 'base',
      formatted: `$${balance.toFixed(2)} USDC`,
    });
  } catch (error: any) {
    console.error('Balance check error:', error);

    return res.status(500).json({
      error: 'Failed to check balance',
      details: error.message,
    });
  }
}
