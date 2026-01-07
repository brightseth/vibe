/**
 * vibe bridges — Manage external platform bridges
 *
 * See status of all bridges (X, Telegram, Discord, etc.) and manage connections.
 */

const twitter = require('../twitter');
const telegram = require('../bridges/telegram');
const discord = require('../discord');
const { requireInit, header, divider, success, warning } = require('./_shared');

const definition = {
  name: 'vibe_bridges',
  description: 'See status and manage bridges to external platforms (X, Telegram, Discord, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        enum: ['all', 'x', 'twitter', 'telegram', 'discord', 'farcaster'],
        description: 'Show specific platform or all (default: all)'
      },
      action: {
        type: 'string',
        enum: ['status', 'test'],
        description: 'Action to perform (default: status)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { platform = 'all', action = 'status' } = args;

  if (action === 'test') {
    return handleTest(platform);
  }

  return handleStatus(platform);
}

async function handleStatus(platform) {
  let display = header('Bridge Status');
  display += '\n\n';

  const bridges = await getBridgeStatuses();
  
  if (platform === 'all') {
    // Show all bridges
    for (const [name, status] of Object.entries(bridges)) {
      display += formatBridgeStatus(name, status);
      display += '\n';
    }
  } else {
    // Show specific platform
    const normalizedPlatform = platform === 'twitter' ? 'x' : platform;
    const status = bridges[normalizedPlatform];
    
    if (!status) {
      return { display: `${header('Bridge Status')}\n\n_Unknown platform: ${platform}_` };
    }
    
    display += formatBridgeStatus(normalizedPlatform, status);
  }
  
  display += '\n' + divider();
  display += '**Setup guides:**\n';
  display += '• X: Add credentials to config.json (paid API required for writing)\n';
  display += '• Telegram: `vibe telegram-bot --action setup`\n';
  display += '• Discord: Add DISCORD_WEBHOOK_URL to config (one-way only)\n';
  display += '• Farcaster: Coming soon\n\n';
  
  display += '**Test connections:**\n';
  display += '• `vibe bridges --action test --platform telegram`\n';
  display += '• `vibe x-mentions` (test X read)\n';
  display += '• `vibe x-reply "test tweet"` (test X write)';

  return { display };
}

async function handleTest(platform) {
  const normalizedPlatform = platform === 'twitter' ? 'x' : platform;
  
  try {
    switch (normalizedPlatform) {
      case 'x':
        return await testXBridge();
      case 'telegram':
        return await testTelegramBridge();
      case 'discord':
        return await testDiscordBridge();
      default:
        return { display: `Testing not implemented for ${platform} yet.` };
    }
  } catch (e) {
    return {
      display: `${header(`${platform} Test`)}\n\n_Error:_ ${e.message}`
    };
  }
}

async function getBridgeStatuses() {
  const bridges = {};
  
  // X/Twitter
  bridges.x = {
    configured: twitter.isConfigured(),
    capabilities: { read: true, write: true, dm: true, media: true },
    status: 'unknown',
    notes: []
  };
  
  if (bridges.x.configured) {
    try {
      await twitter.getMe();
      bridges.x.status = 'connected';
    } catch (e) {
      bridges.x.status = 'error';
      bridges.x.notes.push(e.message);
    }
  } else {
    bridges.x.status = 'not_configured';
    bridges.x.notes.push('Need API credentials in config.json');
  }
  
  // Telegram
  bridges.telegram = {
    configured: telegram.isConfigured(),
    capabilities: { read: true, write: true, dm: true, groups: true },
    status: 'unknown',
    notes: []
  };
  
  if (bridges.telegram.configured) {
    try {
      const botInfo = await telegram.getBotInfo();
      bridges.telegram.status = 'connected';
      bridges.telegram.botUsername = botInfo.username;
      bridges.telegram.botName = botInfo.first_name;
    } catch (e) {
      bridges.telegram.status = 'error';
      bridges.telegram.notes.push(e.message);
    }
  } else {
    bridges.telegram.status = 'not_configured';
    bridges.telegram.notes.push('Need TELEGRAM_BOT_TOKEN in config.json');
  }
  
  // Discord
  bridges.discord = {
    configured: discord.isConfigured(),
    capabilities: { read: false, write: true, webhooks: true },
    status: 'unknown',
    notes: []
  };
  
  if (bridges.discord.configured) {
    bridges.discord.status = 'connected';
    bridges.discord.notes.push('Webhook configured (one-way: /vibe → Discord)');
  } else {
    bridges.discord.status = 'not_configured';
    bridges.discord.notes.push('Need DISCORD_WEBHOOK_URL in config.json');
  }
  
  // Farcaster (placeholder)
  bridges.farcaster = {
    configured: false,
    capabilities: { read: true, write: true, frames: true },
    status: 'not_implemented',
    notes: ['Coming soon - Neynar API integration']
  };
  
  return bridges;
}

function formatBridgeStatus(name, status) {
  const statusIcons = {
    connected: '✅',
    error: '❌',
    not_configured: '⚠️',
    not_implemented: '🚧'
  };
  
  const icon = statusIcons[status.status] || '❓';
  const displayName = name.toUpperCase();
  
  let line = `${icon} **${displayName}** — ${status.status.replace('_', ' ')}`;
  
  if (status.botUsername) {
    line += ` (@${status.botUsername})`;
  }
  
  line += '\n';
  
  // Show capabilities
  const caps = [];
  if (status.capabilities.read) caps.push('read');
  if (status.capabilities.write) caps.push('write');
  if (status.capabilities.dm) caps.push('dm');
  if (status.capabilities.groups) caps.push('groups');
  if (status.capabilities.webhooks) caps.push('webhooks');
  if (status.capabilities.media) caps.push('media');
  if (status.capabilities.frames) caps.push('frames');
  
  line += `   Capabilities: ${caps.join(', ')}\n`;
  
  // Show notes/errors
  for (const note of status.notes) {
    line += `   _${note}_\n`;
  }
  
  return line;
}

async function testXBridge() {
  let display = header('X Bridge Test');
  display += '\n\n';
  
  if (!twitter.isConfigured()) {
    display += warning('❌ X not configured\n\n');
    display += 'Add X API credentials to ~/.vibecodings/config.json';
    return { display };
  }
  
  try {
    const me = await twitter.getMe();
    display += success(`✅ Connected to X as @${me.data.username}\n\n`);
    display += `**Account Info:**\n`;
    display += `• Name: ${me.data.name}\n`;
    display += `• Username: @${me.data.username}\n`;
    display += `• ID: ${me.data.id}\n\n`;
    
    display += divider();
    display += '**Available features:**\n';
    display += '• Read mentions: `vibe x-mentions`\n';
    display += '• Send tweet: `vibe x-reply "message"`\n';
    display += '• Reply to tweet: `vibe x-reply "reply" --reply_to TWEET_ID`';
    
  } catch (e) {
    display += `❌ Connection failed: ${e.message}\n\n`;
    display += 'Check your API credentials and rate limits.';
  }
  
  return { display };
}

async function testTelegramBridge() {
  let display = header('Telegram Bridge Test');
  display += '\n\n';
  
  if (!telegram.isConfigured()) {
    display += warning('❌ Telegram not configured\n\n');
    display += 'Run: `vibe telegram-bot --action setup`';
    return { display };
  }
  
  try {
    const botInfo = await telegram.getBotInfo();
    display += success(`✅ Connected to Telegram as @${botInfo.username}\n\n`);
    display += `**Bot Info:**\n`;
    display += `• Name: ${botInfo.first_name}\n`;
    display += `• Username: @${botInfo.username}\n`;
    display += `• ID: ${botInfo.id}\n`;
    display += `• Can join groups: ${botInfo.can_join_groups ? 'Yes' : 'No'}\n\n`;
    
    display += divider();
    display += '**Test sending a message:**\n';
    display += '`vibe telegram-bot --action test --chat_id YOUR_CHAT_ID --message "hello"`\n\n';
    display += '**Bot commands in Telegram:**\n';
    display += '• `/status shipping` - Update /vibe status\n';
    display += '• `/who` - See who\'s online\n';
    display += '• `/ship` - Announce completion';
    
  } catch (e) {
    display += `❌ Connection failed: ${e.message}\n\n`;
    display += 'Check your bot token.';
  }
  
  return { display };
}

async function testDiscordBridge() {
  let display = header('Discord Bridge Test');
  display += '\n\n';
  
  if (!discord.isConfigured()) {
    display += warning('❌ Discord not configured\n\n');
    display += 'Add DISCORD_WEBHOOK_URL to config.json';
    return { display };
  }
  
  try {
    const sent = await discord.post('🧪 Test from /vibe bridge system');
    
    if (sent) {
      display += success('✅ Discord webhook working!\n\n');
      display += 'Test message sent to your Discord channel.\n\n';
      display += divider();
      display += '**Current features:**\n';
      display += '• /vibe activity notifications → Discord\n';
      display += '• Status updates → Discord\n';
      display += '• One-way only (Discord → /vibe coming soon)';
    } else {
      display += '❌ Webhook failed to send\n\n';
      display += 'Check your webhook URL.';
    }
    
  } catch (e) {
    display += `❌ Test failed: ${e.message}\n\n`;
    display += 'Check your webhook URL in config.json';
  }
  
  return { display };
}

module.exports = { definition, handler };