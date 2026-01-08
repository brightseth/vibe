/**
 * /api/webhooks/farcaster/health — Farcaster Webhook Health Monitor
 * 
 * Monitor Farcaster webhook delivery statistics and health.
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
    const stats = kv ? await kv.hgetall('vibe:farcaster_webhook_stats') : null;
    
    // Get recent events from social inbox
    const recentEvents = kv ? await kv.lrange('vibe:social_inbox', 0, 9) : [];
    const farcasterEvents = recentEvents
      .map(event => {
        try {
          const parsed = JSON.parse(event);
          return parsed.platform === 'farcaster' ? parsed : null;
        } catch {
          return null;
        }
      })
      .filter(event => event !== null);

    // Configuration status
    const config = {
      private_key: !!process.env.FARCASTER_PRIVATE_KEY,
      fid: !!process.env.FARCASTER_FID,
      webhook_secret: !!process.env.FARCASTER_WEBHOOK_SECRET,
      hub_url: process.env.FARCASTER_HUB_URL || 'https://nemes.farcaster.xyz:2283',
      kv_storage: !!kv
    };

    // Calculate health score
    let healthScore = 0;
    if (config.private_key) healthScore += 20;
    if (config.fid) healthScore += 20;
    if (config.webhook_secret) healthScore += 20;
    if (config.kv_storage) healthScore += 20;
    if (stats?.total_deliveries > 0) healthScore += 20;

    // Delivery rate calculation
    const today = new Date().toISOString().split('T')[0];
    const todayDeliveries = stats?.[`deliveries_${today}`] || 0;

    const health = {
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'error',
      score: healthScore,
      endpoint: '/api/webhooks/farcaster',
      configuration: config,
      statistics: {
        total_deliveries: parseInt(stats?.total_deliveries) || 0,
        events_processed: parseInt(stats?.events_processed) || 0,
        last_delivery: stats?.last_delivery || null,
        deliveries_today: todayDeliveries
      },
      recent_events: farcasterEvents.slice(0, 5).map(event => ({
        id: event.id,
        type: event.type,
        from: event.from?.handle || 'unknown',
        timestamp: event.timestamp,
        signal_score: event.signal_score
      })),
      setup_instructions: {
        webhook_url: `https://${req.headers.host}/api/webhooks/farcaster`,
        required_env: [
          'FARCASTER_PRIVATE_KEY - Your Farcaster account private key',
          'FARCASTER_FID - Your Farcaster ID (numeric)',
          'FARCASTER_WEBHOOK_SECRET - Secret for signature verification',
          'KV_REST_API_URL & KV_REST_API_TOKEN - Storage'
        ],
        farcaster_setup: [
          '1. Get your Farcaster private key from your wallet',
          '2. Find your FID on Warpcast or via API',
          '3. Set up webhook subscription with Farcaster Hub',
          '4. Configure webhook URL and secret',
          '5. Test with some casts mentioning your account'
        ],
        supported_events: [
          'Cast mentions (when someone @mentions you)',
          'Cast replies (replies to your casts)',
          'Reactions (likes and recasts on your casts)',
          'Follows (when someone follows you)',
          'General /vibe references in casts'
        ]
      }
    };

    // Add alerts if needed
    const alerts = [];
    if (!config.private_key) {
      alerts.push('⚠️ FARCASTER_PRIVATE_KEY not configured - cannot authenticate with Farcaster');
    }
    if (!config.fid) {
      alerts.push('⚠️ FARCASTER_FID not configured - cannot identify your account');
    }
    if (!config.webhook_secret) {
      alerts.push('⚠️ FARCASTER_WEBHOOK_SECRET not set - signature verification disabled');
    }
    if (!config.kv_storage) {
      alerts.push('⚠️ KV storage not available - events will not be persisted');
    }
    if (stats?.total_deliveries === 0) {
      alerts.push('ℹ️ No webhook deliveries received yet - verify hub subscription');
    }

    health.alerts = alerts;

    return res.status(200).json(health);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message,
      endpoint: '/api/webhooks/farcaster'
    });
  }
}