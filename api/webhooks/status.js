/**
 * /api/webhooks/status — Unified Webhook Health Dashboard
 * 
 * Monitor all webhook endpoints and their health status.
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

/**
 * Get webhook health for all platforms
 */
async function getWebhookHealth() {
  const kv = await getKV();
  const webhooks = {};

  // X/Twitter webhook status
  try {
    const xStats = kv ? await kv.hgetall('vibe:x_webhook_stats') : null;
    const xConfig = {
      webhook_secret: !!process.env.X_WEBHOOK_SECRET,
      bearer_token: !!process.env.X_BEARER_TOKEN,
      api_credentials: !!(process.env.X_API_KEY && process.env.X_API_SECRET)
    };

    let xHealth = 0;
    if (xConfig.webhook_secret) xHealth += 25;
    if (xConfig.bearer_token) xHealth += 25;
    if (xStats?.total_deliveries > 0) xHealth += 25;
    if (xStats?.last_delivery) {
      const lastDelivery = new Date(xStats.last_delivery);
      const hoursSince = (Date.now() - lastDelivery.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) xHealth += 25;
    }

    webhooks.x = {
      platform: 'X (Twitter)',
      endpoint: '/api/webhooks/x',
      health: xHealth,
      status: xHealth >= 75 ? 'healthy' : xHealth >= 50 ? 'warning' : 'error',
      configured: xConfig.webhook_secret && xConfig.bearer_token,
      stats: {
        total_deliveries: parseInt(xStats?.total_deliveries) || 0,
        events_processed: parseInt(xStats?.events_processed) || 0,
        last_delivery: xStats?.last_delivery || null
      }
    };
  } catch (e) {
    webhooks.x = {
      platform: 'X (Twitter)',
      endpoint: '/api/webhooks/x',
      health: 0,
      status: 'error',
      error: e.message
    };
  }

  // Telegram webhook status (placeholder)
  webhooks.telegram = {
    platform: 'Telegram',
    endpoint: '/webhook/telegram',
    health: process.env.TELEGRAM_BOT_TOKEN ? 50 : 0,
    status: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not_configured',
    configured: !!process.env.TELEGRAM_BOT_TOKEN
  };

  // Discord webhook status (placeholder)
  webhooks.discord = {
    platform: 'Discord',
    endpoint: '/webhook/discord',
    health: process.env.DISCORD_BOT_TOKEN ? 50 : 0,
    status: process.env.DISCORD_BOT_TOKEN ? 'configured' : 'not_configured',
    configured: !!process.env.DISCORD_BOT_TOKEN
  };

  // Farcaster webhook status (placeholder)
  webhooks.farcaster = {
    platform: 'Farcaster',
    endpoint: '/api/webhooks/farcaster',
    health: process.env.FARCASTER_PRIVATE_KEY ? 50 : 0,
    status: process.env.FARCASTER_PRIVATE_KEY ? 'configured' : 'not_configured',
    configured: !!process.env.FARCASTER_PRIVATE_KEY
  };

  return webhooks;
}

/**
 * Get overall bridge system health
 */
async function getSystemHealth(webhooks) {
  const totalWebhooks = Object.keys(webhooks).length;
  const configuredWebhooks = Object.values(webhooks).filter(w => w.configured).length;
  const healthyWebhooks = Object.values(webhooks).filter(w => w.health >= 75).length;
  const avgHealth = Object.values(webhooks).reduce((sum, w) => sum + w.health, 0) / totalWebhooks;

  return {
    overall_status: avgHealth >= 75 ? 'healthy' : avgHealth >= 50 ? 'warning' : 'degraded',
    overall_health: Math.round(avgHealth),
    configured_count: configuredWebhooks,
    healthy_count: healthyWebhooks,
    total_count: totalWebhooks,
    recommendations: generateRecommendations(webhooks)
  };
}

/**
 * Generate setup recommendations
 */
function generateRecommendations(webhooks) {
  const recommendations = [];

  if (!webhooks.x.configured) {
    recommendations.push({
      priority: 'high',
      action: 'Configure X webhook',
      description: 'Set X_WEBHOOK_SECRET and X_BEARER_TOKEN to receive X mentions and DMs'
    });
  }

  if (webhooks.x.health < 50) {
    recommendations.push({
      priority: 'medium',
      action: 'Test X webhook',
      description: 'Use /api/webhooks/x/test to verify webhook is working'
    });
  }

  if (!webhooks.telegram.configured) {
    recommendations.push({
      priority: 'medium',
      action: 'Set up Telegram bot',
      description: 'Configure TELEGRAM_BOT_TOKEN to enable Telegram integration'
    });
  }

  if (!webhooks.farcaster.configured) {
    recommendations.push({
      priority: 'low',
      action: 'Connect Farcaster',
      description: 'Set FARCASTER_PRIVATE_KEY for Web3 social integration'
    });
  }

  return recommendations;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET required' });
  }

  try {
    const webhooks = await getWebhookHealth();
    const systemHealth = await getSystemHealth(webhooks);

    // Return comprehensive dashboard data
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      system: systemHealth,
      webhooks,
      setup_guide: {
        priority_order: [
          { platform: 'x', reason: 'Most common platform for mentions' },
          { platform: 'telegram', reason: 'Popular for community chat' },
          { platform: 'discord', reason: 'Developer community platform' },
          { platform: 'farcaster', reason: 'Web3 social networking' }
        ],
        next_steps: [
          '1. Configure X webhook first (highest impact)',
          '2. Test webhook delivery with /api/webhooks/x/test',
          '3. Check social inbox with GET /api/social',
          '4. Set up additional platforms as needed'
        ]
      },
      monitoring: {
        health_check_url: '/api/webhooks/status',
        individual_health: Object.fromEntries(
          Object.entries(webhooks).map(([key, webhook]) => [
            key,
            webhook.endpoint + (webhook.endpoint.includes('/api/webhooks/') ? '/health' : '/health')
          ])
        )
      }
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to get webhook status',
      message: error.message
    });
  }
}