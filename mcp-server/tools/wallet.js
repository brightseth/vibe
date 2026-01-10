const { ensureWallet, getWalletAddress, getBalance, hasWallet } = require('../../lib/cdp/wallet-helpers');
const { query } = require('../../api/lib/db');

/**
 * vibe wallet - View wallet status, balance, or create wallet
 *
 * Commands:
 *   vibe wallet          # View balance/status
 *   vibe wallet create   # Explicitly create wallet
 *   vibe wallet deposit  # Show deposit instructions
 *   vibe wallet withdraw # Withdraw to Coinbase/bank
 *   vibe wallet history  # Transaction history
 */

module.exports = {
  name: 'vibe_wallet',
  description: 'Manage your /vibe wallet (USDC on Base)',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'create', 'deposit', 'withdraw', 'history'],
        description: 'Action to perform (default: status)',
      },
      amount: {
        type: 'number',
        description: 'Amount for withdraw (USDC)',
      },
      destination: {
        type: 'string',
        description: 'Destination address for withdrawal',
      },
    },
  },

  handler: async (args, context) => {
    const { action = 'status' } = args;
    const handle = context.handle; // From authenticated session

    if (!handle) {
      return {
        error: true,
        message: 'Not authenticated. Run: vibe init @yourhandle',
      };
    }

    try {
      // ACTION: Create wallet explicitly
      if (action === 'create') {
        const exists = await hasWallet(handle);

        if (exists) {
          const address = await getWalletAddress(handle);
          const balance = await getBalance(handle);

          return {
            success: false,
            message: `You already have a wallet!

Address: ${address}
Balance: $${balance.toFixed(2)} USDC
Network: Base

Commands:
  vibe wallet         # View status
  vibe wallet deposit # Add funds
`,
          };
        }

        // Create wallet
        const address = await ensureWallet(handle, 'explicit_create');

        return {
          success: true,
          address,
          message: `✓ Wallet created on Base!

Address: ${address}
Balance: $0.00 USDC
Network: Base (Coinbase L2)

Next steps:
  vibe wallet deposit # Add USDC to start transacting
  vibe wallet         # Check balance anytime

Your wallet is a smart contract - no gas fees, no seed phrases.
Managed by Coinbase Developer Platform.
`,
        };
      }

      // ACTION: Show deposit instructions
      if (action === 'deposit') {
        const address = await getWalletAddress(handle);

        if (!address) {
          return {
            error: true,
            message: `No wallet yet!

You'll get a wallet automatically when:
  • Someone pays you
  • You pay for a service

Or create one now: vibe wallet create
`,
          };
        }

        return {
          success: true,
          address,
          message: `💳 Deposit USDC to your /vibe wallet

Address: ${address}
Network: Base (Coinbase L2)
Token: USDC

Options:
1. Coinbase → Withdraw to this address (instant)
2. Bridge from Ethereum: https://bridge.base.org
3. Send USDC directly on Base network

⚠️  Important:
- Only send USDC on Base network
- Do NOT send ETH or other tokens (will be lost)
- Minimum: $1 USDC

Check balance: vibe wallet
`,
        };
      }

      // ACTION: View status (default)
      const address = await getWalletAddress(handle);

      if (!address) {
        return {
          success: false,
          message: `No wallet yet!

You'll get a wallet automatically when:
  • Someone pays you for helping
  • You pay for a service (like ping.money expert help)
  • You receive funds from another user

This keeps /vibe simple - wallets emerge only when you transact.

Want to create one now?
  vibe wallet create

Questions?
  Wallets are smart contracts on Base (Coinbase's L2)
  No gas fees, no seed phrases, managed by CDP
`,
        };
      }

      // Get balance
      const balance = await getBalance(handle);

      // Get recent transactions
      const txResult = await query(
        `SELECT event_type, amount, metadata, created_at
         FROM wallet_events
         WHERE handle = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [handle.replace('@', '')]
      );

      const recentTx = txResult.rows.map(tx => {
        const amount = tx.amount ? `$${parseFloat(tx.amount).toFixed(2)}` : '';
        const type = tx.event_type;
        const date = new Date(tx.created_at).toLocaleDateString();
        return `  ${type.padEnd(12)} ${amount.padEnd(8)} ${date}`;
      });

      return {
        success: true,
        address,
        balance,
        message: `💰 Your /vibe Wallet

Address: ${address.slice(0, 8)}...${address.slice(-6)}
Balance: $${balance.toFixed(2)} USDC
Network: Base (Coinbase L2)

Recent activity:
${recentTx.length > 0 ? recentTx.join('\n') : '  No transactions yet'}

Commands:
  vibe wallet deposit  # Add funds
  vibe wallet withdraw # Send to Coinbase/bank
  vibe wallet history  # Full transaction log

View on Basescan:
https://basescan.org/address/${address}
`,
      };
    } catch (error) {
      console.error('Wallet error:', error);

      return {
        error: true,
        message: `Wallet error: ${error.message}

If this persists, contact support or check:
https://docs.cdp.coinbase.com/
`,
      };
    }
  },
};
