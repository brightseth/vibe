/**
 * Base Adapter Interface
 *
 * All social channel adapters implement this contract.
 * Adapters are responsible for syncing data TO /vibe's unified inbox.
 */

/**
 * @typedef {Object} SocialMessage
 * @property {string} id - Unique message ID (channel:original_id)
 * @property {string} channel - Source channel (x, farcaster, discord, etc.)
 * @property {string} type - Message type (mention, reply, dm, like, repost)
 * @property {Object} from - Sender info
 * @property {string} from.handle - Handle on that platform
 * @property {string} [from.name] - Display name
 * @property {string} [from.avatar] - Avatar URL
 * @property {string} content - Message content
 * @property {string} timestamp - ISO timestamp from source
 * @property {string} synced_at - When we synced it
 * @property {string} [thread_id] - Thread/conversation ID
 * @property {string} [reply_to] - ID of message being replied to
 * @property {string[]} [media] - Media URLs
 * @property {number} signal_score - 0-100, higher = more important
 * @property {Object} raw - Original payload
 */

/**
 * @typedef {Object} Capabilities
 * @property {boolean} read - Can read messages
 * @property {boolean} write - Can send messages
 * @property {boolean} react - Can react to messages
 * @property {boolean} dm - Can send DMs
 * @property {boolean} media - Can handle media
 * @property {boolean} threading - Supports threads
 */

/**
 * @typedef {Object} AdapterStatus
 * @property {'connected'|'disconnected'|'error'|'rate_limited'} status
 * @property {string} [error] - Error message if status is 'error'
 * @property {string} [lastSync] - ISO timestamp of last successful sync
 * @property {number} [rateLimitReset] - Unix timestamp when rate limit resets
 */

class BaseAdapter {
  constructor(channel) {
    this.channel = channel;
  }

  /**
   * Get adapter capabilities
   * @returns {Capabilities}
   */
  getCapabilities() {
    throw new Error('getCapabilities() must be implemented');
  }

  /**
   * Check if adapter is configured with required credentials
   * @returns {boolean}
   */
  isConfigured() {
    throw new Error('isConfigured() must be implemented');
  }

  /**
   * Get current adapter status
   * @returns {Promise<AdapterStatus>}
   */
  async getStatus() {
    throw new Error('getStatus() must be implemented');
  }

  /**
   * Sync messages from this channel
   * @param {string} [sinceId] - Only fetch messages after this ID
   * @returns {Promise<SocialMessage[]>}
   */
  async sync(sinceId = null) {
    throw new Error('sync() must be implemented');
  }

  /**
   * Post content to this channel
   * @param {string} content - Content to post
   * @param {Object} [options] - Post options
   * @param {string} [options.replyTo] - ID to reply to
   * @param {string[]} [options.media] - Media paths
   * @returns {Promise<{id: string, url: string}>}
   */
  async post(content, options = {}) {
    throw new Error('post() must be implemented');
  }

  /**
   * Calculate signal score for a message
   * Higher = more important (mentions, DMs, replies > likes, reposts)
   * @param {Object} rawMessage
   * @returns {number} 0-100
   */
  calculateSignalScore(rawMessage) {
    // Default implementation - override in subclasses
    return 50;
  }

  /**
   * Generate unique message ID
   * @param {string} originalId - ID from the source platform
   * @returns {string}
   */
  generateId(originalId) {
    return `${this.channel}:${originalId}`;
  }
}

module.exports = { BaseAdapter };
