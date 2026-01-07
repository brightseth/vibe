/**
 * /vibe Discord Bot Bridge
 *
 * Two-way Discord integration using Discord.js bot API.
 * Complements discord.js webhook functionality with full bot features.
 */

const config = require('../config');

/**
 * Get Discord bot credentials from config
 */
function getBotToken() {
  const cfg = config.load();
  return cfg.discord_bot_token || process.env.DISCORD_BOT_TOKEN || null;
}

/**
 * Get guild ID from config (optional - bot can work in any server)
 */
function getGuildId() {
  const cfg = config.load();
  return cfg.discord_guild_id || process.env.DISCORD_GUILD_ID || null;
}

/**
 * Check if Discord bot is configured
 */
function isConfigured() {
  return !!getBotToken();
}

/**
 * Make authenticated request to Discord API
 */
async function discordRequest(method, endpoint, body = null) {
  const token = getBotToken();
  if (!token) throw new Error('Discord bot token not configured');

  const url = `https://discord.com/api/v10${endpoint}`;
  
  const headers = {
    'Authorization': `Bot ${token}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord API error ${response.status}: ${error}`);
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Get bot user info
 */
async function getBotInfo() {
  return discordRequest('GET', '/users/@me');
}

/**
 * Get guilds (servers) the bot is in
 */
async function getGuilds() {
  return discordRequest('GET', '/users/@me/guilds');
}

/**
 * Get channels in a guild
 */
async function getChannels(guildId) {
  return discordRequest('GET', `/guilds/${guildId}/channels`);
}

/**
 * Send message to a channel
 */
async function sendMessage(channelId, content, options = {}) {
  const body = {
    content,
    embeds: options.embeds || undefined,
    reply: options.replyTo ? { message_id: options.replyTo } : undefined,
    flags: options.silent ? 4096 : undefined // SUPPRESS_NOTIFICATIONS
  };

  return discordRequest('POST', `/channels/${channelId}/messages`, body);
}

/**
 * Get recent messages from a channel
 */
async function getMessages(channelId, limit = 50, before = null) {
  let endpoint = `/channels/${channelId}/messages?limit=${limit}`;
  if (before) endpoint += `&before=${before}`;
  
  return discordRequest('GET', endpoint);
}

/**
 * Create a DM channel with a user
 */
async function createDM(userId) {
  return discordRequest('POST', '/users/@me/channels', {
    recipient_id: userId
  });
}

/**
 * Send DM to user
 */
async function sendDM(userId, content, options = {}) {
  // Create DM channel first
  const dmChannel = await createDM(userId);
  return sendMessage(dmChannel.id, content, options);
}

/**
 * Process Discord message into standardized format
 */
function processMessage(message) {
  const author = message.author;
  const channel = message.channel_id;
  
  // Skip bot messages
  if (author.bot) return null;
  
  return {
    id: `discord:${message.id}`,
    channel: 'discord',
    type: message.guild_id ? 'channel' : 'dm',
    from: {
      id: author.id,
      handle: author.username,
      name: author.global_name || author.username,
      discriminator: author.discriminator
    },
    content: message.content || '[embed/media]',
    timestamp: message.timestamp,
    channelId: channel,
    guildId: message.guild_id || null,
    mentions: message.mentions || [],
    embeds: message.embeds || [],
    attachments: message.attachments || [],
    raw: message
  };
}

/**
 * Parse /vibe commands from Discord messages
 */
function parseVibeCommand(content) {
  const trimmed = content.trim();
  
  // !status mood [note]
  const statusMatch = trimmed.match(/^!status\s+(\w+)(?:\s+(.+))?$/);
  if (statusMatch) {
    return {
      command: 'status',
      params: {
        mood: statusMatch[1],
        note: statusMatch[2] || null
      }
    };
  }
  
  // !who
  if (trimmed === '!who') {
    return { command: 'who' };
  }
  
  // !ship [message]
  const shipMatch = trimmed.match(/^!ship(?:\s+(.+))?$/);
  if (shipMatch) {
    return {
      command: 'ship',
      params: {
        message: shipMatch[1] || null
      }
    };
  }
  
  // !dm @user message
  const dmMatch = trimmed.match(/^!dm\s+<@!?(\d+)>\s+(.+)$/);
  if (dmMatch) {
    return {
      command: 'dm',
      params: {
        userId: dmMatch[1],
        message: dmMatch[2]
      }
    };
  }
  
  // !vibe message (forward to /vibe)
  const vibeMatch = trimmed.match(/^!vibe\s+(.+)$/);
  if (vibeMatch) {
    return {
      command: 'vibe',
      params: {
        message: vibeMatch[1]
      }
    };
  }
  
  return null;
}

/**
 * Send /vibe activity notification to Discord
 */
async function notifyActivity(channelId, activity) {
  const { handle, action, context } = activity;
  
  const embed = {
    color: 0x6B8FFF, // /vibe blue
    description: `🔔 **@${handle}** ${action}`,
    footer: { text: context || 'slashvibe.dev' },
    timestamp: new Date().toISOString()
  };
  
  return sendMessage(channelId, '', { embeds: [embed] });
}

/**
 * Send /vibe status update to Discord
 */
async function notifyStatus(channelId, handle, mood, note) {
  const moodEmoji = {
    'shipping': '🔥',
    'debugging': '🐛',
    'deep': '🧠',
    'afk': '☕',
    'celebrating': '🎉',
    'pairing': '👯'
  };
  
  const emoji = moodEmoji[mood] || '●';
  let description = `${emoji} **@${handle}** is ${mood}`;
  
  if (note) {
    description += `\n_"${note}"_`;
  }
  
  const embed = {
    color: 0x9B59B6, // Purple for status
    description,
    timestamp: new Date().toISOString()
  };
  
  return sendMessage(channelId, '', { embeds: [embed] });
}

/**
 * Forward message from /vibe to Discord
 */
async function forwardFromVibe(channelId, handle, message, context = null) {
  const embed = {
    color: 0x2ECC71, // Green for /vibe messages
    author: {
      name: `@${handle}`,
      icon_url: 'https://slashvibe.dev/vibe-icon.png'
    },
    description: message,
    footer: { text: context || '/vibe' },
    timestamp: new Date().toISOString()
  };
  
  return sendMessage(channelId, '', { embeds: [embed] });
}

/**
 * Create embed for /vibe announcements
 */
function createVibeEmbed(title, description, color = 0x6B8FFF, fields = []) {
  return {
    color,
    title,
    description,
    fields,
    footer: { 
      text: 'slashvibe.dev',
      icon_url: 'https://slashvibe.dev/vibe-icon.png'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Send who's online list to Discord
 */
async function sendOnlineList(channelId, users) {
  if (users.length === 0) {
    const embed = createVibeEmbed(
      '🤫 Room is quiet...',
      'No one is currently active in /vibe.'
    );
    return sendMessage(channelId, '', { embeds: [embed] });
  }

  const fields = users.map(u => {
    const mood = u.mood ? ` (${u.mood})` : '';
    return {
      name: `@${u.handle}${mood}`,
      value: u.one_liner || 'building',
      inline: true
    };
  });

  const embed = createVibeEmbed(
    `👥 ${users.length} online in /vibe`,
    'Current activity:',
    0x2ECC71,
    fields
  );

  return sendMessage(channelId, '', { embeds: [embed] });
}

/**
 * Handle Discord slash commands
 */
async function registerSlashCommands(guildId = null) {
  const commands = [
    {
      name: 'vibe',
      description: 'Send message to /vibe',
      options: [
        {
          name: 'message',
          description: 'Message to send',
          type: 3, // STRING
          required: true
        }
      ]
    },
    {
      name: 'status',
      description: 'Update your /vibe status',
      options: [
        {
          name: 'mood',
          description: 'Your current mood/activity',
          type: 3, // STRING
          required: true,
          choices: [
            { name: '🔥 shipping', value: 'shipping' },
            { name: '🐛 debugging', value: 'debugging' },
            { name: '🧠 deep work', value: 'deep' },
            { name: '☕ away', value: 'afk' },
            { name: '🎉 celebrating', value: 'celebrating' },
            { name: '👯 pairing', value: 'pairing' }
          ]
        },
        {
          name: 'note',
          description: 'Optional note about what you\'re working on',
          type: 3, // STRING
          required: false
        }
      ]
    },
    {
      name: 'who',
      description: 'See who\'s online in /vibe'
    }
  ];

  const endpoint = guildId 
    ? `/applications/@me/guilds/${guildId}/commands`
    : '/applications/@me/commands';

  // Register each command
  for (const command of commands) {
    await discordRequest('POST', endpoint, command);
  }

  return commands.length;
}

/**
 * Set up Discord bot webhook for receiving interactions
 */
async function setupInteractionEndpoint(publicKey, endpointUrl) {
  // This would typically be done in Discord Developer Portal
  // But we can validate the setup here
  
  if (!publicKey || !endpointUrl) {
    throw new Error('Need both public key and endpoint URL for interactions');
  }
  
  // The actual webhook setup happens in Discord Developer Portal
  return {
    message: 'Interaction endpoint configured. Set this URL in Discord Developer Portal:',
    url: endpointUrl,
    publicKey: publicKey
  };
}

module.exports = {
  isConfigured,
  getBotToken,
  getGuildId,
  getBotInfo,
  getGuilds,
  getChannels,
  getMessages,
  sendMessage,
  sendDM,
  createDM,
  processMessage,
  parseVibeCommand,
  notifyActivity,
  notifyStatus,
  forwardFromVibe,
  sendOnlineList,
  createVibeEmbed,
  registerSlashCommands,
  setupInteractionEndpoint
};