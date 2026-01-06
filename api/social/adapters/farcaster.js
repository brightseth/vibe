/**
 * Farcaster Adapter
 *
 * Syncs casts, mentions, and replies from Farcaster via Neynar API.
 * https://docs.neynar.com/
 */

const { BaseAdapter } = require('./base');

class FarcasterAdapter extends BaseAdapter {
  constructor() {
    super('farcaster');
    this.baseUrl = 'https://api.neynar.com/v2/farcaster';
  }

  getCapabilities() {
    return {
      read: true,
      write: true,
      react: true,
      dm: false,  // Farcaster doesn't have DMs
      media: true,
      threading: true
    };
  }

  isConfigured() {
    return !!(process.env.NEYNAR_API_KEY && process.env.FARCASTER_FID);
  }

  async getStatus() {
    if (!this.isConfigured()) {
      return { status: 'disconnected', error: 'Missing NEYNAR_API_KEY or FARCASTER_FID' };
    }

    try {
      // Test the API with a simple request (v2 uses /user/bulk)
      await this.neynarRequest('/user/bulk', { fids: process.env.FARCASTER_FID });
      return { status: 'connected', lastSync: new Date().toISOString() };
    } catch (e) {
      if (e.message.includes('429')) {
        return { status: 'rate_limited', error: e.message };
      }
      return { status: 'error', error: e.message };
    }
  }

  async neynarRequest(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const response = await fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Neynar API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  async sync(sinceId = null) {
    if (!this.isConfigured()) {
      console.log('[farcaster-adapter] Not configured, skipping sync');
      return [];
    }

    const messages = [];
    const fid = process.env.FARCASTER_FID;

    try {
      // Fetch notifications (mentions, replies, likes, recasts)
      const notifications = await this.neynarRequest('/notifications', {
        fid,
        limit: 25
      });

      if (!notifications.notifications) {
        return [];
      }

      for (const notif of notifications.notifications) {
        // Skip low-signal notifications for now
        if (!['mention', 'reply'].includes(notif.type)) {
          continue;
        }

        const cast = notif.cast;
        if (!cast) continue;

        const author = cast.author;

        messages.push({
          id: this.generateId(cast.hash),
          channel: 'farcaster',
          type: notif.type,
          from: {
            handle: author.username,
            name: author.display_name,
            avatar: author.pfp_url
          },
          content: cast.text,
          timestamp: cast.timestamp,
          synced_at: new Date().toISOString(),
          thread_id: cast.thread_hash || cast.hash,
          reply_to: cast.parent_hash ? this.generateId(cast.parent_hash) : null,
          media: cast.embeds?.filter(e => e.url).map(e => e.url) || [],
          signal_score: this.calculateSignalScore(notif),
          raw: notif
        });
      }

      console.log(`[farcaster-adapter] Synced ${messages.length} messages`);
      return messages;

    } catch (e) {
      console.error('[farcaster-adapter] Sync error:', e.message);
      return [];
    }
  }

  async post(content, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Farcaster not configured');
    }

    // Need signer UUID for posting
    const signerUuid = process.env.FARCASTER_SIGNER_UUID;
    if (!signerUuid) {
      throw new Error('FARCASTER_SIGNER_UUID required for posting');
    }

    const body = {
      signer_uuid: signerUuid,
      text: content
    };

    if (options.replyTo) {
      // Extract hash from our ID format
      const parentHash = options.replyTo.replace('farcaster:', '');
      body.parent = parentHash;
    }

    const response = await fetch(`${this.baseUrl}/cast`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Farcaster post error ${response.status}: ${error}`);
    }

    const result = await response.json();
    const hash = result.cast?.hash;

    return {
      id: this.generateId(hash),
      url: `https://warpcast.com/${process.env.FARCASTER_USERNAME || 'user'}/${hash?.slice(0, 10)}`
    };
  }

  calculateSignalScore(notif) {
    switch (notif.type) {
      case 'reply':
        return 85;  // Direct reply is high signal
      case 'mention':
        return 75;  // Mention is high signal
      case 'like':
        return 30;  // Like is low signal
      case 'recast':
        return 40;  // Recast is medium-low signal
      default:
        return 50;
    }
  }
}

module.exports = { FarcasterAdapter };
