/**
 * POST /api/messages/send
 *
 * Send a message (DM or ping)
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
    const { from, to, body, type = 'dm' } = req.body;

    if (!from || !to || !body) {
      return res.status(400).json({ error: 'from, to, and body required' });
    }

    const fromHandle = from.toLowerCase().replace('@', '');
    const toHandle = to.toLowerCase().replace('@', '');
    const now = Date.now();

    const message = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      from: fromHandle,
      to: toHandle,
      body: body.trim(),
      type, // 'dm' or 'ping'
      timestamp: now,
      read_at: null
    };

    // Store message in list for recipient
    await kv.lpush(`messages:${toHandle}`, JSON.stringify(message));

    // Store in thread (both directions)
    const threadKey = [fromHandle, toHandle].sort().join(':');
    await kv.lpush(`thread:${threadKey}`, JSON.stringify(message));

    // Increment unread count for recipient
    await kv.hincrby(`unread:${toHandle}`, fromHandle, 1);

    return res.status(200).json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
