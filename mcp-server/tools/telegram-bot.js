/**
 * vibe telegram-bot — Manage Telegram bot connection
 *
 * Set up, test, and manage the /vibe Telegram bot bridge.
 */

const telegram = require('../bridges/telegram');
const { requireInit, header, divider, success, warning } = require('./_shared');

const definition = {
  name: 'vibe_telegram_bot',
  description: 'Manage Telegram bot connection for /vibe bridge',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'test', 'setup', 'webhook'],
        description: 'Action to perform (default: status)'
      },
      chat_id: {
        type: 'string', 
        description: 'Chat ID for testing (use with action: test)'
      },
      message: {
        type: 'string',
        description: 'Test message to send (use with action: test)'
      },
      webhook_url: {
        type: 'string',
        description: 'Webhook URL to set (use with action: webhook)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action = 'status', chat_id, message, webhook_url } = args;

  // Check configuration
  const configured = telegram.isConfigured();
  
  if (!configured && action !== 'setup') {
    return {
      display: `${header('Telegram Bot')}\n\n${warning('Bot not configured.')}\n\nSet TELEGRAM_BOT_TOKEN in config or run \`vibe telegram-bot --action setup\``
    };
  }

  try {
    switch (action) {
      case 'status':
        return await handleStatus();
      
      case 'test':
        return await handleTest(chat_id, message);
      
      case 'setup':
        return handleSetup();
      
      case 'webhook':
        return await handleWebhook(webhook_url);
      
      default:
        return { display: 'Unknown action. Use: status, test, setup, webhook' };
    }
  } catch (e) {
    return {
      display: `${header('Telegram Bot')}\n\n_Error:_ ${e.message}`
    };
  }
}

async function handleStatus() {
  const botInfo = await telegram.getBotInfo();
  
  let display = header('Telegram Bot Status');
  display += '\n\n';
  display += success('✅ Bot configured and connected\n\n');
  display += `**Bot Info:**\n`;
  display += `• Name: ${botInfo.first_name}\n`;
  display += `• Username: @${botInfo.username}\n`;
  display += `• ID: ${botInfo.id}\n`;
  display += `• Can join groups: ${botInfo.can_join_groups ? 'Yes' : 'No'}\n`;
  display += `• Can read all messages: ${botInfo.can_read_all_group_messages ? 'Yes' : 'No'}\n\n`;
  
  display += divider();
  display += `**Usage:**\n`;
  display += `• Message @${botInfo.username} on Telegram\n`;
  display += `• Add bot to group chats\n`;
  display += `• Send /vibe commands: /status, /who, /ship\n`;
  display += `• Test with: \`vibe telegram-bot --action test --chat_id YOUR_CHAT_ID --message "hello"\``;
  
  return { display };
}

async function handleTest(chatId, testMessage) {
  if (!chatId) {
    return { display: 'Need --chat_id for testing. Get your chat ID by messaging the bot first.' };
  }
  
  if (!testMessage) {
    testMessage = `🧪 Test from /vibe at ${new Date().toLocaleTimeString()}`;
  }
  
  const result = await telegram.sendMessage(chatId, testMessage);
  
  let display = header('Telegram Test');
  display += '\n\n';
  display += success(`✅ Message sent successfully!\n\n`);
  display += `**Details:**\n`;
  display += `• Chat ID: ${chatId}\n`;
  display += `• Message ID: ${result.message_id}\n`;
  display += `• Content: "${testMessage}"\n`;
  display += `• Sent at: ${new Date(result.date * 1000).toLocaleString()}\n\n`;
  
  display += divider();
  display += `Bot is working! You can now:\n`;
  display += `• Set up webhook for real-time updates\n`;
  display += `• Connect bot to /vibe activity notifications`;
  
  return { display };
}

function handleSetup() {
  let display = header('Telegram Bot Setup');
  display += '\n\n';
  display += `**Step 1: Create bot with @BotFather**\n`;
  display += `1. Open Telegram and search for @BotFather\n`;
  display += `2. Send: /newbot\n`;
  display += `3. Choose a name (e.g., "My Vibe Bot")\n`;
  display += `4. Choose a username (must end in "bot", e.g., "my_vibe_bot")\n`;
  display += `5. Copy the token\n\n`;
  
  display += `**Step 2: Configure token**\n`;
  display += `Add to ~/.vibecodings/config.json:\n`;
  display += `\`\`\`json\n`;
  display += `{\n`;
  display += `  "telegram_bot_token": "YOUR_BOT_TOKEN_HERE"\n`;
  display += `}\n`;
  display += `\`\`\`\n\n`;
  
  display += `**Step 3: Test connection**\n`;
  display += `Run: \`vibe telegram-bot --action status\`\n\n`;
  
  display += `**Step 4: Get your chat ID**\n`;
  display += `1. Message your bot on Telegram\n`;
  display += `2. Run: \`vibe telegram-bot --action test --chat_id YOUR_CHAT_ID\`\n`;
  display += `   (Check Telegram logs for your chat ID)\n\n`;
  
  display += divider();
  display += `**Bot Commands (once set up):**\n`;
  display += `• \`/status shipping Building the future\` - Update /vibe status\n`;
  display += `• \`/who\` - See who's online in /vibe\n`;
  display += `• \`/ship\` - Announce completion\n`;
  display += `• \`/dm @handle message\` - Send DM in /vibe`;
  
  return { display };
}

async function handleWebhook(url) {
  if (!url) {
    return { display: 'Need --webhook_url to set webhook. Example: https://yourapp.vercel.app/api/telegram/webhook' };
  }
  
  const result = await telegram.setWebhook(url);
  
  let display = header('Telegram Webhook');
  display += '\n\n';
  display += success(`✅ Webhook configured!\n\n`);
  display += `**Webhook URL:** ${url}\n`;
  display += `**Status:** Active\n\n`;
  
  display += divider();
  display += `The bot will now receive real-time updates.\n`;
  display += `Make sure your webhook endpoint handles POST requests with Telegram update format.`;
  
  return { display };
}

module.exports = { definition, handler };