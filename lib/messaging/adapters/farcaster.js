/**
 * Farcaster Adapter
 *
 * Send messages (casts) via Neynar API
 * Leverages existing farcaster bridge
 */

const MessageAdapter = require('./base');
const farcasterBridge = require('../../../mcp-server/bridges/farcaster');

class FarcasterAdapter extends MessageAdapter {
  constructor(config = {}) {
    super(config);
    this.platform = 'farcaster';
  }

  getPlatform() {
    return this.platform;
  }

  /**
   * Check if Farcaster is configured
   */
  isConfigured() {
    return farcasterBridge.isConfigured();
  }

  /**
   * Validate credentials work
   */
  async validateCredentials(handle) {
    try {
      await farcasterBridge.getUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send cast via Farcaster
   */
  async send(recipient, message, options = {}) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Farcaster not configured. Set NEYNAR_API_KEY, FARCASTER_SIGNER_UUID, and FARCASTER_FID.',
          platform: 'farcaster'
        };
      }

      // Add /vibe signature if not disabled
      let body = message;
      if (!options.noSignature) {
        body += `\n\nSent via /vibe · slashvibe.dev`;
      }

      // Publish cast
      // If recipient looks like @username, it's a mention/reply
      // Otherwise it's a direct cast
      const isMention = recipient.startsWith('@');
      const username = isMention ? recipient.replace('@', '') : null;

      // For now, just publish cast (Farcaster doesn't have traditional DMs)
      // Mentions work via @ in the cast text
      if (username && !body.includes(`@${username}`)) {
        body = `@${username} ${body}`;
      }

      const result = await farcasterBridge.publishCast(body, {
        channel: options.channel || null
      });

      return {
        success: true,
        platform: 'farcaster',
        castHash: result.cast.hash,
        castUrl: `https://warpcast.com/${result.cast.author.username}/${result.cast.hash.substring(0, 10)}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        platform: 'farcaster'
      };
    }
  }

  /**
   * Format message for Farcaster (320 char limit)
   */
  formatMessage(message, options = {}) {
    const MAX_LENGTH = 320;

    if (message.length <= MAX_LENGTH) {
      return message;
    }

    // Truncate with warning
    return message.substring(0, MAX_LENGTH - 15) + '\n\n[truncated]';
  }

  /**
   * Get setup instructions
   */
  getSetupInstructions() {
    return `
Farcaster Setup (via Neynar):

1. Go to: https://neynar.com
2. Sign up for free account
3. Get API key from dashboard

4. Create signer:
   - Go to "Managed Signers" in Neynar dashboard
   - Create new signer
   - Copy signer UUID

5. Get your FID (Farcaster ID):
   - Go to your Warpcast profile
   - URL shows your FID: warpcast.com/username (check settings)
   - Or use Neynar API to look up by username

6. Add to environment:
   export NEYNAR_API_KEY="your_api_key"
   export FARCASTER_SIGNER_UUID="your_signer_uuid"
   export FARCASTER_FID="your_fid"

7. Restart /vibe:
   vibe reload

8. Send cast:
   vibe dm @username.farcaster "your message"
   vibe dm farcaster "public cast"

Note: Farcaster doesn't have traditional DMs. Messages are public casts.
For private messaging, users typically exchange contacts off-platform.

Guide: https://docs.neynar.com
`;
  }
}

module.exports = FarcasterAdapter;
