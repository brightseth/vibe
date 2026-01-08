/**
 * GET /api/messages/inbox?handle=xxx
 *
 * Get inbox for a user (grouped by sender, unread first)
 *
 * Migration: Reads from Postgres first, falls back to KV
 */

const { cachedKV, CACHE_TTL } = require('../lib/kv-cache');
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
    const { handle } = req.query;

    if (!handle) {
      return res.status(400).json({ error: 'handle required' });
    }

    const h = handle.toLowerCase().replace('@', '');
    let source = 'kv';
    let threads = [];

    // Try Postgres first (new primary) - use SQL GROUP BY for efficiency
    if (isPostgresEnabled() && sql) {
      try {
        // Single query does grouping, counting, and sorting in Postgres
        const pgThreads = await sql`
          WITH ranked_messages AS (
            SELECT
              from_user,
              text as body,
              created_at,
              ROW_NUMBER() OVER (PARTITION BY from_user ORDER BY created_at DESC) as rn
            FROM messages
            WHERE to_user = ${h}
          )
          SELECT
            m.from_user as handle,
            COUNT(*) as message_count,
            SUM(CASE WHEN m.read = false THEN 1 ELSE 0 END) as unread,
            MAX(m.created_at) as latest_time,
            EXTRACT(EPOCH FROM MAX(m.created_at)) * 1000 as timestamp,
            rm.body as preview
          FROM messages m
          JOIN ranked_messages rm ON rm.from_user = m.from_user AND rm.rn = 1
          WHERE m.to_user = ${h}
          GROUP BY m.from_user, rm.body
          ORDER BY
            SUM(CASE WHEN m.read = false THEN 1 ELSE 0 END) DESC,
            MAX(m.created_at) DESC
          LIMIT 50
        `;

        if (pgThreads && pgThreads.length > 0) {
          source = 'postgres';
          threads = pgThreads.map(t => ({
            handle: t.handle,
            unread: parseInt(t.unread) || 0,
            latest: { timestamp: parseInt(t.timestamp), body: t.preview },
            preview: t.preview ? t.preview.slice(0, 50) + (t.preview.length > 50 ? '...' : '') : '',
            last_seen: formatTimeAgo(parseInt(t.timestamp))
          }));
        }
      } catch (pgErr) {
        console.error('[INBOX] Postgres read failed:', pgErr.message);
      }
    }

    // Fall back to KV if Postgres returned nothing or failed
    if (threads.length === 0) {
      try {
        const kv = await cachedKV();
        const rawMessages = await kv.lrange(`messages:${h}`, 0, 99);

        if (rawMessages && rawMessages.length > 0) {
          source = 'kv';
          const messages = rawMessages.map(m =>
            typeof m === 'string' ? JSON.parse(m) : m
          );

          const unreadCounts = await kv.hgetall(`unread:${h}`) || {};

          const bySender = {};
          messages.forEach(m => {
            if (!bySender[m.from]) {
              bySender[m.from] = { handle: m.from, messages: [], unread: unreadCounts[m.from] || 0 };
            }
            bySender[m.from].messages.push(m);
          });

          threads = Object.values(bySender)
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
        }
      } catch (kvErr) {
        console.error('[INBOX] KV read failed:', kvErr.message);
      }
    }

    return res.status(200).json({
      threads,
      _source: source
    });

  } catch (error) {
    console.error('Inbox error:', error);
    return res.status(200).json({
      threads: [],
      _error: 'Storage unavailable',
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
