/**
 * Message Router
 *
 * Unified interface for sending messages across all platforms
 * Auto-detects platform from recipient format
 */

const GmailAdapter = require('./adapters/gmail');
const GmailSMTPAdapter = require('./adapters/gmail-smtp');
const XAdapter = require('./adapters/x');
const FarcasterAdapter = require('./adapters/farcaster');
const TelegramAdapter = require('./adapters/telegram');
const DiscordAdapter = require('./adapters/discord');
// Future: WhatsApp adapter

/**
 * Detect platform from recipient identifier
 *
 * @param {string} recipient - Recipient identifier
 * @returns {string} - Platform name
 */
function detectPlatform(recipient) {
  // Farcaster (check BEFORE email, since it uses dots too)
  if (recipient.includes('.farcaster') || recipient.includes('.fc')) {
    return 'farcaster';
  }
  if (recipient.includes('@farcaster')) {
    return 'farcaster';
  }

  // Discord (username#discriminator format)
  if (/^.+#\d{4}$/.test(recipient)) {
    return 'discord';
  }

  // Discord (channel/message ID - 17-19 digit snowflake)
  if (/^\d{17,19}$/.test(recipient)) {
    return 'discord';
  }

  // Email (Gmail) - contains @ and domain, but not farcaster/discord
  if (recipient.includes('@') && recipient.includes('.')) {
    return 'gmail';
  }

  // Telegram (explicit t.me prefix)
  if (recipient.startsWith('t.me/') || recipient.startsWith('telegram:')) {
    return 'telegram';
  }

  // Telegram (negative chat IDs for groups/channels)
  if (/^-\d{9,13}$/.test(recipient)) {
    return 'telegram';
  }

  // Telegram (positive chat IDs - 8-12 digits, but not Discord snowflakes)
  if (/^\d{8,12}$/.test(recipient)) {
    return 'telegram';
  }

  // Phone number (WhatsApp) - must start with +
  if (/^\+\d{10,15}$/.test(recipient)) {
    return 'whatsapp';
  }

  // Twitter/X handle (starts with @, no platform suffix)
  if (recipient.startsWith('@')) {
    return 'x';
  }

  // Default: /vibe internal DM
  return 'vibe';
}

/**
 * Get adapter instance for platform
 *
 * @param {string} platform - Platform name
 * @returns {MessageAdapter} - Platform adapter
 */
function getAdapter(platform) {
  switch (platform) {
    case 'gmail':
      // Prefer SMTP adapter if credentials are set (simpler, works immediately)
      // Otherwise use OAuth adapter (for other users)
      const smtpAdapter = new GmailSMTPAdapter();
      if (smtpAdapter.isConfigured()) {
        return smtpAdapter;
      }
      return new GmailAdapter();

    case 'x':
    case 'twitter':
      return new XAdapter();

    case 'farcaster':
      return new FarcasterAdapter();

    case 'telegram':
      return new TelegramAdapter();

    case 'discord':
      return new DiscordAdapter();

    // Future adapters:
    // case 'whatsapp':
    //   return new WhatsAppAdapter();

    case 'vibe':
      // Internal /vibe DM (existing implementation)
      return null;

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Send message via appropriate platform
 *
 * @param {string} recipient - Recipient identifier
 * @param {string} message - Message content
 * @param {object} options - Options
 *   - platform: Explicit platform override
 *   - handle: Sender handle (required for OAuth platforms)
 *   - subject: Email subject (Gmail only)
 *   - ...other platform-specific options
 * @returns {Promise<object>} - Result
 */
async function send(recipient, message, options = {}) {
  // Detect or use explicit platform
  const platform = options.platform || detectPlatform(recipient);

  // For /vibe internal DMs, use existing implementation
  if (platform === 'vibe') {
    return {
      platform: 'vibe',
      useExistingDM: true, // Signal to use vibe_dm tool
      recipient,
      message
    };
  }

  // Get platform adapter
  const adapter = getAdapter(platform);
  if (!adapter) {
    throw new Error(`No adapter available for ${platform}`);
  }

  // Check if adapter is configured (has OAuth credentials)
  if (!adapter.isConfigured()) {
    return {
      success: false,
      error: `${platform} not configured. Set ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET`,
      platform
    };
  }

  // Check if user has connected their account
  const hasAuth = await adapter.validateCredentials(options.handle);
  if (!hasAuth) {
    const authUrl = await adapter.getAuthUrl(options.handle);
    return {
      success: false,
      error: `${platform} not connected`,
      authRequired: true,
      authUrl,
      platform
    };
  }

  // Send message
  return await adapter.send(recipient, message, options);
}

/**
 * Get OAuth URL for connecting a platform
 *
 * @param {string} handle - User handle
 * @param {string} platform - Platform to connect
 * @returns {Promise<string>} - OAuth URL
 */
async function getAuthUrl(handle, platform) {
  const adapter = getAdapter(platform);
  if (!adapter) {
    throw new Error(`No adapter available for ${platform}`);
  }

  return await adapter.getAuthUrl(handle);
}

/**
 * Handle OAuth callback
 *
 * @param {string} handle - User handle
 * @param {string} platform - Platform
 * @param {string} code - OAuth code
 * @returns {Promise<object>} - Result
 */
async function handleOAuthCallback(handle, platform, code) {
  const adapter = getAdapter(platform);
  if (!adapter) {
    throw new Error(`No adapter available for ${platform}`);
  }

  return await adapter.handleOAuthCallback(handle, code);
}

module.exports = {
  send,
  getAuthUrl,
  handleOAuthCallback,
  detectPlatform,
  getAdapter
};
