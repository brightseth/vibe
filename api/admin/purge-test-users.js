/**
 * Purge test_new_user and test_old_user
 * DELETE /api/admin/purge-test-users
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

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const TEST_USERS = ['test_new_user', 'test_old_user'];

  try {
    // Purge from Postgres
    const deleted = isPostgresEnabled() && sql
      ? await sql`DELETE FROM users WHERE username = ANY(${TEST_USERS}) RETURNING username`
      : [];

    // Purge from KV
    const kv = await getKV();
    const kvDeleted = [];
    if (kv) {
      for (const user of TEST_USERS) {
        await kv.del(`user:${user}`);
        kvDeleted.push(user);
      }
    }

    return res.status(200).json({
      success: true,
      postgres: deleted.map(u => u.username),
      kv: kvDeleted,
      message: '✓ Test users purged'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
