/**
 * X/Twitter Adapter
 *
 * Send DMs and tweets via X API
 * Leverages existing twitter bridge
 */

const MessageAdapter = require('./base');
const twitterBridge = require('../../../mcp-server/twitter');

class XAdapter extends MessageAdapter {
  constructor(config = {}) {
    super(config);
    this.platform = 'x';
  }

  getPlatform() {
    return this.platform;
  }

  /**
   * Check if X credentials are configured
   */
  isConfigured() {
    const creds = twitterBridge.getCredentials();
    return !!(creds && creds.api_key && creds.access_token);
  }

  /**
   * Validate credentials work
   */
  async validateCredentials(handle) {
    try {
      await twitterBridge.verifyCredentials();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send DM or tweet via X
   */
  async send(recipient, message, options = {}) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'X/Twitter not configured. Set X API credentials in config.',
          platform: 'x'
        };
      }

      // Add /vibe signature if not disabled
      let body = message;
      if (!options.noSignature) {
        body += `\n\nSent via /vibe · slashvibe.dev`;
      }

      // Determine if this is a DM or tweet
      // If recipient starts with @, send DM
      // Otherwise, it's a tweet/reply
      const isDM = recipient.startsWith('@');

      if (isDM) {
        // Send DM
        const username = recipient.replace('@', '');
        const result = await twitterBridge.sendDirectMessage(username, body);

        return {
          success: true,
          platform: 'x',
          type: 'dm',
          messageId: result.message_id,
          recipient: username
        };
      } else {
        // Tweet (or reply if options.replyTo provided)
        const result = await twitterBridge.tweet(body, {
          replyTo: options.replyTo || null
        });

        return {
          success: true,
          platform: 'x',
          type: 'tweet',
          tweetId: result.id_str,
          tweetUrl: `https://twitter.com/i/status/${result.id_str}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        platform: 'x'
      };
    }
  }

  /**
   * Format message for X (280 char limit for tweets, 10k for DMs)
   */
  formatMessage(message, options = {}) {
    const isDM = options.recipient && options.recipient.startsWith('@');
    const MAX_LENGTH = isDM ? 10000 : 280;

    if (message.length <= MAX_LENGTH) {
      return message;
    }

    // Truncate with warning
    const suffix = isDM ? '\n\n[Message truncated]' : '\n\n[1/n]';
    return message.substring(0, MAX_LENGTH - suffix.length) + suffix;
  }

  /**
   * Get setup instructions
   */
  getSetupInstructions() {
    return `
X/Twitter Setup:

**Option 1: Personal API Keys (Recommended)**
1. Go to: https://developer.twitter.com/en/portal/dashboard
2. Create new app (or use existing)
3. Generate OAuth 1.0a credentials:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret

4. Add to /vibe config:
   vibe config set x_credentials '{
     "api_key": "your_api_key",
     "api_secret": "your_api_secret",
     "access_token": "your_access_token",
     "access_secret": "your_access_secret"
   }'

**Option 2: Environment Variables**
export X_API_KEY="your_api_key"
export X_API_SECRET="your_api_secret"
export X_ACCESS_TOKEN="your_access_token"
export X_ACCESS_SECRET="your_access_secret"

**Pricing:**
- Free tier: Read-only (no DMs/tweets)
- Basic ($100/mo): DMs + tweets
- Pro ($5000/mo): Higher rate limits

For personal use, apply for free elevated access:
https://developer.twitter.com/en/portal/petition/essential/basic-info

**Usage:**
vibe dm @username "DM message"         # Send DM
vibe dm x "Public tweet"                # Send tweet

5. Restart /vibe:
   vibe reload

Guide: https://developer.twitter.com/en/docs/authentication/oauth-1-0a
`;
  }
}

module.exports = XAdapter;
