/**
 * GET /api/messages/thread?me=xxx&them=yyy
 *
 * Get thread between two users and mark as read
 */

const { kv } = require('@vercel/kv');

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
    const { me, them } = req.query;

    if (!me || !them) {
      return res.status(400).json({ error: 'me and them required' });
    }

    const myHandle = me.toLowerCase().replace('@', '');
    const theirHandle = them.toLowerCase().replace('@', '');

    // Get thread (sorted key ensures both users see same thread)
    const threadKey = [myHandle, theirHandle].sort().join(':');
    const rawMessages = await kv.lrange(`thread:${threadKey}`, 0, 99);

    if (!rawMessages || rawMessages.length === 0) {
      return res.status(200).json({ messages: [] });
    }

    // Parse and reverse (oldest first for display)
    const messages = rawMessages
      .map(m => typeof m === 'string' ? JSON.parse(m) : m)
      .reverse();

    // Mark as read (clear unread count from them)
    await kv.hdel(`unread:${myHandle}`, theirHandle);

    return res.status(200).json({ messages });

  } catch (error) {
    console.error('Thread error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
