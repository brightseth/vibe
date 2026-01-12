/**
 * vibe_agent_treasury - Manage agent economic state
 *
 * For AI agents: create treasury, earn, spend, check balance
 *
 * Actions:
 * - create: Initialize agent treasury
 * - balance: Check treasury balance
 * - spend: Autonomous spending (requires session key)
 * - earnings: View earning history
 *
 * Examples:
 * - "vibe agent create treasury"
 * - "check agent balance"
 * - "agent tip @alice $5"
 */

const fetch = require('node-fetch');

module.exports = {
  name: 'vibe_agent_treasury',
  description: 'Manage agent treasury - create wallet, earn, spend autonomously, track balance. Enables agents as economic actors.',

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'balance', 'spend', 'earnings', 'leaderboard'],
        description: 'Action to perform'
      },
      daily_budget: {
        type: 'number',
        description: 'Daily spending budget in USD (for create action, default $10)',
        default: 10
      },
      amount: {
        type: 'number',
        description: 'Amount to spend (for spend action)'
      },
      recipient: {
        type: 'string',
        description: 'Recipient handle for spending (for spend action)'
      },
      spending_type: {
        type: 'string',
        enum: ['tip', 'service_payment', 'data_purchase'],
        description: 'Type of spending (for spend action)',
        default: 'tip'
      }
    },
    required: ['action']
  },

  async execute({ action, daily_budget = 10, amount, recipient, spending_type = 'tip' }, context) {
    try {
      const handle = context.handle;

      if (!handle) {
        return {
          success: false,
          error: 'Not authenticated. Use vibe init first.'
        };
      }

      const apiUrl = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

      switch (action) {
        case 'create': {
          const response = await fetch(`${apiUrl}/api/agents/wallet/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${context.token}`
            },
            body: JSON.stringify({
              agent_handle: handle,
              daily_budget,
              tier: 'genesis'
            })
          });

          const result = await response.json();

          if (!response.ok) {
            return {
              success: false,
              error: result.error || 'Failed to create treasury'
            };
          }

          return {
            success: true,
            message: `Agent treasury created for ${handle}`,
            treasury: {
              agent_handle: result.agent_handle,
              wallet_address: result.wallet_address,
              daily_budget: `$${result.daily_budget}`,
              tier: result.tier,
              commission_rate: `${(result.commission_rate * 100).toFixed(2)}%`
            },
            formatted: `
🤖 Agent Treasury Created!

Agent: ${result.agent_handle}
Wallet: ${result.wallet_address}

Daily Budget: $${result.daily_budget}
Commission Rate: ${(result.commission_rate * 100).toFixed(2)}%
Tier: ${result.tier}

Your agent can now:
  • Earn from tips, commissions, services
  • Spend autonomously (with session key)
  • Participate in the economy

Check balance: vibe agent_treasury balance
            `.trim()
          };
        }

        case 'balance': {
          const response = await fetch(
            `${apiUrl}/api/agents/wallet/treasury?agent_handle=${handle}`,
            {
              headers: {
                'Authorization': `Bearer ${context.token}`
              }
            }
          );

          const result = await response.json();

          if (!response.ok) {
            return {
              success: false,
              error: result.error || 'Treasury not found',
              message: result.message
            };
          }

          const earningsByType = result.earnings_breakdown?.map(e =>
            `  ${e.type}: $${e.total.toFixed(2)} (${e.count} events)`
          ) || [];

          return {
            success: true,
            treasury: result,
            formatted: `
💰 Agent Treasury: ${handle}

Balances:
  Current: $${result.balances.current.toFixed(2)}
  Total Earned: $${result.balances.total_earned.toFixed(2)}
  Total Spent: $${result.balances.total_spent.toFixed(2)}

Daily Budget:
  Limit: $${result.budget.daily_limit.toFixed(2)}
  Spent Today: $${result.budget.daily_spent.toFixed(2)}
  Remaining: $${result.budget.daily_remaining.toFixed(2)}
  Resets: ${new Date(result.budget.resets_at).toLocaleString()}

Tier: ${result.tier}
Commission Rate: ${(result.commission_rate * 100).toFixed(2)}%
Session Key: ${result.session_key_active ? '✓ Active' : '✗ Inactive'}

Earnings Breakdown:
${earningsByType.length > 0 ? earningsByType.join('\n') : '  No earnings yet'}

Recent Transactions: ${result.recent_earnings?.length || 0} earnings, ${result.recent_spending?.length || 0} spending
            `.trim()
          };
        }

        case 'spend': {
          if (!amount || !recipient) {
            return {
              success: false,
              error: 'Amount and recipient required for spending'
            };
          }

          // Note: This requires a session key which should be managed separately
          return {
            success: false,
            error: 'Autonomous spending requires session key configuration',
            message: 'Contact administrator to enable session keys for your agent'
          };
        }

        case 'earnings': {
          const response = await fetch(
            `${apiUrl}/api/agents/wallet/treasury?agent_handle=${handle}&include_history=true`,
            {
              headers: {
                'Authorization': `Bearer ${context.token}`
              }
            }
          );

          const result = await response.json();

          if (!response.ok) {
            return {
              success: false,
              error: 'Failed to fetch earnings'
            };
          }

          const earningLines = result.recent_earnings?.slice(0, 10).map(e =>
            `  +$${e.amount.toFixed(2)} | ${e.type} | ${e.source || 'system'}`
          ) || [];

          return {
            success: true,
            earnings: result.recent_earnings,
            formatted: `
💵 Agent Earnings: ${handle}

Total Earned: $${result.balances.total_earned.toFixed(2)}

Recent Earnings (${result.recent_earnings?.length || 0}):
${earningLines.length > 0 ? earningLines.join('\n') : '  No earnings yet'}

Start earning by:
  • Receiving tips from users
  • Facilitating transactions (commission)
  • Providing expert services
  • Contributing to liquidity
            `.trim()
          };
        }

        case 'leaderboard': {
          const response = await fetch(
            `${apiUrl}/api/agents/leaderboard?metric=balance&limit=20`,
            {
              headers: {
                'Authorization': `Bearer ${context.token}`
              }
            }
          );

          const result = await response.json();

          if (!response.ok) {
            return {
              success: false,
              error: 'Failed to fetch leaderboard'
            };
          }

          const leaderLines = result.agents?.slice(0, 15).map(a =>
            `  ${a.rank}. ${a.agent_handle.padEnd(20)} $${a.current_balance.toFixed(2).padStart(10)} ${a.tier}`
          ) || [];

          return {
            success: true,
            leaderboard: result.agents,
            formatted: `
🏆 Agent Economic Leaderboard

${leaderLines.join('\n')}

Stats:
  Total Agents: ${result.stats.total_agents}
  Total Balance: $${result.stats.total_balance.toFixed(2)}
  Avg Balance: $${result.stats.avg_balance.toFixed(2)}
            `.trim()
          };
        }

        default:
          return {
            success: false,
            error: 'Invalid action. Use: create, balance, earnings, or leaderboard'
          };
      }

    } catch (error) {
      return {
        success: false,
        error: 'Agent treasury action failed',
        details: error.message
      };
    }
  }
};
