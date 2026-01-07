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

    // Try Postgres first (primary storage)
    let stored = false;
    let storage = 'none';
    let pgError = null;
    let kvError = null;
    const payload = JSON.stringify({ type });

    if (isPostgresEnabled() && sql) {
      try {
        await sql`
          INSERT INTO messages (id, from_user, to_user, text, read, payload, created_at)
          VALUES (${message.id}, ${fromHandle}, ${toHandle}, ${message.body}, false, ${payload}::jsonb, NOW())
        `;
        stored = true;
        storage = 'postgres';
      } catch (pgErr) {
        pgError = pgErr.message;
        console.error('[SEND] Postgres failed:', pgErr.message);
      }
    }

    // Try KV as backup (may fail if rate limited)
    if (!stored) {
      try {
        await kv.lpush(`messages:${toHandle}`, JSON.stringify(message));
        const threadKey = [fromHandle, toHandle].sort().join(':');
        await kv.lpush(`thread:${threadKey}`, JSON.stringify(message));
        await kv.hincrby(`unread:${toHandle}`, fromHandle, 1);
        stored = true;
        storage = 'kv';
      } catch (kvErr) {
        kvError = kvErr.message;
        console.error('[SEND] KV failed:', kvErr.message);
      }
    }

    if (!stored) {
      return res.status(503).json({
        error: 'All storage backends unavailable',
        _debug: {
          pgEnabled: isPostgresEnabled(),
          sqlAvailable: !!sql,
          pgError,
          kvError
        }
      });
    }

    return res.status(200).json({
      success: true,
      message,
      _storage: storage
    });

  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
