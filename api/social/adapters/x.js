/**
 * X (Twitter) Adapter
 *
 * Syncs mentions, replies, and DMs from X to unified inbox.
 * Uses OAuth 1.0a for authentication.
 */

const crypto = require('crypto');
const { BaseAdapter } = require('./base');

class XAdapter extends BaseAdapter {
  constructor() {
    super('x');
    this.baseUrl = 'https://api.twitter.com';
  }

  getCapabilities() {
    return {
      read: true,
      write: true,  // Requires paid tier
      react: true,
      dm: true,     // Requires elevated access
      media: true,
      threading: true
    };
  }

  isConfigured() {
    return !!(
      process.env.X_API_KEY &&
      process.env.X_API_SECRET &&
      process.env.X_ACCESS_TOKEN &&
      process.env.X_ACCESS_SECRET
    );
  }

  async getStatus() {
    if (!this.isConfigured()) {
      return { status: 'disconnected', error: 'Missing credentials' };
    }

    try {
      await this.getMe();
      return { status: 'connected', lastSync: new Date().toISOString() };
    } catch (e) {
      if (e.message.includes('429')) {
        return { status: 'rate_limited', error: e.message };
      }
      return { status: 'error', error: e.message };
    }
  }

  /**
   * Generate OAuth 1.0a signature
   */
  generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(
        Object.keys(params)
          .sort()
          .map(k => `${k}=${encodeURIComponent(params[k])}`)
          .join('&')
      )
    ].join('&');

    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || '')}`;

    return crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');
  }

  /**
   * Generate OAuth 1.0a header
   */
  generateOAuthHeader(method, url, params = {}) {
    const oauthParams = {
      oauth_consumer_key: process.env.X_API_KEY,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: process.env.X_ACCESS_TOKEN,
      oauth_version: '1.0'
    };

    const allParams = { ...oauthParams, ...params };

    oauthParams.oauth_signature = this.generateOAuthSignature(
      method,
      url,
      allParams,
      process.env.X_API_SECRET,
      process.env.X_ACCESS_SECRET
    );

    const headerString = Object.keys(oauthParams)
      .sort()
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(', ');

    return `OAuth ${headerString}`;
  }

  /**
   * Make authenticated request to X API
   */
  async xRequest(method, endpoint, params = {}, body = null) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': this.generateOAuthHeader(method, url, method === 'GET' ? params : {}),
      'Content-Type': 'application/json'
    };

    const fetchUrl = method === 'GET' && Object.keys(params).length > 0
      ? `${url}?${new URLSearchParams(params)}`
      : url;

    const response = await fetch(fetchUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`X API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  async getMe() {
    return this.xRequest('GET', '/2/users/me', {
      'user.fields': 'id,name,username,profile_image_url'
    });
  }

  async sync(sinceId = null) {
    if (!this.isConfigured()) {
      console.log('[x-adapter] Not configured, skipping sync');
      return [];
    }

    const messages = [];

    try {
      // Get our user ID
      const me = await this.getMe();
      const userId = me.data.id;

      // Fetch mentions
      const params = {
        'tweet.fields': 'created_at,author_id,text,conversation_id,in_reply_to_user_id',
        'expansions': 'author_id',
        'user.fields': 'username,name,profile_image_url',
        max_results: '20'
      };

      if (sinceId) {
        params.since_id = sinceId;
      }

      const mentions = await this.xRequest('GET', `/2/users/${userId}/mentions`, params);

      if (!mentions.data) {
        return [];
      }

      // Build user lookup map
      const userMap = {};
      if (mentions.includes?.users) {
        for (const user of mentions.includes.users) {
          userMap[user.id] = user;
        }
      }

      // Convert to unified format
      for (const tweet of mentions.data) {
        const user = userMap[tweet.author_id] || { username: 'unknown', name: 'Unknown' };

        messages.push({
          id: this.generateId(tweet.id),
          channel: 'x',
          type: tweet.in_reply_to_user_id ? 'reply' : 'mention',
          from: {
            handle: user.username,
            name: user.name,
            avatar: user.profile_image_url
          },
          content: tweet.text,
          timestamp: tweet.created_at,
          synced_at: new Date().toISOString(),
          thread_id: tweet.conversation_id,
          reply_to: tweet.in_reply_to_user_id ? `x:${tweet.in_reply_to_user_id}` : null,
          signal_score: this.calculateSignalScore(tweet),
          raw: tweet
        });
      }

      console.log(`[x-adapter] Synced ${messages.length} messages`);
      return messages;

    } catch (e) {
      console.error('[x-adapter] Sync error:', e.message);
      return [];
    }
  }

  async post(content, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('X not configured');
    }

    const body = { text: content };
    if (options.replyTo) {
      // Extract original ID from our ID format
      const originalId = options.replyTo.replace('x:', '');
      body.reply = { in_reply_to_tweet_id: originalId };
    }

    const result = await this.xRequest('POST', '/2/tweets', {}, body);

    return {
      id: this.generateId(result.data.id),
      url: `https://x.com/i/status/${result.data.id}`
    };
  }

  calculateSignalScore(tweet) {
    // Replies and mentions are high signal
    if (tweet.in_reply_to_user_id) {
      return 80; // Direct reply
    }
    return 70; // Mention
  }
}

module.exports = { XAdapter };
