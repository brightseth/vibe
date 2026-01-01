/**
 * GET /api/presence/who
 *
 * Get list of active/idle users
 */

const { kv } = require('@vercel/kv');

const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

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
    const now = Date.now();

    // Get all handles from sorted set (most recent first)
    const handles = await kv.zrange('presence:active', 0, -1, { rev: true });

    if (!handles || handles.length === 0) {
      return res.status(200).json({ users: [] });
    }

    // Get presence data for each handle
    // Note: Main API uses kv.set (JSON), not hset (hash)
    const users = await Promise.all(
      handles.map(async (handle) => {
        const data = await kv.get(`presence:${handle}`);
        if (!data) return null;

        // Data is stored as JSON object by /api/presence.js
        const lastSeen = data.lastSeen ? new Date(data.lastSeen).getTime() : 0;
        const age = now - lastSeen;

        return {
          handle: data.username || handle,
          one_liner: data.workingOn || '',
          status: age < IDLE_THRESHOLD ? 'active' : 'idle',
          lastSeen: lastSeen,
          last_seen: formatTimeAgo(lastSeen),
          // Context (from context object)
          file: data.context?.file || null,
          branch: data.context?.branch || null,
          error: data.context?.error || null,
          note: data.context?.note || null,
          // Mood (explicit or inferred)
          mood: data.mood || null,
          mood_inferred: data.mood_inferred === true,
          mood_reason: data.mood_reason || null
        };
      })
    );

    // Filter nulls and sort (active first)
    const activeUsers = users
      .filter(u => u !== null)
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return 0;
      });

    return res.status(200).json({ users: activeUsers });

  } catch (error) {
    console.error('Who error:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
