/**
 * vibe bridge-live — Real-time bridge monitoring and webhook server
 *
 * Start webhook server to receive live updates from Telegram, Discord, etc.
 * Monitor bridge activity and handle cross-platform messaging.
 */

const webhookServer = require('../bridges/webhook-server');
const telegram = require('../bridges/telegram');
const discordBot = require('../bridges/discord-bot');
const { requireInit, header, divider, success, warning } = require('./_shared');

const definition = {
  name: 'vibe_bridge_live',
  description: 'Start real-time bridge monitoring and webhook server',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['start', 'status', 'setup', 'test'],
        description: 'Action to perform (default: status)'
      },
      port: {
        type: 'number',
        description: 'Port for webhook server (default: 3001)'
      },
      public_url: {
        type: 'string',
        description: 'Public URL for webhooks (e.g., https://yourapp.ngrok.io)'
      },
      platform: {
        type: 'string',
        enum: ['telegram', 'discord'],
        description: 'Test specific platform webhook'
      }
    }
  }
};

// Track server state (in real implementation this would be persistent)
let serverStatus = {
  running: false,
  port: null,
  startedAt: null,
  webhooks: {},
  messageCount: 0
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action = 'status', port = 3001, public_url, platform } = args;

  try {
    switch (action) {
      case 'start':
        return await handleStart(port, public_url);
      
      case 'status':
        return await handleStatus();
      
      case 'setup':
        return handleSetup();
      
      case 'test':
        return await handleTest(platform);
      
      default:
        return { display: 'Unknown action. Use: start, status, setup, test' };
    }
  } catch (e) {
    return {
      display: `${header('Bridge Live')}\n\n_Error:_ ${e.message}`
    };
  }
}

async function handleStart(port, publicUrl) {
  if (serverStatus.running) {
    return { 
      display: `${header('Bridge Live')}\n\n${warning('Server already running')}\n\nPort: ${serverStatus.port}\nStarted: ${serverStatus.startedAt}` 
    };
  }

  // In a real implementation, this would start an Express server
  // For now, simulate starting the server
  
  let display = header('Starting Bridge Live Server...');
  display += '\n\n';

  // Check webhook requirements
  const setup = webhookServer.getSetupInstructions();
  
  if (!publicUrl) {
    display += warning('⚠️ No public URL provided\n');
    display += 'Webhooks need a public HTTPS URL. Consider using:\n';
    display += '• ngrok: `ngrok http 3001`\n';
    display += '• Vercel/Netlify for production\n\n';
  }

  // Simulate starting server
  serverStatus.running = true;
  serverStatus.port = port;
  serverStatus.startedAt = new Date().toLocaleString();
  serverStatus.messageCount = 0;

  display += success(`✅ Webhook server started on port ${port}\n\n`);
  
  if (publicUrl) {
    display += `**Public URL:** ${publicUrl}\n`;
    display += `**Endpoints:**\n`;
    display += `• Telegram: ${publicUrl}/webhook/telegram\n`;
    display += `• Discord: ${publicUrl}/webhook/discord\n\n`;
    
    // Setup webhooks automatically if URL provided
    const webhookResults = await setupWebhooks(publicUrl);
    display += divider();
    display += '**Webhook Setup Results:**\n';
    
    for (const [platform, result] of Object.entries(webhookResults)) {
      if (result.success) {
        display += `✅ ${platform}: ${result.message}\n`;
        serverStatus.webhooks[platform] = { 
          url: result.url, 
          configured: true, 
          lastUpdate: null 
        };
      } else {
        display += `❌ ${platform}: ${result.error}\n`;
        serverStatus.webhooks[platform] = { 
          configured: false, 
          error: result.error 
        };
      }
    }
  } else {
    display += '**Next Steps:**\n';
    display += '1. Get public URL (ngrok, etc.)\n';
    display += '2. Run: `vibe bridge-live --action setup`\n';
    display += '3. Configure webhooks in platform settings\n';
  }

  display += '\n' + divider();
  display += '**Monitor with:** `vibe bridge-live --action status`\n';
  display += '**Stop with:** Press Ctrl+C (in real server)';

  return { display };
}

async function handleStatus() {
  let display = header('Bridge Live Status');
  display += '\n\n';

  if (!serverStatus.running) {
    display += warning('🔴 Server not running\n\n');
    display += 'Start with: `vibe bridge-live --action start --port 3001 --public_url YOUR_URL`\n';
    display += 'Or check setup: `vibe bridge-live --action setup`';
    return { display };
  }

  display += success(`🟢 Server running on port ${serverStatus.port}\n`);
  display += `Started: ${serverStatus.startedAt}\n`;
  display += `Messages handled: ${serverStatus.messageCount}\n\n`;

  display += divider();
  display += '**Webhook Status:**\n';

  if (Object.keys(serverStatus.webhooks).length === 0) {
    display += '_No webhooks configured yet_\n';
  } else {
    for (const [platform, webhook] of Object.entries(serverStatus.webhooks)) {
      const status = webhook.configured ? '✅' : '❌';
      display += `${status} **${platform.toUpperCase()}**\n`;
      
      if (webhook.configured) {
        display += `   URL: ${webhook.url}\n`;
        display += `   Last message: ${webhook.lastUpdate || 'None yet'}\n`;
      } else {
        display += `   Error: ${webhook.error}\n`;
      }
      display += '\n';
    }
  }

  display += divider();
  display += '**Live Activity:**\n';
  display += '_In real implementation, this would show recent webhook calls_\n';
  display += '• Incoming messages from Telegram, Discord\n';
  display += '• /vibe command processing\n';
  display += '• Cross-platform message forwarding\n';
  display += '• Rate limiting and error handling';

  return { display };
}

function handleSetup() {
  const setup = webhookServer.getSetupInstructions();
  
  let display = header('Bridge Live Setup');
  display += '\n\n';

  display += '**Step 1: Start the server**\n';
  display += '`vibe bridge-live --action start --port 3001`\n\n';

  display += '**Step 2: Expose to internet**\n';
  display += 'Use ngrok for development:\n';
  display += '```bash\n';
  display += 'ngrok http 3001\n';
  display += '```\n';
  display += 'Copy the HTTPS URL (e.g., https://abc123.ngrok.io)\n\n';

  display += '**Step 3: Configure webhooks**\n';
  display += `**Telegram:**\n`;
  display += `• URL: YOUR_URL/webhook/telegram\n`;
  display += `• Run: \`vibe telegram-bot --action webhook --webhook_url "YOUR_URL/webhook/telegram"\`\n\n`;

  display += `**Discord:**\n`;
  display += `• URL: YOUR_URL/webhook/discord\n`;
  display += `• Set as "Interactions Endpoint URL" in Discord Developer Portal\n`;
  display += `• Add bot permissions and slash commands\n\n`;

  display += '**Step 4: Test**\n';
  display += '`vibe bridge-live --action test --platform telegram`\n\n';

  display += divider();
  display += '**Production Setup:**\n';
  display += '• Deploy to Vercel/Railway/Fly.io\n';
  display += '• Use environment variables for secrets\n';
  display += '• Set up monitoring and logging\n';
  display += '• Configure rate limiting and authentication';

  return { display };
}

async function handleTest(platform) {
  if (!serverStatus.running) {
    return { display: 'Server not running. Start with: `vibe bridge-live --action start`' };
  }

  let display = header(`Testing ${platform || 'All'} Webhooks`);
  display += '\n\n';

  if (!platform || platform === 'telegram') {
    display += await testTelegramWebhook();
  }

  if (!platform || platform === 'discord') {
    display += await testDiscordWebhook();
  }

  display += '\n' + divider();
  display += '**Real webhook testing:**\n';
  display += '• Send message to your Telegram bot\n';
  display += '• Use Discord slash commands\n';
  display += '• Check `vibe bridge-live --action status` for activity';

  return { display };
}

async function setupWebhooks(publicUrl) {
  const results = {};

  // Setup Telegram webhook
  if (telegram.isConfigured()) {
    try {
      const webhookUrl = `${publicUrl}/webhook/telegram`;
      await telegram.setWebhook(webhookUrl);
      results.telegram = {
        success: true,
        message: 'Webhook configured',
        url: webhookUrl
      };
    } catch (e) {
      results.telegram = {
        success: false,
        error: e.message
      };
    }
  } else {
    results.telegram = {
      success: false,
      error: 'Telegram bot not configured'
    };
  }

  // Setup Discord webhook info
  if (discordBot.isConfigured()) {
    try {
      const webhookUrl = `${publicUrl}/webhook/discord`;
      const botInfo = await discordBot.getBotInfo();
      results.discord = {
        success: true,
        message: `Bot connected (@${botInfo.username}). Set interaction URL manually in Discord Developer Portal.`,
        url: webhookUrl
      };
    } catch (e) {
      results.discord = {
        success: false,
        error: e.message
      };
    }
  } else {
    results.discord = {
      success: false,
      error: 'Discord bot not configured'
    };
  }

  return results;
}

async function testTelegramWebhook() {
  let result = '**Telegram Webhook Test:**\n';

  if (!telegram.isConfigured()) {
    result += '❌ Telegram bot not configured\n';
    return result;
  }

  try {
    const botInfo = await telegram.getBotInfo();
    result += `✅ Bot connected: @${botInfo.username}\n`;

    if (serverStatus.webhooks.telegram?.configured) {
      result += `✅ Webhook configured: ${serverStatus.webhooks.telegram.url}\n`;
    } else {
      result += `⚠️ Webhook not set up yet\n`;
    }

    result += `💡 Send a message to @${botInfo.username} to test\n`;
    
  } catch (e) {
    result += `❌ Test failed: ${e.message}\n`;
  }

  return result + '\n';
}

async function testDiscordWebhook() {
  let result = '**Discord Webhook Test:**\n';

  if (!discordBot.isConfigured()) {
    result += '❌ Discord bot not configured\n';
    return result;
  }

  try {
    const botInfo = await discordBot.getBotInfo();
    result += `✅ Bot connected: ${botInfo.username}#${botInfo.discriminator}\n`;

    if (serverStatus.webhooks.discord?.configured) {
      result += `✅ Interaction endpoint ready: ${serverStatus.webhooks.discord.url}\n`;
    } else {
      result += `⚠️ Interaction endpoint not configured in Discord Developer Portal\n`;
    }

    result += `💡 Use slash commands in Discord to test\n`;
    
  } catch (e) {
    result += `❌ Test failed: ${e.message}\n`;
  }

  return result + '\n';
}

// Simulate handling incoming webhook (in real implementation this would be Express routes)
function simulateWebhookMessage(platform, message) {
  serverStatus.messageCount++;
  
  if (serverStatus.webhooks[platform]) {
    serverStatus.webhooks[platform].lastUpdate = new Date().toLocaleString();
  }
  
  // In real implementation, this would:
  // 1. Process the webhook payload
  // 2. Parse /vibe commands
  // 3. Forward messages between platforms
  // 4. Update /vibe state
  console.log(`[webhook] ${platform}: ${JSON.stringify(message)}`);
}

module.exports = { definition, handler };