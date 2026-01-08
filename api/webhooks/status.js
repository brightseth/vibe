/**
 * /api/webhooks/status — Bridge System Status Dashboard
 * 
 * Provides real-time status of all bridge integrations.
 * Shows configuration, health, statistics, and recent activity.
 */

// Get configuration status for each platform
function getConfigurationStatus() {
  return {
    x: {
      configured: !!(process.env.X_WEBHOOK_SECRET && process.env.X_BEARER_TOKEN),
      required_env: ['X_WEBHOOK_SECRET', 'X_BEARER_TOKEN', 'X_API_KEY', 'X_API_SECRET'],
      missing: ['X_WEBHOOK_SECRET', 'X_BEARER_TOKEN', 'X_API_KEY', 'X_API_SECRET']
        .filter(key => !process.env[key])
    },
    discord: {
      configured: !!(process.env.DISCORD_BOT_TOKEN),
      required_env: ['DISCORD_BOT_TOKEN', 'DISCORD_WEBHOOK_SECRET', 'DISCORD_PUBLIC_KEY'],
      missing: ['DISCORD_BOT_TOKEN', 'DISCORD_WEBHOOK_SECRET', 'DISCORD_PUBLIC_KEY']
        .filter(key => !process.env[key])
    },
    github: {
      configured: !!(process.env.GITHUB_WEBHOOK_SECRET),
      required_env: ['GITHUB_WEBHOOK_SECRET'],
      missing: ['GITHUB_WEBHOOK_SECRET'].filter(key => !process.env[key])
    },
    farcaster: {
      configured: !!(process.env.FARCASTER_PRIVATE_KEY && process.env.FARCASTER_FID),
      required_env: ['FARCASTER_PRIVATE_KEY', 'FARCASTER_FID', 'FARCASTER_WEBHOOK_SECRET'],
      missing: ['FARCASTER_PRIVATE_KEY', 'FARCASTER_FID', 'FARCASTER_WEBHOOK_SECRET']
        .filter(key => !process.env[key])
    },
    telegram: {
      configured: !!(process.env.TELEGRAM_BOT_TOKEN),
      required_env: ['TELEGRAM_BOT_TOKEN'],
      missing: ['TELEGRAM_BOT_TOKEN'].filter(key => !process.env[key])
    },
    storage: {
      configured: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
      required_env: ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
      missing: ['KV_REST_API_URL', 'KV_REST_API_TOKEN'].filter(key => !process.env[key])
    }
  };
}

// Get webhook URLs for platform setup
function getWebhookUrls(host) {
  const baseUrl = `https://${host || 'vibe.fyi'}`;
  
  return {
    x: `${baseUrl}/api/webhooks/x`,
    discord: `${baseUrl}/api/webhooks/discord`,
    github: `${baseUrl}/api/webhooks/github`,
    farcaster: `${baseUrl}/api/webhooks/farcaster`,
    telegram: `${baseUrl}/api/telegram/webhook`
  };
}

// Get bridge statistics from KV
async function getBridgeStatistics() {
  try {
    const { kv } = await import('@vercel/kv');
    
    const platforms = ['x', 'discord', 'github', 'farcaster', 'telegram'];
    const stats = {};
    const today = new Date().toISOString().split('T')[0];
    
    for (const platform of platforms) {
      const key = `vibe:${platform}_webhook_stats`;
      const platformStats = await kv.hgetall(key) || {};
      
      stats[platform] = {
        total_deliveries: parseInt(platformStats.total_deliveries) || 0,
        events_processed: parseInt(platformStats.events_processed) || 0,
        last_delivery: platformStats.last_delivery || null,
        today_deliveries: parseInt(platformStats[`deliveries_${today}`]) || 0,
        success_rate: platformStats.total_deliveries > 0 
          ? Math.round((platformStats.events_processed / platformStats.total_deliveries) * 100)
          : 0
      };
    }
    
    // Get social inbox stats
    const inboxKey = 'vibe:social_inbox';
    const inboxSize = await kv.llen(inboxKey) || 0;
    const recentMessages = await kv.lrange(inboxKey, 0, 4);
    
    stats.social_inbox = {
      total_messages: inboxSize,
      recent_platforms: recentMessages.map(msg => {
        try {
          return JSON.parse(msg).platform;
        } catch (e) {
          return 'unknown';
        }
      }).filter((p, i, arr) => arr.indexOf(p) === i) // unique
    };
    
    return stats;
    
  } catch (e) {
    return { 
      error: e.message,
      kv_available: false
    };
  }
}

// Get recent activity from social inbox
async function getRecentActivity(limit = 10) {
  try {
    const { kv } = await import('@vercel/kv');
    
    const messages = await kv.lrange('vibe:social_inbox', 0, limit - 1);
    
    return messages.map(msg => {
      try {
        const parsed = JSON.parse(msg);
        return {
          platform: parsed.platform,
          type: parsed.type,
          from: parsed.from?.handle || 'unknown',
          timestamp: parsed.timestamp,
          signal_score: parsed.signal_score || 0,
          preview: parsed.content?.slice(0, 50) + (parsed.content?.length > 50 ? '...' : '')
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    
  } catch (e) {
    return [];
  }
}

// Health check for individual components
async function performHealthChecks() {
  const health = {
    storage: false,
    webhook_endpoints: {},
    social_inbox: false
  };
  
  // Check KV storage
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set('health:check', Date.now(), { ex: 10 });
    health.storage = true;
  } catch (e) {
    health.storage = false;
  }
  
  // Check social inbox
  try {
    const { kv } = await import('@vercel/kv');
    const size = await kv.llen('vibe:social_inbox');
    health.social_inbox = typeof size === 'number';
  } catch (e) {
    health.social_inbox = false;
  }
  
  return health;
}

export default async function handler(req, res) {
  const { method, query, headers } = req;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only support GET
  if (method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET']
    });
  }
  
  try {
    const host = headers.host;
    
    // Check what type of status report is requested
    const { format, platform } = query;
    
    // Platform-specific status
    if (platform) {
      const config = getConfigurationStatus();
      const webhookUrls = getWebhookUrls(host);
      
      if (!config[platform]) {
        return res.status(404).json({
          error: 'Platform not found',
          available: Object.keys(config).filter(k => k !== 'storage')
        });
      }
      
      return res.status(200).json({
        platform,
        configured: config[platform].configured,
        webhook_url: webhookUrls[platform],
        missing_env: config[platform].missing,
        setup_guide: `https://slashvibe.dev/docs/bridges/${platform}`
      });
    }
    
    console.log('[Bridge Status] Generating comprehensive status report...');
    
    // Get all status information
    const [configuration, statistics, recentActivity, healthChecks] = await Promise.all([
      getConfigurationStatus(),
      getBridgeStatistics(),
      getRecentActivity(20),
      performHealthChecks()
    ]);
    
    // Calculate overall system health
    const configuredPlatforms = Object.entries(configuration)
      .filter(([key, config]) => key !== 'storage' && config.configured)
      .length;
    
    const totalPlatforms = Object.keys(configuration).length - 1; // excluding storage
    const storageOk = configuration.storage.configured && healthChecks.storage;
    const inboxOk = healthChecks.social_inbox;
    
    let overallStatus = 'healthy';
    if (!storageOk || !inboxOk) {
      overallStatus = 'degraded';
    } else if (configuredPlatforms < 2) {
      overallStatus = 'minimal';
    }
    
    // Format response based on requested format
    if (format === 'simple') {
      return res.status(200).json({
        status: overallStatus,
        platforms_configured: configuredPlatforms,
        total_platforms: totalPlatforms,
        storage_ok: storageOk,
        recent_events: recentActivity.length,
        webhook_base_url: `https://${host}/api/webhooks/`
      });
    }
    
    const statusReport = {
      timestamp: new Date().toISOString(),
      overall_status: overallStatus,
      system_health: {
        storage: storageOk,
        social_inbox: inboxOk,
        platforms_configured: configuredPlatforms,
        total_platforms: totalPlatforms
      },
      configuration,
      webhook_urls: getWebhookUrls(host),
      statistics,
      recent_activity: recentActivity,
      health_checks: healthChecks,
      setup_instructions: {
        next_steps: configuration.storage.configured 
          ? 'Configure platform credentials and set up webhooks'
          : 'Configure KV storage first: KV_REST_API_URL and KV_REST_API_TOKEN',
        documentation: 'https://slashvibe.dev/docs/bridges',
        test_endpoint: `https://${host}/api/webhooks/test`
      }
    };
    
    // Add recommendations
    const recommendations = [];
    
    if (!configuration.storage.configured) {
      recommendations.push('🚨 Configure KV storage to enable bridge system');
    }
    
    if (configuredPlatforms === 0) {
      recommendations.push('📦 Configure at least one platform (X, Discord, or Telegram recommended)');
    }
    
    if (configuration.x.configured && !statistics.x?.total_deliveries) {
      recommendations.push('🐦 X configured but no webhooks received - check webhook setup');
    }
    
    if (configuredPlatforms < 3) {
      recommendations.push('🌉 Configure additional platforms for better reach');
    }
    
    statusReport.recommendations = recommendations;
    
    console.log(`[Bridge Status] Generated report - Status: ${overallStatus}, Platforms: ${configuredPlatforms}/${totalPlatforms}`);
    
    return res.status(200).json(statusReport);
    
  } catch (error) {
    console.error('[Bridge Status] Error:', error);
    return res.status(500).json({
      error: 'Failed to generate status report',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}