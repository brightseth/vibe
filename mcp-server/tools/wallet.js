/**
 * vibe_wallet - Check wallet balance and transaction history
 *
 * View your economic state: balance, recent transactions, earnings
 *
 * Examples:
 * - "vibe wallet"
 * - "check my balance"
 * - "show recent transactions"
 */

const fetch = require('node-fetch');

module.exports = {
  name: 'vibe_wallet',
  description: 'Check your wallet balance and recent transactions. Shows tips sent/received, escrows, and current balance.',

  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of recent transactions to show (default 10, max 50)',
        default: 10
      },
      show_balance: {
        type: 'boolean',
        description: 'Show current balance (default true)',
        default: true
      }
    }
  },

  async execute({ limit = 10, show_balance = true }, context) {
    try {
      const handle = context.handle;

      if (!handle) {
        return {
          success: false,
          error: 'Not authenticated. Use vibe init first.'
        };
      }

      const apiUrl = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

      // Fetch transaction history
      const historyResponse = await fetch(
        `${apiUrl}/api/payments/history?handle=${handle}&limit=${Math.min(limit, 50)}`,
        {
          headers: {
            'Authorization': `Bearer ${context.token}`
          }
        }
      );

      const historyResult = await historyResponse.json();

      if (!historyResponse.ok) {
        return {
          success: false,
          error: 'Failed to fetch wallet data',
          details: historyResult.error
        };
      }

      const transactions = historyResult.transactions || [];

      // Calculate balance from transactions (simplified)
      let balance = 0;
      let totalReceived = 0;
      let totalSent = 0;

      transactions.forEach(tx => {
        if (tx.type?.includes('received') || tx.type === 'escrow_completed') {
          totalReceived += tx.amount || 0;
        } else if (tx.type?.includes('sent') || tx.type === 'escrow_created') {
          totalSent += tx.amount || 0;
        }
      });

      balance = totalReceived - totalSent;

      // Format transactions
      const formattedTxs = transactions.slice(0, limit).map(tx => {
        const isReceived = tx.type?.includes('received') || tx.type === 'escrow_completed';
        const icon = isReceived ? '↓' : '↑';
        const peer = isReceived ? tx.from : tx.to;
        const amountStr = isReceived
          ? `+$${tx.amount?.toFixed(2) || '0.00'}`
          : `-$${tx.amount?.toFixed(2) || '0.00'}`;

        return `${icon} ${amountStr.padEnd(10)} ${peer || 'unknown'} (${tx.status})`;
      });

      return {
        success: true,
        wallet: {
          handle,
          balance: `$${balance.toFixed(2)}`,
          total_received: `$${totalReceived.toFixed(2)}`,
          total_sent: `$${totalSent.toFixed(2)}`,
          transaction_count: transactions.length
        },
        formatted: `
💰 Wallet: ${handle}

Balance: $${balance.toFixed(2)}
  Received: $${totalReceived.toFixed(2)}
  Sent: $${totalSent.toFixed(2)}

Recent Transactions (${Math.min(limit, transactions.length)}):
${formattedTxs.length > 0 ? formattedTxs.join('\n') : '  No transactions yet'}

${historyResult.has_more ? `\n(${transactions.length - limit} more transactions...)` : ''}
        `.trim()
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch wallet',
        details: error.message
      };
    }
  }
};
