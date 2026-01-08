/**
 * /api/webhooks/x/health — X Webhook Health Monitor
 * 
 * Monitor webhook delivery statistics and health.
 */

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET required' });
  }

  const kv = await getKV();
  
  try {
    // Get webhook statistics
    const stats = kv ? await kv.hgetall('vibe:x_webhook_stats') : null;
    
    // Get recent events from social inbox
    const recentEvents = kv ? await kv.lrange('vibe:social_inbox', 0, 9) : [];
    const xEvents = recentEvents
      .map(event => {
        try {
          const parsed = JSON.parse(event);
          return parsed.platform === 'x' ? parsed : null;
        } catch {
          return null;
        }
      })
      .filter(event => event !== null);

    // Configuration status
    const config = {
      webhook_secret: !!process.env.X_WEBHOOK_SECRET,
      bearer_token: !!process.env.X_BEARER_TOKEN,
      api_credentials: !!(process.env.X_API_KEY && process.env.X_API_SECRET),
      kv_storage: !!kv
    };

    // Calculate health score
    let healthScore = 0;
    if (config.webhook_secret) healthScore += 25;
    if (config.kv_storage) healthScore += 25;
    if (stats?.total_deliveries > 0) healthScore += 25;
    if (stats?.last_delivery) {
      const lastDelivery = new Date(stats.last_delivery);
      const hoursSince = (Date.now() - lastDelivery.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) healthScore += 25;
    }

    // Delivery rate calculation
    const today = new Date().toISOString().split('T')[0];
    const todayDeliveries = stats?.[`deliveries_${today}`] || 0;

    const health = {
      status: healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'warning' : 'error',
      score: healthScore,
      endpoint: '/api/webhooks/x',
      configuration: config,
      statistics: {
        total_deliveries: parseInt(stats?.total_deliveries) || 0,
        events_processed: parseInt(stats?.events_processed) || 0,
        last_delivery: stats?.last_delivery || null,
        deliveries_today: todayDeliveries,
        error_rate: stats?.total_deliveries > 0 
          ? ((parseInt(stats?.failure_count) || 0) / parseInt(stats.total_deliveries) * 100).toFixed(2) + '%'
          : '0%'
      },
      recent_events: xEvents.slice(0, 5).map(event => ({
        id: event.id,
        type: event.type,
        from: event.from?.handle || 'unknown',
        timestamp: event.timestamp,
        processed: event.processed
      })),
      setup_instructions: {
        webhook_url: `https://${req.headers.host}/api/webhooks/x`,
        test_url: `https://${req.headers.host}/api/webhooks/x/test`,
        required_env: [
          'X_WEBHOOK_SECRET (for signature verification)',
          'X_BEARER_TOKEN (for API access)',
          'KV_REST_API_URL & KV_REST_API_TOKEN (for storage)'
        ],
        x_webhook_setup: [
          '1. Go to X Developer Portal → Projects & Apps',
          '2. Select your app → Dev environments',
          '3. Add webhook URL and enable events',
          '4. Complete CRC challenge verification',
          '5. Subscribe to desired events (tweets, DMs, etc.)'
        ]
      }
    };

    // Add alerts if needed
    const alerts = [];
    if (!config.webhook_secret) {
      alerts.push('⚠️ X_WEBHOOK_SECRET not configured - webhook signature verification disabled');
    }
    if (!config.kv_storage) {
      alerts.push('⚠️ KV storage not available - events will not be persisted');
    }
    if (stats?.total_deliveries === 0) {
      alerts.push('ℹ️ No webhook deliveries received yet - test the endpoint');
    }
    if (stats?.failure_count > 5) {
      alerts.push('🚨 High failure rate detected - check webhook configuration');
    }

    health.alerts = alerts;

    return res.status(200).json(health);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message,
      endpoint: '/api/webhooks/x'
    });
  }
}