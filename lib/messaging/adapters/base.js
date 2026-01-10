/**
 * Base Message Adapter
 *
 * All platform adapters (Gmail, X, Farcaster, etc.) extend this class
 * and implement the standard interface.
 */

class MessageAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Send a message to a recipient
   * @param {string} recipient - Platform-specific recipient identifier
   * @param {string} message - Message content
   * @param {object} options - Platform-specific options
   * @returns {Promise<object>} - { success: boolean, messageId?: string, error?: string }
   */
  async send(recipient, message, options = {}) {
    throw new Error('Must implement send()');
  }

  /**
   * Validate stored credentials work
   * @returns {Promise<boolean>}
   */
  async validateCredentials() {
    throw new Error('Must implement validateCredentials()');
  }

  /**
   * Check if adapter is configured with credentials
   * @returns {boolean}
   */
  isConfigured() {
    throw new Error('Must implement isConfigured()');
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatform() {
    throw new Error('Must implement getPlatform()');
  }

  /**
   * Get OAuth URL for user authorization (if applicable)
   * @param {string} handle - User handle
   * @returns {Promise<string|null>}
   */
  async getAuthUrl(handle) {
    return null; // Default: no OAuth needed
  }

  /**
   * Handle OAuth callback (if applicable)
   * @param {string} handle - User handle
   * @param {string} code - OAuth code
   * @returns {Promise<object>} - { success: boolean, error?: string }
   */
  async handleOAuthCallback(handle, code) {
    return { success: true }; // Default: no-op
  }

  /**
   * Format message for platform (handle character limits, formatting)
   * @param {string} message - Original message
   * @param {object} options - Platform options
   * @returns {string} - Formatted message
   */
  formatMessage(message, options = {}) {
    return message; // Default: no formatting
  }
}

module.exports = MessageAdapter;
