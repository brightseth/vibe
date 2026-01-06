/**
 * Social Sync Cron
 *
 * Runs every minute to sync messages from all connected social channels.
 * Implements the sync-then-read pattern for instant inbox access.
 *
 * Configured in vercel.json:
 * { "path": "/api/cron/social-sync", "schedule": "* * * * *" }
 */

const { XAdapter } = require('../social/adapters/x');
const { FarcasterAdapter } = require('../social/adapters/farcaster');
const inbox = require('../social/inbox');

// All available adapters
const ADAPTERS = [
  new XAdapter(),
  new FarcasterAdapter()
];

// Rate limit: don't sync more than once per 5 minutes per channel
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

async function syncChannel(adapter) {
  const channel = adapter.channel;

  try {
    // Check if configured
    if (!adapter.isConfigured()) {
      console.log(`[social-sync] ${channel}: not configured, skipping`);
      return { channel, skipped: true, reason: 'not_configured' };
    }

    // Check rate limit
    const lastSync = await inbox.getSyncState(channel);
    if (lastSync?.lastSync) {
      const elapsed = Date.now() - new Date(lastSync.lastSync).getTime();
      if (elapsed < MIN_SYNC_INTERVAL_MS) {
        console.log(`[social-sync] ${channel}: rate limited, ${Math.round((MIN_SYNC_INTERVAL_MS - elapsed) / 1000)}s remaining`);
        return { channel, skipped: true, reason: 'rate_limited' };
      }
    }

    // Sync messages
    const sinceId = lastSync?.lastMessageId || null;
    const messages = await adapter.sync(sinceId);

    if (messages.length > 0) {
      // Store messages
      await inbox.storeMessages(messages);

      // Update sync state
      const newestId = messages[0].id;
      await inbox.updateSyncState(channel, {
        lastMessageId: newestId,
        messageCount: messages.length
      });

      console.log(`[social-sync] ${channel}: synced ${messages.length} messages`);
    } else {
      // Update sync state even if no new messages
      await inbox.updateSyncState(channel, {
        lastMessageId: sinceId,
        messageCount: 0
      });
      console.log(`[social-sync] ${channel}: no new messages`);
    }

    return { channel, success: true, count: messages.length };

  } catch (e) {
    console.error(`[social-sync] ${channel} error:`, e.message);
    return { channel, success: false, error: e.message };
  }
}

async function runSync() {
  console.log('[social-sync] Starting sync run...');

  const results = [];

  for (const adapter of ADAPTERS) {
    const result = await syncChannel(adapter);
    results.push(result);
  }

  const synced = results.filter(r => r.success).length;
  const totalMessages = results.reduce((sum, r) => sum + (r.count || 0), 0);

  console.log(`[social-sync] Complete: ${synced}/${results.length} channels, ${totalMessages} new messages`);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    results
  };
}

// Vercel serverless handler
module.exports = async function handler(req, res) {
  // Only allow GET requests (Vercel cron uses GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await runSync();
    res.status(200).json(result);
  } catch (e) {
    console.error('[social-sync] Fatal error:', e);
    res.status(500).json({ error: e.message });
  }
};
