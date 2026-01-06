/**
 * Unified Social Inbox API
 *
 * GET /api/social - Get inbox messages
 *   ?channel=x|farcaster|all (default: all)
 *   ?limit=20 (default: 20, max: 100)
 *   ?high_signal=true (default: true, filter to score >= 50)
 *   ?refresh=true (trigger immediate sync)
 *
 * GET /api/social?status=true - Get channel statuses
 * GET /api/social?summary=true - Get inbox summary
 *
 * POST /api/social - Post to channel(s)
 *   { content: string, channels: string[], dry_run?: boolean, reply_to?: string }
 */

const inbox = require('./inbox');
const { XAdapter } = require('./adapters/x');
const { FarcasterAdapter } = require('./adapters/farcaster');

// Adapter registry
const ADAPTERS = {
  x: new XAdapter(),
  farcaster: new FarcasterAdapter()
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - Read inbox
  if (req.method === 'GET') {
    const { channel, limit, high_signal, refresh, status, summary } = req.query;

    // Get channel statuses
    if (status === 'true') {
      const statuses = await inbox.getChannelStatuses();
      return res.status(200).json({ success: true, channels: statuses });
    }

    // Get inbox summary
    if (summary === 'true') {
      const summaryData = await inbox.getInboxSummary();
      return res.status(200).json({ success: true, summary: summaryData });
    }

    // Trigger refresh if requested
    if (refresh === 'true') {
      // Import and run sync
      try {
        const syncModule = require('./cron/social-sync');
        // Note: Can't call the cron directly, just note that refresh was requested
        console.log('[social] Refresh requested - sync will run on next cron');
      } catch (e) {
        console.log('[social] Refresh trigger error:', e.message);
      }
    }

    // Get messages
    const messages = await inbox.getMessages({
      channel: channel || 'all',
      limit: Math.min(parseInt(limit) || 20, 100),
      highSignal: high_signal !== 'false'
    });

    // Format for display
    const formatted = messages.map(msg => ({
      id: msg.id,
      channel: msg.channel,
      type: msg.type,
      from: msg.from.handle,
      name: msg.from.name,
      content: msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content,
      timestamp: msg.timestamp,
      timeAgo: formatTimeAgo(msg.timestamp),
      signal: msg.signal_score,
      replyHint: `reply to ${msg.id} with "..."`
    }));

    const summaryData = await inbox.getInboxSummary();

    return res.status(200).json({
      success: true,
      messages: formatted,
      count: formatted.length,
      summary: summaryData
    });
  }

  // POST - Send message
  if (req.method === 'POST') {
    const { content, channels, dry_run, reply_to } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Missing content' });
    }

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: 'Missing channels array' });
    }

    // Validate channels
    const validChannels = channels.filter(c => ADAPTERS[c]);
    if (validChannels.length === 0) {
      return res.status(400).json({
        error: 'No valid channels',
        available: Object.keys(ADAPTERS)
      });
    }

    // Dry run - preview formatting
    if (dry_run) {
      const previews = {};
      for (const channel of validChannels) {
        const adapter = ADAPTERS[channel];
        const caps = adapter.getCapabilities();

        previews[channel] = {
          configured: adapter.isConfigured(),
          canWrite: caps.write,
          content: content.slice(0, channel === 'x' ? 280 : 500),
          wouldTruncate: channel === 'x' && content.length > 280
        };
      }

      return res.status(200).json({
        success: true,
        dry_run: true,
        previews
      });
    }

    // Actually post
    const results = {};
    for (const channel of validChannels) {
      const adapter = ADAPTERS[channel];

      if (!adapter.isConfigured()) {
        results[channel] = { success: false, error: 'Not configured' };
        continue;
      }

      try {
        const result = await adapter.post(content, { replyTo: reply_to });
        results[channel] = { success: true, ...result };
      } catch (e) {
        results[channel] = { success: false, error: e.message };
      }
    }

    const successCount = Object.values(results).filter(r => r.success).length;

    return res.status(200).json({
      success: successCount > 0,
      posted: successCount,
      total: validChannels.length,
      results
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
