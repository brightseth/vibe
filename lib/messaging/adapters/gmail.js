/**
 * Gmail Adapter
 *
 * Send emails via Gmail API using OAuth 2.0
 * Free API, well-documented, universal reach
 */

const { google } = require('googleapis');
const MessageAdapter = require('./base');
const credentials = require('../credentials');

class GmailAdapter extends MessageAdapter {
  constructor(config = {}) {
    super(config);
    this.platform = 'gmail';
  }

  getPlatform() {
    return this.platform;
  }

  isConfigured() {
    // Check if we have OAuth client credentials
    return !!(
      process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET
    );
  }

  /**
   * Get OAuth URL for Gmail authorization
   */
  async getAuthUrl(handle) {
    if (!this.isConfigured()) {
      throw new Error('Gmail OAuth not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/oauth/gmail/callback'
    );

    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: handle // Pass handle for callback
    });

    return authUrl;
  }

  /**
   * Handle OAuth callback and store tokens
   */
  async handleOAuthCallback(handle, code) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/oauth/gmail/callback'
      );

      const { tokens } = await oauth2Client.getToken(code);

      // Store tokens securely
      await credentials.store(handle, 'gmail', {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get OAuth client with stored credentials
   */
  async getAuthClient(handle) {
    const creds = await credentials.retrieve(handle, 'gmail');
    if (!creds) {
      throw new Error('Gmail not connected. Run: vibe connect gmail');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/oauth/gmail/callback'
    );

    oauth2Client.setCredentials({
      access_token: creds.access_token,
      refresh_token: creds.refresh_token,
      expiry_date: creds.expiry_date
    });

    // Auto-refresh tokens
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        await credentials.store(handle, 'gmail', {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date
        });
      }
    });

    return oauth2Client;
  }

  /**
   * Validate stored credentials
   */
  async validateCredentials(handle) {
    try {
      const auth = await this.getAuthClient(handle);
      const gmail = google.gmail({ version: 'v1', auth });

      // Test by getting user profile
      await gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create RFC 2822 formatted email message
   */
  createMessage(to, subject, body, from = 'me') {
    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedMessage;
  }

  /**
   * Send email via Gmail API
   */
  async send(recipient, message, options = {}) {
    try {
      const handle = options.handle;
      if (!handle) {
        throw new Error('Handle required for Gmail adapter');
      }

      const auth = await this.getAuthClient(handle);
      const gmail = google.gmail({ version: 'v1', auth });

      // Default subject if not provided
      const subject = options.subject || 'Message from /vibe';

      // Add /vibe signature if not disabled
      let body = message;
      if (!options.noSignature) {
        body += `\n\n---\nSent via /vibe · slashvibe.dev`;
      }

      const raw = this.createMessage(recipient, subject, body);

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw
        }
      });

      return {
        success: true,
        messageId: result.data.id,
        threadId: result.data.threadId,
        platform: 'gmail'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        platform: 'gmail'
      };
    }
  }

  /**
   * Format message for Gmail (no character limit, but format nicely)
   */
  formatMessage(message, options = {}) {
    // Gmail has no practical character limit
    // Just ensure proper formatting
    return message.trim();
  }
}

module.exports = GmailAdapter;
