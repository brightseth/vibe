/**
 * vibe connect <platform>
 *
 * Connect external messaging platforms (Gmail, X, Farcaster, etc.)
 * Sets up OAuth and stores credentials securely
 */

const config = require('../config');
const router = require('../../lib/messaging/router');
const credentials = require('../../lib/messaging/credentials');

module.exports = {
  name: 'vibe_connect',
  description: 'Connect external messaging platforms (Gmail, X, Farcaster, WhatsApp, Telegram, Discord)',

  parameters: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        enum: ['gmail', 'x', 'twitter', 'farcaster', 'whatsapp', 'telegram', 'discord'],
        description: 'Platform to connect'
      },
      action: {
        type: 'string',
        enum: ['connect', 'disconnect', 'status', 'list'],
        description: 'Action to perform (default: connect)'
      }
    }
  },

  handler: async (args) => {
    const handle = config.getHandle();
    if (!handle) {
      return {
        error: 'Not initialized',
        message: 'Run vibe init first'
      };
    }

    const { platform, action = 'connect' } = args;

    // List all connected platforms
    if (action === 'list' || !platform) {
      const connected = await credentials.listConnected(handle);

      if (connected.length === 0) {
        return {
          display: `🔌 No platforms connected

Available platforms:
  - gmail      (email via Gmail API)
  - x          (X/Twitter DMs)
  - farcaster  (Farcaster DMs)
  - whatsapp   (WhatsApp Business)
  - telegram   (Telegram Bot)
  - discord    (Discord DMs)

Connect: vibe connect <platform>
Example: vibe connect gmail
`
        };
      }

      const list = connected.map(p => `  ✓ ${p}`).join('\n');
      return {
        display: `🔌 Connected Platforms

${list}

Connect more: vibe connect <platform>
Disconnect: vibe connect <platform> --action disconnect
`
      };
    }

    // Normalize platform name
    const normalizedPlatform = platform === 'twitter' ? 'x' : platform;

    // Disconnect platform
    if (action === 'disconnect') {
      await credentials.remove(handle, normalizedPlatform);
      return {
        success: true,
        display: `✓ Disconnected ${normalizedPlatform}

Your credentials have been removed.
Reconnect anytime: vibe connect ${normalizedPlatform}
`
      };
    }

    // Check status
    if (action === 'status') {
      const hasAuth = await credentials.hasCredentials(handle, normalizedPlatform);

      if (!hasAuth) {
        return {
          display: `${normalizedPlatform} is not connected.

Connect: vibe connect ${normalizedPlatform}
`
        };
      }

      // Validate credentials still work
      const adapter = router.getAdapter(normalizedPlatform);
      const valid = await adapter.validateCredentials(handle);

      if (!valid) {
        return {
          display: `⚠️  ${normalizedPlatform} credentials expired

Reconnect: vibe connect ${normalizedPlatform}
`
        };
      }

      return {
        display: `✓ ${normalizedPlatform} is connected and active`
      };
    }

    // Connect platform (OAuth flow)
    if (action === 'connect') {
      try {
        const authUrl = await router.getAuthUrl(handle, normalizedPlatform);

        return {
          authRequired: true,
          platform: normalizedPlatform,
          authUrl,
          display: `🔐 Connect ${normalizedPlatform}

1. Open this URL in your browser:
   ${authUrl}

2. Authorize /vibe to send messages

3. You'll be redirected back

Once connected, you can:
  vibe dm user@example.com "message"           # Auto-detect Gmail
  vibe dm @user --platform ${normalizedPlatform} "message"     # Explicit platform

Need help? vibe help connect
`
        };
      } catch (error) {
        // Check if platform is not configured (missing API keys)
        if (error.message.includes('not configured')) {
          return {
            error: 'Platform not configured',
            display: `⚠️  ${normalizedPlatform} integration not configured

To enable ${normalizedPlatform}:

1. Get API credentials:
${getPlatformSetupInstructions(normalizedPlatform)}

2. Add to your environment:
   ${getPlatformEnvVars(normalizedPlatform)}

3. Restart /vibe: vibe reload

Questions? https://slashvibe.dev/docs/messaging
`
          };
        }

        return {
          error: error.message,
          display: `❌ Failed to connect ${normalizedPlatform}

Error: ${error.message}

Need help? vibe help connect
`
        };
      }
    }
  }
};

/**
 * Get platform-specific setup instructions
 */
function getPlatformSetupInstructions(platform) {
  const instructions = {
    gmail: `   - Go to: https://console.cloud.google.com
   - Create OAuth 2.0 credentials
   - Enable Gmail API`,

    x: `   - Go to: https://developer.twitter.com/en/portal/dashboard
   - Create app with OAuth 1.0a
   - Request elevated access for DMs`,

    farcaster: `   - Go to: https://neynar.com
   - Create account and get API key
   - Enable Hub API access`,

    whatsapp: `   - Go to: https://business.facebook.com/wa/manage/home
   - Create WhatsApp Business app
   - Get API access token`,

    telegram: `   - Message @BotFather on Telegram
   - Create new bot with /newbot
   - Get bot token`,

    discord: `   - Go to: https://discord.com/developers/applications
   - Create new application
   - Create bot and get token`
  };

  return instructions[platform] || 'See platform documentation';
}

/**
 * Get platform-specific environment variables
 */
function getPlatformEnvVars(platform) {
  const envVars = {
    gmail: `GMAIL_CLIENT_ID=your_client_id
   GMAIL_CLIENT_SECRET=your_client_secret
   GMAIL_REDIRECT_URI=http://localhost:3000/api/oauth/gmail/callback`,

    x: `X_CONSUMER_KEY=your_key
   X_CONSUMER_SECRET=your_secret`,

    farcaster: `NEYNAR_API_KEY=your_api_key`,

    whatsapp: `WHATSAPP_TOKEN=your_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_id`,

    telegram: `TELEGRAM_BOT_TOKEN=your_bot_token`,

    discord: `DISCORD_BOT_TOKEN=your_bot_token`
  };

  return envVars[platform] || 'See documentation';
}
