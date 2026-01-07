/**
 * POST /api/messages/send
 *
 * Send a message (DM or ping)
 * Now with Postgres dual-write for migration
 */

const { kv } = require('@vercel/kv');
const { sql, isPostgresEnabled } = require('../lib/db.js');

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

    // Write to Postgres first (new primary)
    let pgSuccess = false;
    if (isPostgresEnabled() && sql) {
      try {
        await sql`
          INSERT INTO messages (id, from_user, to_user, text, read, payload, created_at)
          VALUES (${message.id}, ${fromHandle}, ${toHandle}, ${message.body}, false, ${JSON.stringify({ type })}, NOW())
        `;
        pgSuccess = true;
      } catch (pgErr) {
        console.error('[SEND] Postgres write failed:', pgErr.message);
      }
    }

    // Write to KV (fallback during migration)
    let kvSuccess = false;
    try {
      await kv.lpush(`messages:${toHandle}`, JSON.stringify(message));
      const threadKey = [fromHandle, toHandle].sort().join(':');
      await kv.lpush(`thread:${threadKey}`, JSON.stringify(message));
      await kv.hincrby(`unread:${toHandle}`, fromHandle, 1);
      kvSuccess = true;
    } catch (kvErr) {
      console.error('[SEND] KV write failed:', kvErr.message);
      // If both failed, return error
      if (!pgSuccess) {
        return res.status(503).json({ error: 'Storage unavailable', details: kvErr.message });
      }
    }

    return res.status(200).json({
      success: true,
      message,
      _storage: { postgres: pgSuccess, kv: kvSuccess }
    });

  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
