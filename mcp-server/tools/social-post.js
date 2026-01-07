/**
 * vibe social-post — Post to multiple social channels at once
 *
 * Multi-cast posting with dry-run preview support.
 * Works with local bridges (X, Telegram, Discord, Farcaster).
 */

const twitter = require('../twitter');
const telegram = require('../bridges/telegram');
const discord = require('../discord');
const farcaster = require('../bridges/farcaster');
const { requireInit, header, divider, warning, success } = require('./_shared');

const definition = {
  name: 'vibe_social_post',
  description: 'Post content to one or more social channels (x, telegram, discord, farcaster)',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The content to post'
      },
      channels: {
        type: 'array',
        items: { 
          type: 'string',
          enum: ['x', 'twitter', 'telegram', 'discord', 'farcaster']
        },
        description: 'Channels to post to (e.g., ["x", "farcaster"])'
      },
      dry_run: {
        type: 'boolean',
        description: 'Preview post without sending (default: false)'
      },
      reply_to: {
        type: 'string',
        description: 'Message ID to reply to (format: "platform:id")'
      },
      chat_id: {
        type: 'string',
        description: 'Telegram chat ID (required for telegram channel)'
      },
      farcaster_channel: {
        type: 'string',
        description: 'Farcaster channel ID (e.g., "dev", "builders")'
      }
    },
    required: ['content', 'channels']
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { content, channels, dry_run = false, reply_to, chat_id, farcaster_channel } = args;

  // Validation
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { display: 'Need content to post.' };
  }

  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    return { display: 'Need at least one channel. Options: x, telegram, discord, farcaster' };
  }

  // Normalize channels (twitter -> x)
  const normalizedChannels = channels.map(ch => ch === 'twitter' ? 'x' : ch);

  const trimmed = content.trim();

  // Get bridge statuses
  const bridgeStatuses = await getBridgeStatuses();
  
  // Check requirements
  const errors = [];
  for (const channel of normalizedChannels) {
    if (!bridgeStatuses[channel]) {
      errors.push(`Unknown channel: ${channel}`);
    } else if (!bridgeStatuses[channel].configured) {
      errors.push(`${channel}: Not configured`);
    } else if (channel === 'telegram' && !chat_id) {
      errors.push(`telegram: Need --chat_id parameter`);
    }
  }
  
  if (errors.length > 0) {
    return { 
      display: `${header('Post Error')}\n\n${errors.map(e => `• ${e}`).join('\n')}\n\nRun \`vibe bridges\` to see setup status.`
    };
  }

  // Character limit warnings
  const warnings = [];
  if (normalizedChannels.includes('x') && trimmed.length > 280) {
    warnings.push(`X: Content is ${trimmed.length} chars (max 280). Will be truncated.`);
  }

  // Dry run mode
  if (dry_run) {
    return handleDryRun(trimmed, normalizedChannels, bridgeStatuses, warnings, chat_id, farcaster_channel);
  }

  // Actual posting
  return await handlePost(trimmed, normalizedChannels, reply_to, warnings, chat_id, farcaster_channel);
}

async function getBridgeStatuses() {
  return {
    x: {
      configured: twitter.isConfigured(),
      canWrite: true,
      charLimit: 280
    },
    telegram: {
      configured: telegram.isConfigured(),
      canWrite: true,
      charLimit: null
    },
    discord: {
      configured: discord.isConfigured(),
      canWrite: true,
      charLimit: 2000
    },
    farcaster: {
      configured: farcaster.isConfigured(),
      canWrite: true,
      charLimit: 1024
    }
  };
}

function handleDryRun(content, channels, statuses, warnings, chatId, farcasterChannel) {
  let display = header('Post Preview (Dry Run)');
  display += '\n\n';

  if (warnings.length > 0) {
    display += warning(warnings.join('\n')) + '\n\n';
  }

  for (const channel of channels) {
    const status = statuses[channel];
    const icon = status.configured ? '✅' : '❌';
    const canPost = status.canWrite ? 'can post' : 'read-only';

    display += `${icon} **${channel.toUpperCase()}** — ${canPost}\n`;

    if (!status.configured) {
      display += `   _Not configured_\n`;
    } else {
      let previewContent = content;
      
      // Apply channel-specific formatting
      if (channel === 'x' && status.charLimit && content.length > status.charLimit) {
        previewContent = content.slice(0, status.charLimit - 3) + '...';
        display += `   ⚠️ Will be truncated to ${status.charLimit} chars\n`;
      } else if (channel === 'telegram' && chatId) {
        display += `   📤 To chat ID: ${chatId}\n`;
      } else if (channel === 'farcaster') {
        if (farcasterChannel) {
          display += `   📤 To channel: /${farcasterChannel}\n`;
        } else {
          display += `   📤 To main feed\n`;
        }
      }
      
      const preview = previewContent.length > 100 
        ? previewContent.slice(0, 100) + '...' 
        : previewContent;
      display += `   "${preview}"\n`;
    }
    display += '\n';
  }

  display += divider();
  display += 'Remove `--dry_run` to post for real.';

  return { display };
}

async function handlePost(content, channels, replyTo, warnings, chatId, farcasterChannel) {
  let display = header('Posting...');
  display += '\n\n';

  if (warnings.length > 0) {
    display += warning(warnings.join('\n')) + '\n\n';
  }

  const results = {};
  let anySuccess = false;

  // Post to each channel
  for (const channel of channels) {
    try {
      let result;
      
      switch (channel) {
        case 'x':
          result = await postToX(content, replyTo);
          break;
        case 'telegram':
          result = await postToTelegram(content, chatId, replyTo);
          break;
        case 'discord':
          result = await postToDiscord(content);
          break;
        case 'farcaster':
          result = await postToFarcaster(content, farcasterChannel, replyTo);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
      
      results[channel] = { success: true, ...result };
      anySuccess = true;
      
    } catch (e) {
      results[channel] = { success: false, error: e.message };
    }
  }

  // Format results
  display = header('Post Results');
  display += '\n\n';

  for (const [channel, result] of Object.entries(results)) {
    if (result.success) {
      display += `✅ **${channel.toUpperCase()}** — Posted!\n`;
      if (result.url) {
        display += `   🔗 ${result.url}\n`;
      }
      if (result.id) {
        display += `   ID: ${result.id}\n`;
      }
      if (result.hash) {
        display += `   Hash: ${result.hash}\n`;
      }
    } else {
      display += `❌ **${channel.toUpperCase()}** — Failed: ${result.error}\n`;
    }
    display += '\n';
  }

  if (!anySuccess) {
    display += '\n_No posts succeeded. Check bridge configurations with `vibe bridges`._';
  } else if (Object.keys(results).length > 1) {
    display += divider();
    display += success('Multi-channel post complete! 🚀');
  }

  return { display };
}

async function postToX(content, replyTo) {
  // Handle reply_to format: "x:1234567890" -> "1234567890"
  const tweetId = replyTo?.startsWith('x:') ? replyTo.slice(2) : replyTo;
  
  // Truncate if too long
  const text = content.length > 280 ? content.slice(0, 277) + '...' : content;
  
  const result = await twitter.sendTweet(text, tweetId);
  const id = result.data?.id;
  
  return {
    id,
    url: id ? `https://x.com/seth/status/${id}` : null
  };
}

async function postToTelegram(content, chatId, replyTo) {
  // Handle reply_to format: "telegram:123" -> "123"
  const messageId = replyTo?.startsWith('telegram:') ? replyTo.slice(9) : null;
  
  const options = {};
  if (messageId) {
    options.replyTo = parseInt(messageId);
  }
  
  const result = await telegram.sendMessage(chatId, content, options);
  
  return {
    id: `telegram:${result.message_id}`,
    chat_id: chatId
  };
}

async function postToDiscord(content) {
  const success = await discord.post(content);
  
  if (!success) {
    throw new Error('Discord webhook failed');
  }
  
  return {
    id: 'discord:webhook',
    webhook: true
  };
}

async function postToFarcaster(content, channelId, replyTo) {
  // Handle reply_to format: "farcaster:hash" -> "hash"
  const castHash = replyTo?.startsWith('farcaster:') ? replyTo.slice(10) : replyTo;
  
  const options = {};
  if (channelId) options.channel = channelId;
  if (castHash) options.replyTo = castHash;
  
  const result = await farcaster.publishCast(content, options);
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to publish cast');
  }
  
  const cast = result.cast;
  const username = cast.author.username;
  const hash = cast.hash;
  
  return {
    id: `farcaster:${hash}`,
    hash: hash,
    url: `https://warpcast.com/${username}/${hash.slice(0, 10)}`
  };
}

module.exports = { definition, handler };