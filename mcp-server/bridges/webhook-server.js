/**
 * /vibe Webhook Server
 * 
 * Unified webhook endpoint for receiving real-time updates from:
 * - Telegram bot updates
 * - Discord bot interactions
 * - GitHub webhooks (future)
 * - Linear webhooks (future)
 * 
 * Routes events to appropriate bridge handlers and /vibe core.
 */

const crypto = require('crypto');
const telegram = require('./telegram');
const discordBot = require('./discord-bot');
const config = require('../config');

/**
 * Webhook server configuration
 */
function getConfig() {
  const cfg = config.load();
  return {
    port: cfg.webhook_port || process.env.WEBHOOK_PORT || 3001,
    secret: cfg.webhook_secret || process.env.WEBHOOK_SECRET || null,
    telegramSecret: cfg.telegram_webhook_secret || process.env.TELEGRAM_WEBHOOK_SECRET || null,
    discordPublicKey: cfg.discord_public_key || process.env.DISCORD_PUBLIC_KEY || null,
    vibeChannelId: cfg.discord_vibe_channel_id || process.env.DISCORD_VIBE_CHANNEL_ID || null,
    telegramChatId: cfg.telegram_vibe_chat_id || process.env.TELEGRAM_VIBE_CHAT_ID || null
  };
}

/**
 * Verify webhook signature for security
 */
function verifySignature(payload, signature, secret) {
  if (!secret) return true; // Skip if no secret configured
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return signature === `sha256=${expectedSignature}`;
}

/**
 * Verify Telegram webhook
 */
function verifyTelegramWebhook(body, headers) {
  const secretToken = getConfig().telegramSecret;
  if (!secretToken) return true;
  
  const providedToken = headers['x-telegram-bot-api-secret-token'];
  return providedToken === secretToken;
}

/**
 * Process incoming Telegram update
 */
async function handleTelegramWebhook(body) {
  try {
    const update = typeof body === 'string' ? JSON.parse(body) : body;
    
    // Process the update using telegram bridge
    const message = telegram.processUpdate(update);
    if (!message) return { status: 'ok', processed: false };
    
    // Check for /vibe commands
    const command = telegram.parseVibeCommand(message.content);
    if (command) {
      return await processVibeCommand(command, message, 'telegram');
    }
    
    // Forward regular messages to /vibe if configured
    const config = getConfig();
    if (config.vibeChannelId && message.type === 'dm') {
      await forwardToVibe(message, 'telegram');
    }
    
    return { 
      status: 'ok', 
      processed: true, 
      message: `Processed ${message.type} from @${message.from.handle}` 
    };
    
  } catch (e) {
    console.error('Telegram webhook error:', e);
    return { status: 'error', error: e.message };
  }
}

/**
 * Process incoming Discord interaction
 */
async function handleDiscordWebhook(body, headers) {
  try {
    const interaction = typeof body === 'string' ? JSON.parse(body) : body;
    
    // Handle different interaction types
    switch (interaction.type) {
      case 1: // PING
        return { type: 1 }; // PONG
        
      case 2: // APPLICATION_COMMAND
        return await handleDiscordSlashCommand(interaction);
        
      case 3: // MESSAGE_COMPONENT (buttons, select menus)
        return await handleDiscordComponent(interaction);
        
      default:
        return { status: 'ok', message: 'Interaction type not handled' };
    }
    
  } catch (e) {
    console.error('Discord webhook error:', e);
    return { status: 'error', error: e.message };
  }
}

/**
 * Handle Discord slash commands
 */
async function handleDiscordSlashCommand(interaction) {
  const { data, member, user, channel_id } = interaction;
  const commandName = data.name;
  const options = data.options || [];
  
  const discordUser = member?.user || user;
  const handle = discordUser.username;
  
  try {
    switch (commandName) {
      case 'vibe':
        const message = options.find(opt => opt.name === 'message')?.value;
        if (message) {
          await forwardToVibe({
            from: { handle },
            content: message,
            channel: 'discord'
          });
          return createDiscordResponse(`📡 Sent to /vibe: "${message}"`);
        }
        break;
        
      case 'status':
        const mood = options.find(opt => opt.name === 'mood')?.value;
        const note = options.find(opt => opt.name === 'note')?.value;
        if (mood) {
          await processVibeCommand({
            command: 'status',
            params: { mood, note }
          }, { from: { handle } }, 'discord');
          return createDiscordResponse(`✅ Status updated: ${mood}${note ? ` - ${note}` : ''}`);
        }
        break;
        
      case 'who':
        const onlineUsers = await getVibeOnlineUsers();
        const userList = onlineUsers.length > 0 
          ? onlineUsers.map(u => `• @${u.handle}: ${u.one_liner || 'building'}`).join('\n')
          : '_No one is currently online_';
        return createDiscordResponse(`👥 **Who's in /vibe:**\n${userList}`);
        
      default:
        return createDiscordResponse('Unknown command');
    }
  } catch (e) {
    return createDiscordResponse(`Error: ${e.message}`);
  }
}

/**
 * Handle Discord message components (buttons, etc.)
 */
async function handleDiscordComponent(interaction) {
  const { data, member, user } = interaction;
  const customId = data.custom_id;
  
  // Handle different component interactions
  switch (customId) {
    case 'vibe_join':
      return createDiscordResponse('Visit https://slashvibe.dev to join /vibe!');
    
    default:
      return createDiscordResponse('Component interaction not handled');
  }
}

/**
 * Create Discord interaction response
 */
function createDiscordResponse(content, ephemeral = false) {
  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      content,
      flags: ephemeral ? 64 : 0 // EPHEMERAL flag
    }
  };
}

/**
 * Process /vibe commands from any platform
 */
async function processVibeCommand(command, message, platform) {
  const { handle } = message.from;
  
  try {
    switch (command.command) {
      case 'status':
        const { mood, note } = command.params;
        await updateVibeStatus(handle, mood, note);
        
        // Notify other platforms
        await notifyStatusChange(handle, mood, note, platform);
        
        return { 
          status: 'ok', 
          message: `Status updated for @${handle}: ${mood}` 
        };
        
      case 'who':
        const users = await getVibeOnlineUsers();
        await sendOnlineList(message, users, platform);
        return { status: 'ok', message: 'Sent online user list' };
        
      case 'ship':
        const { message: shipMessage } = command.params;
        await announceShip(handle, shipMessage);
        return { status: 'ok', message: 'Ship announcement sent' };
        
      case 'dm':
        const { handle: targetHandle, message: dmMessage } = command.params;
        await sendVibeDM(handle, targetHandle, dmMessage);
        return { status: 'ok', message: `DM sent to @${targetHandle}` };
        
      case 'vibe':
        const { message: vibeMessage } = command.params;
        await forwardToVibe(message, platform);
        return { status: 'ok', message: 'Message forwarded to /vibe' };
        
      default:
        return { status: 'error', message: 'Unknown command' };
    }
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

/**
 * Forward message to /vibe core (placeholder)
 */
async function forwardToVibe(message, platform) {
  // This would integrate with /vibe's message handling system
  console.log(`[${platform}] @${message.from.handle}: ${message.content}`);
  
  // For now, just log - in real implementation this would:
  // 1. Add to /vibe message history
  // 2. Notify online users
  // 3. Trigger any relevant automations
}

/**
 * Update /vibe status (placeholder)
 */
async function updateVibeStatus(handle, mood, note) {
  // This would integrate with /vibe's status system
  console.log(`Status update: @${handle} is ${mood}${note ? ` - ${note}` : ''}`);
}

/**
 * Get current online users from /vibe (placeholder)
 */
async function getVibeOnlineUsers() {
  // This would integrate with /vibe's presence system
  return [
    { handle: 'alice', mood: 'shipping', one_liner: 'building the future' },
    { handle: 'bob', mood: 'debugging', one_liner: 'fixing the past' }
  ];
}

/**
 * Notify all platforms about status change
 */
async function notifyStatusChange(handle, mood, note, skipPlatform) {
  const config = getConfig();
  
  // Notify Discord
  if (skipPlatform !== 'discord' && config.vibeChannelId && discordBot.isConfigured()) {
    try {
      await discordBot.notifyStatus(config.vibeChannelId, handle, mood, note);
    } catch (e) {
      console.error('Discord notification failed:', e);
    }
  }
  
  // Notify Telegram
  if (skipPlatform !== 'telegram' && config.telegramChatId && telegram.isConfigured()) {
    try {
      await telegram.notifyStatus(config.telegramChatId, handle, mood, note);
    } catch (e) {
      console.error('Telegram notification failed:', e);
    }
  }
}

/**
 * Send online user list to platform
 */
async function sendOnlineList(message, users, platform) {
  const config = getConfig();
  
  switch (platform) {
    case 'discord':
      if (config.vibeChannelId) {
        await discordBot.sendOnlineList(config.vibeChannelId, users);
      }
      break;
      
    case 'telegram':
      if (message.chat?.id) {
        const userList = users.length > 0
          ? users.map(u => `• **@${u.handle}** (${u.mood || 'online'}) — ${u.one_liner || 'building'}`).join('\n')
          : '_No one is currently online_';
        await telegram.sendMessage(message.chat.id, `👥 **Who's in /vibe:**\n${userList}`, { markdown: true });
      }
      break;
  }
}

/**
 * Announce ship to all platforms
 */
async function announceShip(handle, message) {
  const config = getConfig();
  const announcement = `🚀 **@${handle}** shipped${message ? `: ${message}` : '!'}`;
  
  // Discord
  if (config.vibeChannelId && discordBot.isConfigured()) {
    await discordBot.notifyActivity(config.vibeChannelId, {
      handle, 
      action: 'shipped', 
      context: message
    });
  }
  
  // Telegram
  if (config.telegramChatId && telegram.isConfigured()) {
    await telegram.notifyActivity(config.telegramChatId, {
      handle,
      action: 'shipped',
      context: message
    });
  }
}

/**
 * Send DM in /vibe (placeholder)
 */
async function sendVibeDM(fromHandle, toHandle, message) {
  console.log(`DM: @${fromHandle} → @${toHandle}: ${message}`);
  // This would integrate with /vibe's DM system
}

/**
 * Express.js middleware for handling webhooks
 */
function createWebhookHandler() {
  return async (req, res) => {
    const { path, method, headers, body } = req;
    
    if (method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
      let result;
      
      switch (path) {
        case '/webhook/telegram':
          if (!verifyTelegramWebhook(body, headers)) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
          result = await handleTelegramWebhook(body);
          break;
          
        case '/webhook/discord':
          result = await handleDiscordWebhook(body, headers);
          break;
          
        default:
          return res.status(404).json({ error: 'Webhook endpoint not found' });
      }
      
      res.json(result);
      
    } catch (e) {
      console.error('Webhook handler error:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Setup instructions for webhook endpoints
 */
function getSetupInstructions() {
  const config = getConfig();
  const port = config.port;
  
  return {
    telegram: {
      url: `https://your-domain.com/webhook/telegram`,
      setup: `Set webhook URL in Telegram bot settings`,
      secret: config.telegramSecret ? 'Configured' : 'Not set (optional)'
    },
    discord: {
      url: `https://your-domain.com/webhook/discord`,
      setup: 'Set as Interactions Endpoint URL in Discord Developer Portal',
      publicKey: config.discordPublicKey ? 'Configured' : 'Required for signature verification'
    },
    port: port,
    note: 'Make sure your server is accessible from the internet and uses HTTPS'
  };
}

module.exports = {
  getConfig,
  handleTelegramWebhook,
  handleDiscordWebhook,
  processVibeCommand,
  createWebhookHandler,
  getSetupInstructions,
  verifySignature,
  verifyTelegramWebhook
};