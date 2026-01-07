/**
 * Database Health Check Endpoint
 * GET /api/db-health
 *
 * Returns status of both KV and Postgres connections.
 * Used for monitoring and migration validation.
 */

const { kv } = require('@vercel/kv');
const { isPostgresEnabled, healthCheck } = require('./lib/db.js');

module.exports = async function handler(req, res) {
  const status = {
    ok: true,
    timestamp: new Date().toISOString(),
    kv: { ok: false },
    postgres: { ok: false, enabled: isPostgresEnabled() },
  };

  // Check KV
  try {
    const start = Date.now();
    await kv.ping();
    status.kv = {
      ok: true,
      latency: Date.now() - start,
    };
  } catch (e) {
    status.kv = { ok: false, error: e.message };
    status.ok = false;
  }

  // Check Postgres (if configured)
  if (isPostgresEnabled()) {
    try {
      const start = Date.now();
      const result = await healthCheck();
      status.postgres = {
        ...result,
        latency: Date.now() - start,
      };
      if (!result.ok) status.ok = false;
    } catch (e) {
      status.postgres = { ok: false, error: e.message, enabled: true };
      // Don't fail overall status during migration - Postgres is optional
    }
  }

  // Return appropriate status code
  res.status(status.ok ? 200 : 503).json(status);
};
