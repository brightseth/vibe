/**
 * GET /api/db-test
 *
 * Debug endpoint to verify database connection and schema
 */

const { sql, isPostgresEnabled } = require('./lib/db.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!isPostgresEnabled() || !sql) {
    return res.status(200).json({
      ok: false,
      error: 'DATABASE_URL not configured',
      hasUrl: !!process.env.DATABASE_URL,
      urlPrefix: process.env.DATABASE_URL?.slice(0, 30) + '...'
    });
  }

  try {
    // Get current database info
    const dbInfo = await sql`SELECT current_database() as db, current_user as user`;

    // List all tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    // Try to count messages
    let messageCount = 'error';
    try {
      const count = await sql`SELECT COUNT(*) as count FROM messages`;
      messageCount = count[0].count;
    } catch (e) {
      messageCount = e.message;
    }

    return res.status(200).json({
      ok: true,
      database: dbInfo[0].db,
      user: dbInfo[0].user,
      tables: tables.map(t => t.table_name),
      messageCount,
      urlPrefix: process.env.DATABASE_URL?.slice(0, 50) + '...'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      urlPrefix: process.env.DATABASE_URL?.slice(0, 50) + '...'
    });
  }
};
