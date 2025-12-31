/**
 * POST /api/presence/heartbeat
 *
 * Register or update presence for a user
 */

const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { handle, one_liner } = req.body;

    if (!handle) {
      return res.status(400).json({ error: 'handle required' });
    }

    const h = handle.toLowerCase().replace('@', '');
    const now = Date.now();

    // Store in KV
    await kv.hset(`presence:${h}`, {
      handle: h,
      one_liner: one_liner || '',
      last_heartbeat: now,
      visible: true
    });

    // Add to active users set with timestamp as score
    await kv.zadd('presence:active', { score: now, member: h });

    return res.status(200).json({
      success: true,
      handle: h,
      timestamp: now
    });

  } catch (error) {
    console.error('Heartbeat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
