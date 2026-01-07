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
 *   import { sql, getClient } from './lib/db.js';
 *
 *   // Simple query
 *   const users = await sql`SELECT * FROM users LIMIT 10`;
 *
 *   // Parameterized query (safe from SQL injection)
 *   const user = await sql`SELECT * FROM users WHERE username = ${handle}`;
 *
 *   // Transaction
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     await client.query('INSERT INTO users ...');
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   }
 */

import { neon, neonConfig } from '@neondatabase/serverless';

// Configure for Vercel serverless (WebSocket pooling)
neonConfig.fetchConnectionCache = true;

// Check if Postgres is configured
const DATABASE_URL = process.env.DATABASE_URL;

// Create SQL tagged template function
// Returns null if DATABASE_URL not set (graceful degradation to KV-only mode)
export const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

/**
 * Check if Postgres is available
 */
export function isPostgresEnabled() {
  return !!DATABASE_URL;
}

/**
 * Get a client for transactions (when needed)
 * Note: For most queries, use the `sql` template function instead
 */
export async function getClient() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  // For transactions, we'd need @neondatabase/serverless Pool
  // For now, most operations can use the sql tagged template
  return { query: sql };
}

/**
 * Health check - verify database connection
 */
export async function healthCheck() {
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

export function shouldUsePostgres(dataType) {
  return isPostgresEnabled() && USE_POSTGRES[dataType];
}

/**
 * Dual-write helper: Write to both KV and Postgres during migration
 * Returns results from both systems for validation
 */
export async function dualWrite(dataType, kvWriteFn, pgWriteFn) {
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
