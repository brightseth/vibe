/**
 * Neon Postgres Connection Helper
 *
 * Uses @neondatabase/serverless for optimal Vercel edge/serverless performance.
 * Includes connection pooling via WebSocket for low latency.
 *
 * Environment Variables Required:
 * - DATABASE_URL: Neon Postgres connection string (pooled)
 *
 * Usage:
 *   const { sql, isPostgresEnabled } = require('./lib/db.js');
 *
 *   // Simple query
 *   const users = await sql`SELECT * FROM users LIMIT 10`;
 *
 *   // Parameterized query (safe from SQL injection)
 *   const user = await sql`SELECT * FROM users WHERE username = ${handle}`;
 */

const { neon, neonConfig } = require('@neondatabase/serverless');

// Configure for Vercel serverless (WebSocket pooling)
neonConfig.fetchConnectionCache = true;

// Check if Postgres is configured
// Support both POSTGRES_DATABASE_URL (from Vercel Storage) and DATABASE_URL (manual)
const DATABASE_URL = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

// Create SQL tagged template function
// Returns null if DATABASE_URL not set (graceful degradation to KV-only mode)
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

/**
 * Check if Postgres is available
 */
function isPostgresEnabled() {
  return !!DATABASE_URL;
}

/**
 * Health check - verify database connection
 */
async function healthCheck() {
  if (!sql) {
    return { ok: false, error: 'DATABASE_URL not configured' };
  }
  try {
    const result = await sql`SELECT NOW() as time, current_database() as db`;
    return { ok: true, time: result[0].time, db: result[0].db };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Helper: Check if we should use Postgres for a given data type
 * During migration, this controls the gradual rollout
 */
const USE_POSTGRES = {
  users: process.env.USE_POSTGRES_USERS === 'true',
  messages: process.env.USE_POSTGRES_MESSAGES === 'true',
  board: process.env.USE_POSTGRES_BOARD === 'true',
  streaks: process.env.USE_POSTGRES_STREAKS === 'true',
  games: process.env.USE_POSTGRES_GAMES === 'true',
  invites: process.env.USE_POSTGRES_INVITES === 'true',
};

function shouldUsePostgres(dataType) {
  return isPostgresEnabled() && USE_POSTGRES[dataType];
}

/**
 * Dual-write helper: Write to both KV and Postgres during migration
 * Returns results from both systems for validation
 */
async function dualWrite(dataType, kvWriteFn, pgWriteFn) {
  const results = { kv: null, pg: null, match: false };

  // Always write to KV (source of truth during migration)
  try {
    results.kv = await kvWriteFn();
  } catch (e) {
    console.error(`[dual-write] KV error for ${dataType}:`, e.message);
    throw e; // KV failure is critical
  }

  // Write to Postgres if enabled (non-blocking during migration)
  if (isPostgresEnabled()) {
    try {
      results.pg = await pgWriteFn();
      results.match = true; // Will add validation logic later
    } catch (e) {
      console.error(`[dual-write] Postgres error for ${dataType}:`, e.message);
      // Don't throw - Postgres errors are non-fatal during migration
    }
  }

  return results;
}

module.exports = {
  sql,
  isPostgresEnabled,
  healthCheck,
  shouldUsePostgres,
  dualWrite
};
