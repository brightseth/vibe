/**
 * vibe telegram-setup — Interactive Telegram bot setup
 *
 * One-command setup flow for Telegram bridge with validation.
 */

const telegram = require('../bridges/telegram');
const config = require('../config');
const { requireInit, header, divider, success, warning } = require('./_shared');

const definition = {
  name: 'vibe_telegram_setup',
  description: 'Interactive setup for Telegram bot bridge with validation',
  inputSchema: {
    type: 'object',
    properties: {
      token: {
        type: 'string',
        description: 'Bot token from @BotFather (optional - will prompt if not provided)'
      },
      webhook_url: {
        type: 'string',
        description: 'Webhook URL for receiving updates (optional)'
      },
      test_chat_id: {
        type: 'string',
        description: 'Your chat ID for testing (optional - get from bot first)'
      },
      skip_test: {
        type: 'boolean',
        description: 'Skip the test message (default: false)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { token, webhook_url, test_chat_id, skip_test = false } = args;

  let display = header('Telegram Bot Setup');
  display += '\n\n';

  // Step 1: Check if already configured
  if (telegram.isConfigured()) {
    display += warning('⚠️  Telegram bot already configured!\n\n');
    
    try {
      const botInfo = await telegram.getBotInfo();
      display += `Current bot: **@${botInfo.username}** (${botInfo.first_name})\n\n`;
      display += 'To reconfigure, update the token in config.json or provide --token parameter.\n\n';
      
      if (!skip_test && test_chat_id) {
        return await testExistingBot(display, test_chat_id);
      }
      
      return { display: display + divider() + 'Bot is ready! Try: `vibe social-inbox --channel telegram`' };
      
    } catch (e) {
      display += `❌ Current configuration is invalid: ${e.message}\n\n`;
      display += 'Will proceed with setup...\n\n';
    }
  }

  // Step 2: Get/validate token
  let botToken = token;
  
  if (!botToken) {
    display += '**Step 1: Create Telegram Bot**\n';
    display += '1. Open Telegram and search for @BotFather\n';
    display += '2. Send: `/newbot`\n';
    display += '3. Follow prompts to choose name and username\n';
    display += '4. Copy the bot token\n\n';
    display += '_Run this command again with: `--token YOUR_BOT_TOKEN`_\n\n';
    display += divider();
    display += '**Example:**\n';
    display += '`vibe telegram-setup --token "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"`';
    
    return { display };
  }

  // Step 3: Validate token format
  if (!isValidBotToken(botToken)) {
    display += '❌ Invalid bot token format.\n\n';
    display += 'Token should look like: `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`\n\n';
    display += 'Get a valid token from @BotFather on Telegram.';
    return { display };
  }

  // Step 4: Test the token
  display += '**Testing bot token...**\n';
  
  try {
    // Temporarily set token for testing
    const tempConfig = { telegram_bot_token: botToken };
    
    // Mock the config for this test
    const originalLoad = config.load;
    config.load = () => ({ ...originalLoad(), ...tempConfig });
    
    const botInfo = await telegram.getBotInfo();
    
    // Restore original config loader
    config.load = originalLoad;
    
    display += success(`✅ Token valid! Bot: @${botInfo.username} (${botInfo.first_name})\n\n`);
    
    // Step 5: Save to config
    const cfg = config.load();
    cfg.telegram_bot_token = botToken;
    config.save(cfg);
    
    display += success('✅ Configuration saved!\n\n');
    
    // Step 6: Set webhook if provided
    if (webhook_url) {
      display += '**Setting webhook...**\n';
      try {
        await telegram.setWebhook(webhook_url);
        display += success(`✅ Webhook set: ${webhook_url}\n\n`);
      } catch (e) {
        display += warning(`⚠️  Webhook failed: ${e.message}\n\n`);
        display += 'Bot will work with polling instead.\n\n';
      }
    }
    
    // Step 7: Test message if chat ID provided
    if (!skip_test && test_chat_id) {
      return await testNewBot(display, test_chat_id, botInfo);
    }
    
    // Step 8: Instructions for getting chat ID
    display += divider();
    display += '**Next steps:**\n';
    display += `1. Message your bot @${botInfo.username} on Telegram\n`;
    display += '2. Send any message to establish a chat\n';
    display += '3. Test with: `vibe telegram-bot --action test --chat_id YOUR_CHAT_ID`\n\n';
    display += '**Bot commands in Telegram:**\n';
    display += '• `/status mood note` - Update /vibe status\n';
    display += '• `/who` - See who\'s online\n';
    display += '• `/ship message` - Announce completion\n';
    display += '• `/dm @handle message` - Send /vibe DM';
    
    return { display };
    
  } catch (e) {
    display += `❌ Token test failed: ${e.message}\n\n`;
    display += 'Make sure you copied the complete token from @BotFather.';
    return { display };
  }
}

async function testExistingBot(display, chatId) {
  display += '**Testing existing bot...**\n';
  
  try {
    const testMessage = `🧪 /vibe Telegram bridge test at ${new Date().toLocaleTimeString()}`;
    const result = await telegram.sendMessage(chatId, testMessage);
    
    display += success(`✅ Test message sent!\n\n`);
    display += `**Message details:**\n`;
    display += `• Chat ID: ${chatId}\n`;
    display += `• Message ID: ${result.message_id}\n`;
    display += `• Timestamp: ${new Date(result.date * 1000).toLocaleString()}\n\n`;
    display += divider();
    display += 'Bridge is working! Check your Telegram for the test message.';
    
  } catch (e) {
    display += `❌ Test failed: ${e.message}\n\n`;
    display += 'Check your chat ID or bot permissions.';
  }
  
  return { display };
}

async function testNewBot(display, chatId, botInfo) {
  display += '**Testing new bot...**\n';
  
  try {
    const testMessage = `🎉 Welcome to /vibe! Your @${botInfo.username} bridge is now active.\n\nTry these commands:\n• /status shipping "building the future"\n• /who\n• /ship`;
    
    const result = await telegram.sendMessage(chatId, testMessage);
    
    display += success(`✅ Welcome message sent!\n\n`);
    display += `**Setup complete:**\n`;
    display += `• Bot: @${botInfo.username}\n`;
    display += `• Chat: ${chatId}\n`;
    display += `• Message ID: ${result.message_id}\n\n`;
    display += divider();
    display += success('🚀 Telegram bridge is live!\n\n');
    display += '**What works now:**\n';
    display += '• Receive /vibe notifications in Telegram\n';
    display += '• Control /vibe from Telegram with bot commands\n';
    display += '• Post to multiple channels: `vibe social-post "hello" --channels ["telegram"]`';
    
  } catch (e) {
    display += warning(`⚠️  Test message failed: ${e.message}\n\n`);
    display += `Setup is complete, but couldn\'t send test message to chat ${chatId}.\n\n`;
    display += 'Make sure you\'ve messaged the bot first, then try:\n';
    display += '`vibe telegram-bot --action test --chat_id YOUR_CHAT_ID`';
  }
  
  return { display };
}

function isValidBotToken(token) {
  // Telegram bot tokens have format: nnnnnnnnnn:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  // Where n is digits and x is alphanumeric
  return /^\d{8,10}:[a-zA-Z0-9_-]{35}$/.test(token);
}

module.exports = { definition, handler };