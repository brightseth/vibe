/**
 * vibe social-inbox — Unified social inbox across all channels
 *
 * Reads from connected bridges, webhook events, and caches for instant access.
 * Use --refresh to sync from external APIs.
 */

const twitter = require('../twitter');
const telegram = require('../bridges/telegram');
const farcaster = require('../bridges/farcaster');
const { requireInit, header, divider, formatTimeAgo } = require('./_shared');

const definition = {
  name: 'vibe_social_inbox',
  description: 'See messages across all connected social channels (X, Farcaster, Telegram, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        enum: ['all', 'x', 'farcaster', 'discord', 'telegram', 'whatsapp', 'email', 'webhooks'],
        description: 'Filter by channel (default: all)'
      },
      high_signal: {
        type: 'boolean',
        description: 'Show only high-signal messages like mentions/DMs (default: true)'
      },
      limit: {
        type: 'number',
        description: 'Number of messages to show (default: 20, max: 50)'
      },
      refresh: {
        type: 'boolean',
        description: 'Force sync from external APIs (default: false)'
      },
      status: {
        type: 'boolean',
        description: 'Show channel connection status (default: false)'
      },
      include_webhooks: {
        type: 'boolean',
        description: 'Include real-time webhook events (default: true)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const {
    channel = 'all',
    high_signal = true,
    limit = 20,
    refresh = false,
    status = false,
    include_webhooks = true
  } = args;

  try {
    // Status view
    if (status) {
      return await handleStatus();
    }

    // Get messages from bridges
    const messages = await getUnifiedInbox(channel, limit, refresh, high_signal, include_webhooks);

    if (messages.length === 0) {
      let display = header('Social Inbox');
      display += '\n\n';
      display += '_No messages found._\n\n';
      display += 'Run `vibe social-inbox --status` to check channel connections.\n';
      display += 'Run `vibe social-inbox --refresh` to sync from external APIs.\n';
      display += 'Run `vibe social-inbox --include_webhooks false` to exclude webhook events.';
      return { display };
    }

    // Format inbox view
    let display = header(`Social Inbox (${messages.length})`);
    display += '\n\n';

    // Group by channel for summary
    const byChannel = {};
    const byType = {};
    for (const msg of messages) {
      byChannel[msg.channel] = (byChannel[msg.channel] || 0) + 1;
      byType[msg.type] = (byType[msg.type] || 0) + 1;
    }

    const channelSummary = Object.entries(byChannel)
      .map(([ch, count]) => `${ch}: ${count}`)
      .join(' | ');
    display += `📬 ${channelSummary}\n`;

    const typeSummary = Object.entries(byType)
      .map(([type, count]) => `${type}: ${count}`)
      .join(' | ');
    display += `📋 ${typeSummary}\n`;
    display += divider();
    display += '\n';

    // Show messages
    for (const msg of messages) {
      display += formatMessage(msg);
      display += '\n';
    }

    display += divider();
    display += '**Reply with:**\n';
    display += '• `vibe social-post --content "reply" --channels ["x"]`\n';
    display += '• `vibe farcaster --action cast --text "reply" --reply_to HASH`\n';
    display += '• `vibe x-reply "reply" --reply_to TWEET_ID`\n';
    display += '• `vibe social-inbox --channel webhooks` for webhook events only';

    return { display };

  } catch (e) {
    return {
      display: `${header('Social Inbox')}\n\n_Error:_ ${e.message}`
    };
  }
}

async function handleStatus() {
  let display = header('Channel Status');
  display += '\n\n';

  const channels = await getChannelStatuses();

  for (const [name, status] of Object.entries(channels)) {
    const icon = status.connected ? '✅' : (status.configured ? '⚠️' : '❌');
    display += `${icon} **${name.toUpperCase()}**\n`;
    
    if (status.connected && status.username) {
      display += `   Connected as @${status.username}\n`;
    }
    
    display += `   Configured: ${status.configured ? 'Yes' : 'No'}\n`;
    display += `   Can read: ${status.canRead ? 'Yes' : 'No'}\n`;
    display += `   Can write: ${status.canWrite ? 'Yes' : 'No'}\n`;
    
    if (status.webhook_active) {
      display += `   Webhook: Active (real-time events)\n`;
    }
    
    if (status.error) {
      display += `   Error: ${status.error}\n`;
    }
    
    if (status.setup) {
      display += `   Setup: ${status.setup}\n`;
    }
    
    display += '\n';
  }

  display += divider();
  display += '**Quick setup:**\n';
  display += '• `vibe bridges` - See all bridge statuses\n';
  display += '• `vibe telegram-bot --action setup` - Setup Telegram\n';
  display += '• `vibe farcaster --action status` - Test Farcaster\n';
  display += '• X webhook endpoint: `/api/webhooks/x` (configured via env)';

  return { display };
}

async function getChannelStatuses() {
  const statuses = {};

  // X/Twitter
  statuses.x = {
    configured: twitter.isConfigured(),
    connected: false,
    canRead: true,
    canWrite: true,
    setup: 'Add credentials to config.json'
  };

  if (statuses.x.configured) {
    try {
      const me = await twitter.getMe();
      statuses.x.connected = true;
      statuses.x.username = me.data.username;
      
      // Check if webhook is configured
      const webhookSecret = process.env.X_WEBHOOK_SECRET;
      statuses.x.webhook_active = !!webhookSecret;
    } catch (e) {
      statuses.x.error = e.message;
    }
  }

  // Telegram
  statuses.telegram = {
    configured: telegram.isConfigured(),
    connected: false,
    canRead: true,
    canWrite: true,
    setup: 'vibe telegram-bot --action setup'
  };

  if (statuses.telegram.configured) {
    try {
      const botInfo = await telegram.getBotInfo();
      statuses.telegram.connected = true;
      statuses.telegram.username = botInfo.username;
    } catch (e) {
      statuses.telegram.error = e.message;
    }
  }

  // Farcaster
  statuses.farcaster = {
    configured: farcaster.isConfigured(),
    connected: false,
    canRead: true,
    canWrite: true,
    setup: 'Add NEYNAR_API_KEY + signer to config.json'
  };

  if (statuses.farcaster.configured) {
    try {
      const userInfo = await farcaster.getUser();
      statuses.farcaster.connected = true;
      statuses.farcaster.username = userInfo.users[0].username;
    } catch (e) {
      statuses.farcaster.error = e.message;
    }
  }

  // Discord (placeholder)
  statuses.discord = {
    configured: false,
    connected: false,
    canRead: false,
    canWrite: true,
    setup: 'Add DISCORD_WEBHOOK_URL (send only)'
  };

  // Webhooks status
  statuses.webhooks = {
    configured: true,
    connected: true,
    canRead: true,
    canWrite: false,
    setup: 'Real-time events via /api/webhooks/*'
  };

  return statuses;
}

async function getWebhookInboxEvents(limit) {
  try {
    // Try to get KV store
    const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    if (!KV_CONFIGURED) return [];

    const { kv } = await import('@vercel/kv');
    const inboxKey = 'vibe:social_inbox';
    
    // Get recent webhook events
    const rawEvents = await kv.lrange(inboxKey, 0, limit - 1);
    
    return rawEvents.map(eventStr => {
      const event = JSON.parse(eventStr);
      return {
        id: event.id,
        channel: event.platform,
        type: event.type,
        from: event.from,
        content: event.content,
        timestamp: event.timestamp,
        timeAgo: formatTimeAgo(new Date(event.timestamp)),
        source: 'webhook',
        processed: event.processed,
        metadata: event.metadata
      };
    });
    
  } catch (e) {
    console.error('Error fetching webhook events:', e);
    return [];
  }
}

async function getUnifiedInbox(channel, limit, refresh, highSignal, includeWebhooks) {
  const messages = [];

  // Get webhook events first (real-time data)
  if (includeWebhooks && (channel === 'all' || channel === 'webhooks' || channel === 'x')) {
    try {
      const webhookEvents = await getWebhookInboxEvents(Math.min(20, limit));
      messages.push(...webhookEvents);
    } catch (e) {
      console.error('Webhook events error:', e.message);
    }
  }

  // X mentions (direct API call)
  if ((channel === 'all' || channel === 'x') && twitter.isConfigured()) {
    try {
      const mentions = await twitter.getMentions();
      if (mentions.data) {
        for (const mention of mentions.data.slice(0, Math.min(10, limit))) {
          // Skip if we already have this from webhook
          const webhookVersion = messages.find(m => m.metadata?.tweetId === mention.id);
          if (webhookVersion) continue;

          messages.push({
            id: `x:${mention.id}`,
            channel: 'x',
            type: 'mention',
            from: getTwitterAuthor(mention, mentions.includes),
            content: mention.text,
            timestamp: mention.created_at,
            timeAgo: formatTimeAgo(new Date(mention.created_at)),
            source: 'api',
            raw: mention
          });
        }
      }
    } catch (e) {
      console.error('X mentions error:', e.message);
    }
  }

  // Farcaster mentions
  if ((channel === 'all' || channel === 'farcaster') && farcaster.isConfigured()) {
    try {
      const mentions = await farcaster.getMentions(null, Math.min(10, limit));
      if (mentions.notifications) {
        for (const notification of mentions.notifications) {
          if (notification.cast) {
            const processed = farcaster.processCast(notification.cast);
            messages.push({
              ...processed,
              type: 'mention',
              timeAgo: formatTimeAgo(new Date(processed.timestamp)),
              source: 'api'
            });
          }
        }
      }
    } catch (e) {
      console.error('Farcaster mentions error:', e.message);
    }
  }

  // Sort by timestamp (newest first)
  messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Filter high signal if requested
  if (highSignal) {
    return messages.filter(msg => 
      msg.type === 'mention' || 
      msg.type === 'dm' || 
      msg.type === 'follow'
    ).slice(0, limit);
  }

  return messages.slice(0, limit);
}

function getTwitterAuthor(tweet, includes) {
  if (includes && includes.users) {
    const author = includes.users.find(user => user.id === tweet.author_id);
    if (author) {
      return {
        id: author.id,
        handle: author.username,
        name: author.name
      };
    }
  }
  
  return {
    id: tweet.author_id,
    handle: 'unknown',
    name: 'Unknown User'
  };
}

function formatMessage(msg) {
  const channelIcon = getChannelIcon(msg.channel);
  const typeIcon = getTypeIcon(msg.type);
  const sourceIcon = msg.source === 'webhook' ? '⚡' : '📡';

  let result = `${channelIcon} ${sourceIcon} **@${msg.from.handle}** ${typeIcon} — _${msg.timeAgo}_\n`;
  result += `${msg.content}\n`;
  
  // Show engagement if available
  if (msg.replies > 0 || msg.reactions > 0 || msg.recasts > 0) {
    const metrics = [];
    if (msg.replies > 0) metrics.push(`${msg.replies} replies`);
    if (msg.reactions > 0) metrics.push(`${msg.reactions} likes`);
    if (msg.recasts > 0) metrics.push(`${msg.recasts} recasts`);
    result += `_${metrics.join(' • ')}_\n`;
  }
  
  // Show metadata if available
  if (msg.metadata?.url) {
    result += `_${msg.metadata.url}_\n`;
  }
  
  result += `_[${msg.id}]_\n`;
  
  return result;
}

function getChannelIcon(channel) {
  const icons = {
    x: '𝕏',
    farcaster: '🟣',
    discord: '💬',
    telegram: '✈️',
    whatsapp: '💚',
    email: '📧'
  };
  return icons[channel] || '📱';
}

function getTypeIcon(type) {
  const icons = {
    mention: '@',
    reply: '↩️',
    dm: '✉️',
    like: '❤️',
    repost: '🔁',
    cast: '📡',
    follow: '👤'
  };
  return icons[type] || '';
}

module.exports = { definition, handler };