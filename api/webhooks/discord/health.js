/**
 * /api/webhooks/discord/health — Discord Webhook Health Monitor
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
    const stats = kv ? await kv.hgetall('vibe:discord_webhook_stats') : null;
    
    // Get recent events from social inbox
    const recentEvents = kv ? await kv.lrange('vibe:social_inbox', 0, 9) : [];
    const discordEvents = recentEvents
      .map(event => {
        try {
          const parsed = JSON.parse(event);
          return parsed.platform === 'discord' ? parsed : null;
        } catch {
          return null;
        }
      })
      .filter(event => event !== null);

    // Configuration status
    const config = {
      bot_token: !!process.env.DISCORD_BOT_TOKEN,
      public_key: !!process.env.DISCORD_PUBLIC_KEY,
      webhook_secret: !!process.env.DISCORD_WEBHOOK_SECRET,
      kv_storage: !!kv
    };

    // Calculate health score
    let healthScore = 0;
    if (config.bot_token) healthScore += 30;
    if (config.public_key) healthScore += 20;
    if (config.kv_storage) healthScore += 25;
    if (stats?.total_deliveries > 0) healthScore += 25;
    if (stats?.last_delivery) {
      const lastDelivery = new Date(stats.last_delivery);
      const hoursSince = (Date.now() - lastDelivery.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) healthScore += 0; // No bonus, already counted in deliveries
    }

    // Delivery rate calculation
    const today = new Date().toISOString().split('T')[0];
    const todayDeliveries = stats?.[`deliveries_${today}`] || 0;

    const health = {
      status: healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'warning' : 'error',
      score: healthScore,
      endpoint: '/api/webhooks/discord',
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
      recent_events: discordEvents.slice(0, 5).map(event => ({
        id: event.id,
        type: event.type,
        from: event.from?.handle || 'unknown',
        timestamp: event.timestamp,
        processed: event.processed
      })),
      setup_instructions: {
        webhook_url: `https://${req.headers.host}/api/webhooks/discord`,
        test_url: `https://${req.headers.host}/api/webhooks/discord/test`,
        required_env: [
          'DISCORD_BOT_TOKEN (bot authentication)',
          'DISCORD_PUBLIC_KEY (signature verification)',
          'DISCORD_WEBHOOK_SECRET (optional, additional security)',
          'KV_REST_API_URL & KV_REST_API_TOKEN (for storage)'
        ],
        discord_setup: [
          '1. Go to Discord Developer Portal → Applications',
          '2. Create new application or select existing',
          '3. Go to Bot section → Create bot',
          '4. Copy bot token to DISCORD_BOT_TOKEN',
          '5. Go to General Information → Copy Public Key',
          '6. Set webhook URL in Discord interactions endpoint',
          '7. Configure bot permissions and intents',
          '8. Invite bot to your Discord server'
        ]
      }
    };

    // Add alerts if needed
    const alerts = [];
    if (!config.bot_token) {
      alerts.push('⚠️ DISCORD_BOT_TOKEN not configured - webhook cannot authenticate');
    }
    if (!config.public_key) {
      alerts.push('⚠️ DISCORD_PUBLIC_KEY not configured - signature verification disabled');
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
      endpoint: '/api/webhooks/discord'
    });
  }
}