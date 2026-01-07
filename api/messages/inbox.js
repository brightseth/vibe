/**
 * GET /api/messages/inbox?handle=xxx
 *
 * Get inbox for a user (grouped by sender, unread first)
 *
 * Uses cached KV to reduce Vercel KV calls (3k/day limit)
 */

const { cachedKV, CACHE_TTL } = require('../lib/kv-cache');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const kv = await cachedKV();
    const { handle } = req.query;

    if (!handle) {
      return res.status(400).json({ error: 'handle required' });
    }

    const h = handle.toLowerCase().replace('@', '');

    // Get all messages for this user (most recent first, cached for 1 min)
    const rawMessages = await kv.lrange(`messages:${h}`, 0, 99);

    if (!rawMessages || rawMessages.length === 0) {
      return res.status(200).json({ threads: [], _cache: kv.stats ? kv.stats() : null });
    }

    // Parse messages
    const messages = rawMessages.map(m =>
      typeof m === 'string' ? JSON.parse(m) : m
    );

    // Get unread counts (cached)
    const unreadCounts = await kv.hgetall(`unread:${h}`) || {};

    // Group by sender
    const bySender = {};
    messages.forEach(m => {
      if (!bySender[m.from]) {
        bySender[m.from] = {
          handle: m.from,
          messages: [],
          unread: unreadCounts[m.from] || 0
        };
      }
      bySender[m.from].messages.push(m);
    });

    // Convert to array and sort (unread first, then by most recent)
    const threads = Object.values(bySender)
      .map(t => ({
        handle: t.handle,
        unread: t.unread,
        latest: t.messages[0],
        preview: t.messages[0].body.slice(0, 50) + (t.messages[0].body.length > 50 ? '...' : ''),
        last_seen: formatTimeAgo(t.messages[0].timestamp)
      }))
      .sort((a, b) => {
        if (a.unread > 0 && b.unread === 0) return -1;
        if (b.unread > 0 && a.unread === 0) return 1;
        return b.latest.timestamp - a.latest.timestamp;
      });

    return res.status(200).json({
      threads,
      _cache: kv.stats ? kv.stats() : null
    });

  } catch (error) {
    console.error('Inbox error:', error);
    // Graceful degradation
    return res.status(200).json({
      threads: [],
      _error: 'KV unavailable',
      _fallback: true
    });
  }
};

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'unknown';
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
