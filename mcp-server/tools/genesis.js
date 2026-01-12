/**
 * vibe_genesis - Genesis liquidity mining
 *
 * Deposit USDC to earn yield + Genesis multipliers
 *
 * Actions:
 * - deposit: Lock USDC for yield farming
 * - rewards: Check accumulated rewards
 * - stats: View global Genesis stats
 *
 * Examples:
 * - "vibe genesis deposit $100 for 90 days"
 * - "check my genesis rewards"
 * - "show genesis stats"
 */

const fetch = require('node-fetch');

module.exports = {
  name: 'vibe_genesis',
  description: 'Genesis liquidity mining: deposit USDC to earn yield with early depositor bonuses. Base APY 5%, Genesis multipliers up to 2x, lock bonuses up to 2x.',

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['deposit', 'rewards', 'stats'],
        description: 'Action to perform: deposit (add liquidity), rewards (check earnings), stats (global metrics)'
      },
      amount: {
        type: 'number',
        description: 'Amount to deposit in USD (min $10). Only for deposit action.'
      },
      lock_days: {
        type: 'number',
        enum: [0, 30, 90, 180],
        description: 'Lock period in days: 0 (no lock), 30 (+20% APY), 90 (+50% APY), 180 (+100% APY). Only for deposit action.',
        default: 0
      }
    },
    required: ['action']
  },

  async execute({ action, amount, lock_days = 0 }, context) {
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
        case 'deposit': {
          if (!amount || amount < 10) {
            return {
              success: false,
              error: 'Minimum deposit is $10'
            };
          }

          const response = await fetch(`${apiUrl}/api/genesis/deposit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${context.token}`
            },
            body: JSON.stringify({
              from: handle,
              amount,
              lock_days
            })
          });

          const result = await response.json();

          if (!response.ok) {
            return {
              success: false,
              error: result.error || 'Deposit failed',
              details: result.details
            };
          }

          const effectiveAPY = result.effective_apy * 100;
          const unlockDate = result.unlock_at
            ? new Date(result.unlock_at).toLocaleDateString()
            : 'No lock';

          return {
            success: true,
            message: `Deposited $${amount} to Genesis mining`,
            deposit: {
              deposit_id: result.deposit_id,
              amount: `$${amount}`,
              base_apy: `${(result.base_apy * 100).toFixed(2)}%`,
              genesis_multiplier: `${result.genesis_multiplier}x`,
              effective_apy: `${effectiveAPY.toFixed(2)}%`,
              lock_days,
              unlock_at: unlockDate,
              current_tvl: `$${result.current_tvl.toFixed(2)}`
            },
            formatted: `
💧 Genesis Deposit Successful!

Amount: $${amount}
Lock Period: ${lock_days} days
Unlock: ${unlockDate}

APY Breakdown:
  Base: ${(result.base_apy * 100).toFixed(2)}%
  Genesis Multiplier: ${result.genesis_multiplier}x
  Lock Bonus: ${lock_days >= 180 ? '2.0x' : lock_days >= 90 ? '1.5x' : lock_days >= 30 ? '1.2x' : '1.0x'}

  Effective APY: ${effectiveAPY.toFixed(2)}%

Current TVL: $${result.current_tvl.toFixed(2)}

Rewards accrue daily. Check with: vibe genesis rewards
            `.trim()
          };
        }

        case 'rewards': {
          const response = await fetch(
            `${apiUrl}/api/genesis/rewards?handle=${handle}`,
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
              error: result.error || 'Failed to fetch rewards',
              message: result.message
            };
          }

          const deposits = result.deposits || [];
          const totals = result.totals;

          const depositLines = deposits.map(d => {
            return `  $${d.amount.toFixed(2)} | ${d.days_deposited}d | ${(d.effective_apy * 100).toFixed(2)}% APY | +$${d.unclaimed_rewards.toFixed(2)} earned`;
          });

          return {
            success: true,
            rewards: totals,
            deposits: deposits,
            formatted: `
💰 Genesis Rewards

Total Deposited: $${totals.total_deposited.toFixed(2)}
Unclaimed Rewards: $${totals.total_rewards.toFixed(2)}
Total Value: $${totals.total_value.toFixed(2)}

Active Deposits:
${depositLines.length > 0 ? depositLines.join('\n') : '  No active deposits'}

Rewards accrue daily based on your effective APY.
            `.trim()
          };
        }

        case 'stats': {
          const response = await fetch(`${apiUrl}/api/genesis/stats`);
          const result = await response.json();

          if (!response.ok) {
            return {
              success: false,
              error: 'Failed to fetch stats'
            };
          }

          const tierLines = result.multiplier_tiers?.map(t => {
            const marker = t.status === 'current' ? '→' : t.status === 'passed' ? '✓' : ' ';
            return `  ${marker} ${t.tvl_range.padEnd(12)} ${t.multiplier}x ${t.status}`;
          }) || [];

          return {
            success: true,
            stats: result,
            formatted: `
🌊 Genesis Liquidity Mining Stats

Phase: ${result.genesis_phase} (${result.genesis_progress}% to goal)
Total Value Locked: $${result.tvl.toFixed(2)}
Depositors: ${result.total_depositors}
Avg Deposit: $${result.avg_deposit.toFixed(2)}

Current Multiplier: ${result.current_multiplier}x
Base APY: ${(result.base_apy * 100).toFixed(2)}%

Multiplier Tiers:
${tierLines.join('\n')}

Rewards Distributed: $${result.total_rewards_distributed.toFixed(2)}

Top Depositors:
${result.top_depositors?.slice(0, 5).map((d, i) =>
  `  ${i + 1}. ${d.handle} - $${d.total_deposited.toFixed(2)}`
).join('\n') || '  No depositors yet'}
            `.trim()
          };
        }

        default:
          return {
            success: false,
            error: 'Invalid action. Use: deposit, rewards, or stats'
          };
      }

    } catch (error) {
      return {
        success: false,
        error: 'Genesis action failed',
        details: error.message
      };
    }
  }
};
