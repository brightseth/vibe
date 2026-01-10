/**
 * Message Router
 *
 * Unified interface for sending messages across all platforms
 * Auto-detects platform from recipient format
 */

const GmailAdapter = require('./adapters/gmail');
const GmailSMTPAdapter = require('./adapters/gmail-smtp');
// Future: X, Farcaster, WhatsApp, Telegram, Discord adapters

/**
 * Detect platform from recipient identifier
 *
 * @param {string} recipient - Recipient identifier
 * @returns {string} - Platform name
 */
function detectPlatform(recipient) {
  // Email (Gmail)
  if (recipient.includes('@') && recipient.includes('.')) {
    return 'gmail';
  }

  // Phone number (WhatsApp)
  if (/^\+?\d{10,15}$/.test(recipient)) {
    return 'whatsapp';
  }

  // Twitter/X handle
  if (recipient.startsWith('@') && !recipient.includes('.')) {
    return 'x';
  }

  // Farcaster (explicit suffix)
  if (recipient.includes('@farcaster') || recipient.includes('.farcaster')) {
    return 'farcaster';
  }

  // Discord user (username#discriminator)
  if (/^.+#\d{4}$/.test(recipient)) {
    return 'discord';
  }

  // Telegram (explicit @username or phone)
  if (recipient.startsWith('t.me/') || recipient.startsWith('telegram:')) {
    return 'telegram';
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

    // Future adapters:
    // case 'x':
    //   return new XAdapter();
    // case 'farcaster':
    //   return new FarcasterAdapter();
    // case 'whatsapp':
    //   return new WhatsAppAdapter();
    // case 'telegram':
    //   return new TelegramAdapter();
    // case 'discord':
    //   return new DiscordAdapter();

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
