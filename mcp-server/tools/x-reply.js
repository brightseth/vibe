/**
 * vibe x-reply — Reply to an X tweet or send a tweet
 *
 * Allows sending tweets from terminal.
 */

const twitter = require('../twitter');
const { requireInit, header, truncate, warning } = require('./_shared');

const definition = {
  name: 'vibe_x_reply',
  description: 'Reply to an X tweet or send a new tweet from terminal.',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The tweet text (max 280 chars)'
      },
      reply_to: {
        type: 'string',
        description: 'Tweet ID to reply to (optional - omit for new tweet)'
      }
    },
    required: ['text']
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { text, reply_to } = args;

  // Check if X is configured
  if (!twitter.isConfigured()) {
    return {
      display: `${header('X Reply')}\n\n_X not configured._ Add credentials to ~/.vibecodings/config.json`
    };
  }

  // Validate text length
  if (!text || text.trim().length === 0) {
    return { display: 'Need tweet text.' };
  }

  const trimmed = text.trim();
  if (trimmed.length > 280) {
    return {
      display: `Tweet too long (${trimmed.length} chars). Max 280.`
    };
  }

  try {
    const result = await twitter.sendTweet(trimmed, reply_to || null);

    const tweetId = result.data?.id;
    const tweetUrl = tweetId ? `https://x.com/seth/status/${tweetId}` : null;

    let display = '';
    if (reply_to) {
      display = `**Replied to tweet ${reply_to}**\n\n`;
    } else {
      display = `**Tweeted**\n\n`;
    }

    display += `"${truncate(trimmed, 100)}"\n\n`;

    if (tweetUrl) {
      display += `🔗 ${tweetUrl}`;
    }

    return { display };

  } catch (e) {
    return {
      display: `${header('X Reply')}\n\n_Error:_ ${e.message}`
    };
  }
}

module.exports = { definition, handler };
