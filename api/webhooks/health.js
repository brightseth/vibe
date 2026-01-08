/**
 * /api/webhooks/health — Unified Bridge Health Check
 * 
 * Quick health check endpoint for all bridge systems.
 * Used for monitoring, uptime checks, and debugging.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET required' });
  }

  try {
    // Quick health checks
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      bridges: {
        x: { configured: !!process.env.X_WEBHOOK_SECRET, endpoint: '/api/webhooks/x' },
        discord: { configured: !!process.env.DISCORD_BOT_TOKEN, endpoint: '/api/webhooks/discord' },
        github: { configured: !!process.env.GITHUB_WEBHOOK_SECRET, endpoint: '/api/webhooks/github' },
        farcaster: { configured: !!process.env.FARCASTER_FID, endpoint: '/api/webhooks/farcaster' },
        telegram: { configured: !!process.env.TELEGRAM_BOT_TOKEN, endpoint: '/api/telegram/webhook' }
      },
      storage: {
        kv: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
      }
    };

    // Count configured bridges
    const configuredCount = Object.values(health.bridges)
      .filter(bridge => bridge.configured).length;

    // Determine overall status
    if (!health.storage.kv) {
      health.status = 'degraded';
      health.issue = 'Storage not configured';
    } else if (configuredCount === 0) {
      health.status = 'minimal';
      health.issue = 'No bridges configured';
    } else if (configuredCount < 2) {
      health.status = 'partial';
      health.issue = 'Only one bridge configured';
    }

    health.summary = {
      configured_bridges: configuredCount,
      total_bridges: Object.keys(health.bridges).length,
      storage_ok: health.storage.kv,
      recommendation: health.status === 'healthy' 
        ? 'All systems operational'
        : health.status === 'degraded'
        ? 'Configure KV storage'
        : 'Configure more bridges for redundancy'
    };

    // Set appropriate HTTP status
    const statusCode = health.status === 'healthy' ? 200 
                     : health.status === 'degraded' ? 503
                     : 200;

    return res.status(statusCode).json(health);

  } catch (error) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message,
      bridges: null
    });
  }
}