/**
 * Unified Social Inbox
 *
 * Stores and retrieves messages from all connected social channels.
 * Uses Vercel KV for persistence with the sync-then-read pattern.
 *
 * KV Schema:
 * - social:inbox - Sorted set of message IDs by timestamp
 * - social:msg:{id} - Individual message data
 * - social:sync:{channel} - Last sync state per channel
 * - social:contacts - Hash of unified contacts
 */

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Limits
const INBOX_LIMIT = 1000;  // Keep last 1000 messages per channel
const MAX_MESSAGE_AGE_DAYS = 30;  // TTL for messages

// In-memory fallback
const memory = {
  messages: [],
  syncState: {}
};

// KV wrapper
async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

/**
 * Store a batch of messages from a sync
 */
async function storeMessages(messages) {
  const kv = await getKV();

  if (kv) {
    const pipeline = kv.pipeline();

    for (const msg of messages) {
      // Store message data
      pipeline.set(`social:msg:${msg.id}`, JSON.stringify(msg), {
        ex: MAX_MESSAGE_AGE_DAYS * 24 * 60 * 60
      });

      // Add to sorted set (score = timestamp)
      const score = new Date(msg.timestamp).getTime();
      pipeline.zadd('social:inbox', { score, member: msg.id });

      // Also add to channel-specific set
      pipeline.zadd(`social:inbox:${msg.channel}`, { score, member: msg.id });
    }

    await pipeline.exec();
  } else {
    // Memory fallback
    for (const msg of messages) {
      const existing = memory.messages.findIndex(m => m.id === msg.id);
      if (existing === -1) {
        memory.messages.unshift(msg);
      }
    }
    memory.messages = memory.messages.slice(0, INBOX_LIMIT);
  }
}

/**
 * Get messages from inbox
 */
async function getMessages(options = {}) {
  const {
    channel = 'all',
    limit = 20,
    offset = 0,
    highSignal = true,
    minScore = 50
  } = options;

  const kv = await getKV();

  if (kv) {
    // Get message IDs from sorted set (newest first)
    const key = channel === 'all' ? 'social:inbox' : `social:inbox:${channel}`;
    const ids = await kv.zrange(key, offset, offset + limit - 1, { rev: true });

    if (!ids || ids.length === 0) {
      return [];
    }

    // Fetch message data
    const messages = [];
    for (const id of ids) {
      const data = await kv.get(`social:msg:${id}`);
      if (data) {
        const msg = typeof data === 'string' ? JSON.parse(data) : data;
        // Apply high-signal filter
        if (!highSignal || msg.signal_score >= minScore) {
          messages.push(msg);
        }
      }
    }

    return messages;
  } else {
    // Memory fallback
    let filtered = memory.messages;

    if (channel !== 'all') {
      filtered = filtered.filter(m => m.channel === channel);
    }

    if (highSignal) {
      filtered = filtered.filter(m => m.signal_score >= minScore);
    }

    return filtered.slice(offset, offset + limit);
  }
}

/**
 * Get inbox summary (counts per channel)
 */
async function getInboxSummary() {
  const kv = await getKV();
  const channels = ['x', 'farcaster', 'discord', 'telegram', 'whatsapp', 'email'];
  const summary = { total: 0, channels: {} };

  if (kv) {
    for (const channel of channels) {
      const count = await kv.zcard(`social:inbox:${channel}`);
      if (count > 0) {
        summary.channels[channel] = count;
        summary.total += count;
      }
    }
  } else {
    for (const msg of memory.messages) {
      summary.channels[msg.channel] = (summary.channels[msg.channel] || 0) + 1;
      summary.total++;
    }
  }

  return summary;
}

/**
 * Get sync state for a channel
 */
async function getSyncState(channel) {
  const kv = await getKV();

  if (kv) {
    const state = await kv.get(`social:sync:${channel}`);
    return state ? (typeof state === 'string' ? JSON.parse(state) : state) : null;
  } else {
    return memory.syncState[channel] || null;
  }
}

/**
 * Update sync state for a channel
 */
async function updateSyncState(channel, state) {
  const kv = await getKV();
  const syncData = {
    ...state,
    lastSync: new Date().toISOString()
  };

  if (kv) {
    await kv.set(`social:sync:${channel}`, JSON.stringify(syncData));
  } else {
    memory.syncState[channel] = syncData;
  }
}

/**
 * Get adapter status for all channels
 */
async function getChannelStatuses() {
  const { XAdapter } = require('./adapters/x');
  const { FarcasterAdapter } = require('./adapters/farcaster');

  const adapters = [
    new XAdapter(),
    new FarcasterAdapter()
  ];

  const statuses = {};

  for (const adapter of adapters) {
    try {
      statuses[adapter.channel] = {
        configured: adapter.isConfigured(),
        capabilities: adapter.getCapabilities(),
        status: adapter.isConfigured() ? await adapter.getStatus() : { status: 'disconnected' }
      };
    } catch (e) {
      statuses[adapter.channel] = {
        configured: false,
        status: { status: 'error', error: e.message }
      };
    }
  }

  return statuses;
}

module.exports = {
  storeMessages,
  getMessages,
  getInboxSummary,
  getSyncState,
  updateSyncState,
  getChannelStatuses
};
