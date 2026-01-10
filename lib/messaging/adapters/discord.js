/**
 * Discord Adapter
 *
 * Send messages via Discord Bot API
 * Leverages existing discord bridge
 */

const MessageAdapter = require('./base');
const discordBridge = require('../../../mcp-server/bridges/discord-bot');

class DiscordAdapter extends MessageAdapter {
  constructor(config = {}) {
    super(config);
    this.platform = 'discord';
  }

  getPlatform() {
    return this.platform;
  }

  /**
   * Check if Discord bot is configured
   */
  isConfigured() {
    return discordBridge.isConfigured();
  }

  /**
   * Validate bot token works
   */
  async validateCredentials(handle) {
    try {
      await discordBridge.getBotInfo();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send message via Discord
   */
  async send(recipient, message, options = {}) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Discord not configured. Set DISCORD_BOT_TOKEN environment variable.',
          platform: 'discord'
        };
      }

      // Recipient is channel ID
      // Format: channel_id or user#discriminator
      const channelId = recipient.replace(/[^0-9]/g, '');

      if (!channelId) {
        return {
          success: false,
          error: 'Invalid Discord channel ID. Use numeric channel ID.',
          platform: 'discord'
        };
      }

      // Add /vibe signature if not disabled
      let body = message;
      if (!options.noSignature) {
        body += `\n\n_Sent via /vibe · slashvibe.dev_`;
      }

      const result = await discordBridge.sendMessage(channelId, body, {
        silent: options.silent || false
      });

      return {
        success: true,
        platform: 'discord',
        messageId: result.id,
        channelId: result.channel_id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        platform: 'discord'
      };
    }
  }

  /**
   * Format message for Discord (2000 char limit)
   */
  formatMessage(message, options = {}) {
    const MAX_LENGTH = 2000;

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
Discord Bot Setup:

1. Go to: https://discord.com/developers/applications
2. Click "New Application"
3. Go to "Bot" tab → "Add Bot"
4. Copy the bot token
5. Enable "Message Content Intent" (required for DMs)

6. Add to environment:
   export DISCORD_BOT_TOKEN="your_bot_token"

7. Invite bot to your server:
   - Go to OAuth2 → URL Generator
   - Select scopes: "bot"
   - Select permissions: "Send Messages", "Read Messages"
   - Copy URL and open in browser

8. Get channel ID:
   - Enable Developer Mode in Discord
   - Right-click channel → Copy ID
   - Use that ID: vibe dm <channel_id> "message"

9. Restart /vibe:
   vibe reload

Guide: https://discord.com/developers/docs/intro
`;
  }
}

module.exports = DiscordAdapter;
