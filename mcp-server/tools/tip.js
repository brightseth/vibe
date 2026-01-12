/**
 * vibe_tip - Send a tip to another user
 *
 * Makes the entire payment layer accessible from Claude Code conversations
 *
 * Examples:
 * - "tip @alice $5 for helping debug"
 * - "send @bob $10 thanks for the intro"
 * - "vibe tip @charlie 2.50"
 */

const fetch = require('node-fetch');

module.exports = {
  name: 'vibe_tip',
  description: 'Send a tip to another user. Tips are instant payments via blockchain (2.5% fee). Example: vibe_tip @alice 5 "thanks for the help!"',

  inputSchema: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Recipient handle (e.g., @alice)'
      },
      amount: {
        type: 'number',
        description: 'Amount in USD (e.g., 5.00). Min $0.01, Max $100'
      },
      message: {
        type: 'string',
        description: 'Optional message to include with the tip'
      }
    },
    required: ['to', 'amount']
  },

  async execute({ to, amount, message }, context) {
    try {
      const from = context.handle;

      if (!from) {
        return {
          success: false,
          error: 'Not authenticated. Use vibe init first.'
        };
      }

      // Validate amount
      if (amount <= 0 || amount > 100) {
        return {
          success: false,
          error: 'Amount must be between $0.01 and $100'
        };
      }

      // Call payment API
      const apiUrl = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

      const response = await fetch(`${apiUrl}/api/payments/tip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.token}`
        },
        body: JSON.stringify({
          from,
          to,
          amount,
          message
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Tip failed',
          details: result.details
        };
      }

      // Format success message
      const fee = result.fee || (amount * 0.025);
      const net = amount - fee;

      return {
        success: true,
        message: `💰 Tipped ${to} $${amount}`,
        details: {
          recipient: to,
          amount: `$${amount}`,
          fee: `$${fee.toFixed(2)} (2.5%)`,
          net_to_recipient: `$${net.toFixed(2)}`,
          tx_hash: result.tx_hash,
          status: result.status,
          explorer_url: `https://sepolia.basescan.org/tx/${result.tx_hash}`
        },
        formatted: `
✓ Tip sent!
  To: ${to}
  Amount: $${amount}
  Fee: $${fee.toFixed(2)}
  Net: $${net.toFixed(2)}
  ${message ? `Message: "${message}"` : ''}

  Tx: ${result.tx_hash?.substring(0, 10)}...
  Status: ${result.status}
        `.trim()
      };

    } catch (error) {
      return {
        success: false,
        error: 'Tip failed',
        details: error.message
      };
    }
  }
};
