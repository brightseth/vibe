/**
 * One-time ghost purge from BOTH Postgres and KV
 * DELETE /api/admin/purge-ghosts
 *
 * IMPORTANT: Remove this endpoint after use!
 */

import { sql, isPostgresEnabled } from '../lib/db.js';

const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

const GHOSTS = ['gene', 'stan', 'testuser123', 'testuser456'];

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results = {
    postgres: { deleted: [] },
    kv: { deleted: [] }
  };

  try {
    // 1. Purge from Postgres
    if (isPostgresEnabled() && sql) {
      const deleted = await sql`
        DELETE FROM users
        WHERE username = ANY(${GHOSTS})
        RETURNING username
      `;
      results.postgres.deleted = deleted.map(u => u.username);
    }

    // 2. Purge from KV
    const kv = await getKV();
    if (kv) {
      for (const ghost of GHOSTS) {
        try {
          await kv.del(`user:${ghost}`);
          results.kv.deleted.push(ghost);
        } catch (e) {
          console.error(`Failed to delete ${ghost} from KV:`, e.message);
        }
      }
    }

    // 3. Verify cleanup
    const remaining = [];
    if (isPostgresEnabled() && sql) {
      const check = await sql`SELECT username FROM users WHERE username = ANY(${GHOSTS})`;
      remaining.push(...check.map(u => u.username));
    }

    return res.status(200).json({
      success: true,
      postgres: results.postgres,
      kv: results.kv,
      remaining,
      message: remaining.length === 0 ? '✓ All ghosts purged!' : '⚠️  Some ghosts remain'
    });

  } catch (error) {
    console.error('[purge-ghosts] Error:', error);
    return res.status(500).json({
      error: 'Purge failed',
      details: error.message
    });
  }
}
