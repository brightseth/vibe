/**
 * vibe_reputation - Check your reputation score and tier
 *
 * View your standing in the /vibe social hierarchy
 *
 * Examples:
 * - "vibe reputation"
 * - "check my tier"
 * - "show my badges"
 * - "vibe rep leaderboard"
 */

const fetch = require('node-fetch');

module.exports = {
  name: 'vibe_reputation',
  description: 'Check your reputation score, tier, badges, and ranking. Shows economic, social, expert, and creator scores.',

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['score', 'leaderboard'],
        description: 'Action: score (your stats) or leaderboard (top users)',
        default: 'score'
      },
      dimension: {
        type: 'string',
        enum: ['overall', 'economic', 'social', 'expert', 'creator'],
        description: 'Leaderboard dimension (only for leaderboard action)',
        default: 'overall'
      },
      limit: {
        type: 'number',
        description: 'Number of users to show in leaderboard (default 10)',
        default: 10
      }
    }
  },

  async execute({ action = 'score', dimension = 'overall', limit = 10 }, context) {
    try {
      const handle = context.handle;

      if (!handle) {
        return {
          success: false,
          error: 'Not authenticated. Use vibe init first.'
        };
      }

      const apiUrl = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

      if (action === 'score') {
        const response = await fetch(
          `${apiUrl}/api/reputation/score?handle=${handle}`,
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
            error: result.error || 'Failed to fetch reputation',
            message: result.message
          };
        }

        const tierIcons = {
          genesis: '🌱',
          bronze: '🥉',
          silver: '🥈',
          gold: '🥇',
          platinum: '💎',
          diamond: '👑'
        };

        const progressBar = '█'.repeat(Math.floor(result.progress_to_next * 20)) +
                           '░'.repeat(20 - Math.floor(result.progress_to_next * 20));

        const badgeList = result.badges?.slice(0, 5).map(b =>
          `  ${b.icon || '🏆'} ${b.name} (${b.rarity})`
        ) || [];

        return {
          success: true,
          reputation: result,
          formatted: `
⭐ Reputation: ${handle}

Tier: ${tierIcons[result.tier] || ''} ${result.tier.toUpperCase()}
Overall Score: ${result.overall_score}
Global Rank: #${result.rank} (top ${result.percentile.toFixed(1)}%)

Dimension Scores:
  💰 Economic: ${result.scores.economic}
  👥 Social: ${result.scores.social}
  🎓 Expert: ${result.scores.expert}
  🎨 Creator: ${result.scores.creator}

Progress to ${result.next_tier?.toUpperCase() || 'MAX'}:
  [${progressBar}] ${(result.progress_to_next * 100).toFixed(1)}%
  ${result.points_needed > 0 ? `${result.points_needed} points needed` : 'Max tier reached!'}

Badges (${result.badges?.length || 0}):
${badgeList.length > 0 ? badgeList.join('\n') : '  No badges yet'}

Tier Unlocks:
  ${JSON.stringify(result.tier_unlocks, null, 2).replace(/[{}"]/g, '').trim()}
          `.trim()
        };

      } else if (action === 'leaderboard') {
        const response = await fetch(
          `${apiUrl}/api/reputation/leaderboard?dimension=${dimension}&limit=${Math.min(limit, 50)}`,
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

        const tierIcons = {
          genesis: '🌱',
          bronze: '🥉',
          silver: '🥈',
          gold: '🥇',
          platinum: '💎',
          diamond: '👑'
        };

        const leaderboardLines = result.leaderboard?.map(user => {
          const tier = tierIcons[user.tier] || '';
          const scoreField = dimension === 'overall' ? user.overall_score : user.score;
          return `  ${user.rank}. ${user.handle.padEnd(15)} ${scoreField.toString().padStart(5)} ${tier} ${user.tier}`;
        }) || [];

        return {
          success: true,
          leaderboard: result.leaderboard,
          formatted: `
🏆 Reputation Leaderboard (${dimension})

${leaderboardLines.join('\n')}

Dimension: ${dimension}
Total users: ${result.leaderboard?.length || 0}
          `.trim()
        };
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch reputation',
        details: error.message
      };
    }
  }
};
