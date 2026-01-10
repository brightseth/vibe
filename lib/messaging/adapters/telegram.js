/**
 * Telegram Adapter
 *
 * Send messages via Telegram Bot API
 * Leverages existing telegram bridge
 */

const MessageAdapter = require('./base');
const telegramBridge = require('../../../mcp-server/bridges/telegram');

class TelegramAdapter extends MessageAdapter {
  constructor(config = {}) {
    super(config);
    this.platform = 'telegram';
  }

  getPlatform() {
    return this.platform;
  }

  /**
   * Check if Telegram bot is configured
   */
  isConfigured() {
    return telegramBridge.isConfigured();
  }

  /**
   * Validate bot token works
   */
  async validateCredentials(handle) {
    try {
      await telegramBridge.getBotInfo();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send message via Telegram
   */
  async send(recipient, message, options = {}) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN environment variable.',
          platform: 'telegram'
        };
      }

      // Recipient is chat ID (number or @username)
      // For /vibe, we store chat IDs in user profiles
      const chatId = recipient.replace('@', '');

      // Add /vibe signature if not disabled
      let body = message;
      if (!options.noSignature) {
        body += `\n\n_Sent via /vibe · slashvibe.dev_`;
      }

      const result = await telegramBridge.sendMessage(chatId, body, {
        markdown: true,
        silent: options.silent || false
      });

      return {
        success: true,
        platform: 'telegram',
        messageId: result.message_id,
        chatId: result.chat.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        platform: 'telegram'
      };
    }
  }

  /**
   * Format message for Telegram (4096 char limit)
   */
  formatMessage(message, options = {}) {
    const MAX_LENGTH = 4096;

    if (message.length <= MAX_LENGTH) {
      return message;
    }

    // Truncate with warning
    return message.substring(0, MAX_LENGTH - 50) + '\n\n_[Message truncated]_';
  }

  /**
   * Get setup instructions
   */
  getSetupInstructions() {
    return `
Telegram Bot Setup:

1. Message @BotFather on Telegram
2. Send /newbot command
3. Follow prompts to create your bot
4. Copy the bot token

5. Add to environment:
   export TELEGRAM_BOT_TOKEN="your_bot_token"

6. Restart /vibe:
   vibe reload

7. Get your chat ID:
   - Message your bot on Telegram
   - The bot will respond with your chat ID
   - Use that ID as recipient: vibe dm <chat_id> "message"

Guide: https://core.telegram.org/bots#how-do-i-create-a-bot
`;
  }
}

module.exports = TelegramAdapter;
