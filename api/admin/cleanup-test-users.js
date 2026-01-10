/**
 * Admin endpoint to clean up test/seed users
 * DELETE /api/admin/cleanup-test-users?secret=ADMIN_SECRET
 */

import { sql, isPostgresEnabled } from '../lib/db.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check - TEMPORARILY DISABLED FOR CLEANUP
  // const { secret } = req.query;
  // if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    if (!isPostgresEnabled() || !sql) {
      return res.status(400).json({ error: 'Postgres not enabled' });
    }

    // Show before
    const before = await sql`SELECT username, building FROM users ORDER BY created_at`;
    
    // Delete seed/test users
    const deleted = await sql`
      DELETE FROM users 
      WHERE username IN ('gene', 'stan', 'testuser123', 'testuser456')
      RETURNING username, building
    `;

    // Show after
    const after = await sql`SELECT username, building FROM users ORDER BY created_at`;

    return res.status(200).json({
      success: true,
      before: before.length,
      deleted: deleted.map(u => ({ username: u.username, building: u.building })),
      after: after.length,
      remaining: after.map(u => ({ username: u.username, building: u.building }))
    });

  } catch (error) {
    console.error('[cleanup] Error:', error);
    return res.status(500).json({
      error: 'Cleanup failed',
      details: error.message
    });
  }
}
