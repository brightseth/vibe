/**
 * /api/webhooks/status — Bridge Status Dashboard
 * 
 * Shows the status of all webhook bridges and social integrations.
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
    // X/Twitter Bridge Status
    const xStats = kv ? await kv.hgetall('vibe:x_webhook_stats') : null;
    const xConfig = {
      webhook_secret: !!process.env.X_WEBHOOK_SECRET,
      bearer_token: !!process.env.X_BEARER_TOKEN,
      api_credentials: !!(process.env.X_API_KEY && process.env.X_API_SECRET),
    };
    
    // Social Inbox Status
    const inboxEvents = kv ? await kv.lrange('vibe:social_inbox', 0, 4) : [];
    const recentXEvents = inboxEvents
      .map(event => {
        try {
          const parsed = JSON.parse(event);
          return parsed.platform === 'x' ? parsed : null;
        } catch {
          return null;
        }
      })
      .filter(event => event !== null);

    // Bridge Health Scores
    const bridges = {
      x: {
        name: 'X/Twitter',
        endpoint: '/api/webhooks/x',
        health_endpoint: '/api/webhooks/x/health',
        test_endpoint: '/api/webhooks/x/test',
        configured: xConfig.webhook_secret && xConfig.api_credentials,
        deliveries: parseInt(xStats?.total_deliveries) || 0,
        events_processed: parseInt(xStats?.events_processed) || 0,
        last_delivery: xStats?.last_delivery || null,
        status: xConfig.webhook_secret ? (xStats?.total_deliveries > 0 ? 'active' : 'ready') : 'needs_config'
      },
      telegram: {
        name: 'Telegram',
        endpoint: '/api/webhooks/telegram',
        configured: !!process.env.TELEGRAM_BOT_TOKEN,
        status: 'planned'
      },
      discord: {
        name: 'Discord',
        endpoint: '/api/webhooks/discord',
        configured: !!process.env.DISCORD_WEBHOOK_URL,
        status: 'planned'
      },
      farcaster: {
        name: 'Farcaster',
        endpoint: '/api/webhooks/farcaster',
        configured: false,
        status: 'planned'
      }
    };

    // Overall system health
    const totalDeliveries = Object.values(bridges).reduce((sum, bridge) => sum + (bridge.deliveries || 0), 0);
    const activeBridges = Object.values(bridges).filter(bridge => bridge.status === 'active').length;
    const readyBridges = Object.values(bridges).filter(bridge => bridge.status === 'ready').length;
    
    const systemHealth = {
      status: activeBridges > 0 ? 'operational' : readyBridges > 0 ? 'ready' : 'setup_required',
      score: Math.round((activeBridges * 100 + readyBridges * 50) / Object.keys(bridges).length),
      kv_available: !!kv,
      total_deliveries: totalDeliveries,
      active_bridges: activeBridges,
      ready_bridges: readyBridges
    };

    // Setup instructions for unconfigured bridges
    const setupInstructions = {};
    
    if (!xConfig.webhook_secret) {
      setupInstructions.x = [
        'Set X_WEBHOOK_SECRET in environment variables',
        'Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET',
        `Configure webhook URL: https://${req.headers.host}/api/webhooks/x`,
        'Test with: curl -X POST /api/webhooks/x/test'
      ];
    }

    const response = {
      status: systemHealth.status,
      health_score: systemHealth.score,
      bridges,
      system: systemHealth,
      recent_events: {
        x: recentXEvents.slice(0, 3).map(event => ({
          type: event.type,
          from: event.from?.handle || 'unknown',
          timestamp: event.timestamp,
          processed: event.processed
        }))
      },
      urls: {
        x_webhook: `https://${req.headers.host}/api/webhooks/x`,
        x_health: `https://${req.headers.host}/api/webhooks/x/health`,
        x_test: `https://${req.headers.host}/api/webhooks/x/test`,
        social_inbox: `https://${req.headers.host}/api/social/inbox`,
        webhook_registration: `https://${req.headers.host}/api/webhooks`
      },
      setup_instructions: Object.keys(setupInstructions).length > 0 ? setupInstructions : null,
      last_updated: new Date().toISOString()
    };

    return res.status(200).json(response);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message,
      health_score: 0
    });
  }
}