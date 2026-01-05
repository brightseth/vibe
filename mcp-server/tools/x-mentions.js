/**
 * vibe x-mentions — See your X mentions
 *
 * Pulls recent mentions from X/Twitter into /vibe.
 */

const twitter = require('../twitter');
const { requireInit, header, divider, formatTimeAgo } = require('./_shared');

const definition = {
  name: 'vibe_x_mentions',
  description: 'See your recent X/Twitter mentions. Brings X activity into /vibe.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of mentions to show (default: 10, max: 100)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  // Check if X is configured
  if (!twitter.isConfigured()) {
    return {
      display: `${header('X Mentions')}\n\n_X not configured._ Add credentials to ~/.vibecodings/config.json`
    };
  }

  try {
    const mentions = await twitter.getMentions();

    if (!mentions.data || mentions.data.length === 0) {
      return {
        display: `${header('X Mentions')}\n\n_No recent mentions._`
      };
    }

    // Build user lookup map
    const userMap = {};
    if (mentions.includes?.users) {
      for (const user of mentions.includes.users) {
        userMap[user.id] = user;
      }
    }

    let display = header(`X Mentions (${mentions.data.length})`);
    display += '\n\n';

    for (const tweet of mentions.data) {
      const user = userMap[tweet.author_id] || { username: 'unknown', name: 'Unknown' };
      const timeAgo = formatTimeAgo(new Date(tweet.created_at).getTime());
      const text = tweet.text.length > 140 ? tweet.text.slice(0, 140) + '...' : tweet.text;

      display += `**@${user.username}** — _${timeAgo}_\n`;
      display += `${text}\n`;
      display += `_[reply: tweet_id=${tweet.id}]_\n\n`;
    }

    display += divider();
    display += `Say "reply to tweet_id=... with 'message'" to respond`;

    // Add hint for triage if many mentions
    const response = { display };
    if (mentions.data.length >= 5) {
      response.hint = 'x_triage_recommended';
      response.mention_count = mentions.data.length;
    }

    return response;

  } catch (e) {
    return {
      display: `${header('X Mentions')}\n\n_Error:_ ${e.message}`
    };
  }
}

module.exports = { definition, handler };
