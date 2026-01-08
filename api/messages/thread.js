/**
 * GET /api/messages/thread?me=xxx&them=yyy
 *
 * Get thread between two users and mark as read
 *
 * Migration: Reads from Postgres first, falls back to KV
 */

const { kv } = require('@vercel/kv');
const { sql, isPostgresEnabled } = require('../lib/db.js');

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
    let messages = [];
    let source = 'none';

    // Try Postgres first (primary storage)
    if (isPostgresEnabled() && sql) {
      try {
        // Query using LEAST/GREATEST to match thread index
        const pgMessages = await sql`
          SELECT id, from_user as from, to_user as to, text as body, read,
                 EXTRACT(EPOCH FROM created_at) * 1000 as timestamp,
                 payload
          FROM messages
          WHERE LEAST(from_user, to_user) = LEAST(${myHandle}, ${theirHandle})
            AND GREATEST(from_user, to_user) = GREATEST(${myHandle}, ${theirHandle})
          ORDER BY created_at ASC
          LIMIT 100
        `;

        if (pgMessages && pgMessages.length > 0) {
          messages = pgMessages.map(m => ({
            id: m.id,
            from: m.from,
            to: m.to,
            body: m.body,
            timestamp: parseInt(m.timestamp),
            read: m.read,
            payload: m.payload
          }));
          source = 'postgres';

          // Mark messages from them as read in Postgres
          await sql`
            UPDATE messages
            SET read = true
            WHERE to_user = ${myHandle}
              AND from_user = ${theirHandle}
              AND read = false
          `;
        }
      } catch (pgErr) {
        console.error('[THREAD] Postgres error:', pgErr.message);
      }
    }

    // Fall back to KV if Postgres returned nothing
    if (messages.length === 0) {
      try {
        const threadKey = [myHandle, theirHandle].sort().join(':');
        const rawMessages = await kv.lrange(`thread:${threadKey}`, 0, 99);

        if (rawMessages && rawMessages.length > 0) {
          messages = rawMessages
            .map(m => typeof m === 'string' ? JSON.parse(m) : m)
            .reverse(); // oldest first for display
          source = 'kv';

          // Mark as read in KV
          await kv.hdel(`unread:${myHandle}`, theirHandle);
        }
      } catch (kvErr) {
        console.error('[THREAD] KV error:', kvErr.message);
      }
    }

    return res.status(200).json({ messages, _source: source });

  } catch (error) {
    console.error('Thread error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
