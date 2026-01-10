/**
 * Feed API - Activity feed for /vibe (ships, board posts, etc)
 * GET /api/feed - Get recent activity
 */

import { sql, isPostgresEnabled } from './lib/db.js';

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    console.error('[feed] KV load error:', e.message);
    return null;
  }
}

async function getRecentActivity(limit = 20) {
  const items = [];

  // Try Postgres first
  if (isPostgresEnabled() && sql) {
    try {
      const entries = await sql`
        SELECT id, author as handle, content, category, tags, url, created_at as timestamp
        FROM board_entries
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return entries.map(e => ({
        id: e.id,
        handle: e.handle,
        content: e.content,
        what: e.content,
        category: e.category,
        tags: e.tags || [],
        url: e.url,
        timestamp: e.timestamp,
        _storage: 'postgres'
      }));
    } catch (pgErr) {
      console.error('[feed] Postgres query ERROR:', pgErr.message);
    }
  }

  // Fall back to KV
  const kv = await getKV();
  if (kv) {
    try {
      const entryIds = await kv.lrange('board:entries', 0, limit - 1);

      for (const id of entryIds) {
        const entry = await kv.get(`board:entry:${id}`);
        if (entry) {
          items.push({
            id: entry.id,
            handle: entry.author || entry.handle,
            content: entry.content,
            what: entry.content,
            category: entry.category,
            tags: entry.tags || [],
            url: entry.url,
            timestamp: entry.timestamp,
            _storage: 'kv'
          });
        }
      }

      return items;
    } catch (e) {
      console.error('[feed] KV read error:', e.message);
    }
  }

  return [];
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit) || 20;
    const items = await getRecentActivity(Math.min(limit, 50));

    return res.status(200).json({
      ok: true,
      items,
      count: items.length
    });
  } catch (error) {
    console.error('[feed] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch feed',
      details: error.message
    });
  }
}
