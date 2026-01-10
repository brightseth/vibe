/**
 * Gmail SMTP Adapter (App Password Method)
 *
 * Simpler alternative to OAuth for personal use
 * Uses Gmail App Password + SMTP
 * Works immediately if GMAIL_ADDRESS and GMAIL_APP_PASSWORD are set
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const MessageAdapter = require('./base');

const execAsync = promisify(exec);

class GmailSMTPAdapter extends MessageAdapter {
  constructor(config = {}) {
    super(config);
    this.platform = 'gmail';
  }

  getPlatform() {
    return this.platform;
  }

  /**
   * Check if App Password is configured
   */
  isConfigured() {
    return !!(
      process.env.GMAIL_ADDRESS &&
      process.env.GMAIL_APP_PASSWORD
    );
  }

  /**
   * SMTP doesn't need OAuth validation
   */
  async validateCredentials(handle) {
    return this.isConfigured();
  }

  /**
   * Send email via Gmail SMTP
   */
  async send(recipient, message, options = {}) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Gmail not configured. Set GMAIL_ADDRESS and GMAIL_APP_PASSWORD environment variables.',
          platform: 'gmail'
        };
      }

      // Default subject if not provided
      const subject = options.subject || 'Message from /vibe';

      // Add /vibe signature if not disabled
      let body = message;
      if (!options.noSignature) {
        body += `\n\n---\nSent via /vibe · slashvibe.dev`;
      }

      // Use the existing send-gmail.sh script
      const scriptPath = path.join(
        process.env.HOME,
        '.claude/skills/email/send-gmail.sh'
      );

      // Escape quotes in body for shell
      const escapedBody = body.replace(/"/g, '\\"').replace(/\$/g, '\\$');
      const escapedSubject = subject.replace(/"/g, '\\"').replace(/\$/g, '\\$');

      const command = `"${scriptPath}" "${recipient}" "${escapedSubject}" "${escapedBody}"`;

      const { stdout, stderr } = await execAsync(command);

      // Check if successful (script outputs "✓ Email sent")
      if (stdout.includes('✓ Email sent')) {
        return {
          success: true,
          platform: 'gmail',
          method: 'smtp',
          from: process.env.GMAIL_ADDRESS,
          to: recipient,
          subject
        };
      } else {
        throw new Error(stderr || stdout || 'Unknown error');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        platform: 'gmail'
      };
    }
  }

  /**
   * Format message for Gmail (no character limit)
   */
  formatMessage(message, options = {}) {
    return message.trim();
  }
}

module.exports = GmailSMTPAdapter;
