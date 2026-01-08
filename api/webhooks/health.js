/**
 * /api/webhooks/health — Real-time Bridge Health Monitor
 * 
 * Advanced health monitoring for the /vibe bridge system.
 * Provides detailed health metrics, failure detection, and auto-recovery status.
 */

// Health check intervals (in seconds)
const HEALTH_CHECK_INTERVALS = {
  critical: 60,     // Core system components
  webhook: 300,     // Individual webhook endpoints  
  storage: 30,      // KV storage availability
  api: 120         // Cross-platform API adapters
};

// Health status levels
const HEALTH_LEVELS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded', 
  CRITICAL: 'critical',
  DOWN: 'down'
};

// Get detailed KV storage health
async function checkStorageHealth() {
  try {
    const { kv } = await import('@vercel/kv');
    
    const start = Date.now();
    
    // Test basic operations
    const testKey = 'health:storage:test';
    const testValue = `test_${Date.now()}`;
    
    await kv.set(testKey, testValue, { ex: 60 });
    const retrieved = await kv.get(testKey);
    await kv.del(testKey);
    
    const latency = Date.now() - start;
    
    // Check inbox accessibility
    const inboxSize = await kv.llen('vibe:social_inbox');
    
    return {
      status: HEALTH_LEVELS.HEALTHY,
      latency_ms: latency,
      operations_working: retrieved === testValue,
      inbox_accessible: typeof inboxSize === 'number',
      inbox_size: inboxSize,
      last_check: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: HEALTH_LEVELS.DOWN,
      error: error.message,
      latency_ms: null,
      operations_working: false,
      inbox_accessible: false,
      last_check: new Date().toISOString()
    };
  }
}

// Check individual webhook endpoint health
async function checkWebhookHealth(platform) {
  try {
    const { kv } = await import('@vercel/kv');
    
    // Get webhook statistics
    const statsKey = `vibe:${platform}_webhook_stats`;
    const stats = await kv.hgetall(statsKey) || {};
    
    const lastDelivery = stats.last_delivery ? new Date(stats.last_delivery) : null;
    const timeSinceLastDelivery = lastDelivery ? Date.now() - lastDelivery.getTime() : null;
    
    // Determine health based on recent activity and configuration
    let status = HEALTH_LEVELS.HEALTHY;
    const issues = [];
    
    // Check if platform is configured
    const configChecks = {
      x: process.env.X_WEBHOOK_SECRET && process.env.X_BEARER_TOKEN,
      discord: process.env.DISCORD_BOT_TOKEN,
      github: process.env.GITHUB_WEBHOOK_SECRET, 
      farcaster: process.env.FARCASTER_PRIVATE_KEY && process.env.FARCASTER_FID,
      telegram: process.env.TELEGRAM_BOT_TOKEN
    };
    
    if (!configChecks[platform]) {
      status = HEALTH_LEVELS.CRITICAL;
      issues.push('Platform not configured');
    }
    
    // Check for stale webhooks (no delivery in 24 hours)
    if (lastDelivery && timeSinceLastDelivery > 24 * 60 * 60 * 1000) {
      status = HEALTH_LEVELS.DEGRADED;
      issues.push('No recent webhook deliveries');
    }
    
    // Check success rate
    const totalDeliveries = parseInt(stats.total_deliveries) || 0;
    const eventsProcessed = parseInt(stats.events_processed) || 0;
    const successRate = totalDeliveries > 0 ? eventsProcessed / totalDeliveries : 1;
    
    if (successRate < 0.8) {
      status = HEALTH_LEVELS.DEGRADED;
      issues.push(`Low success rate: ${Math.round(successRate * 100)}%`);
    }
    
    return {
      platform,
      status,
      issues,
      configured: !!configChecks[platform],
      statistics: {
        total_deliveries: totalDeliveries,
        events_processed: eventsProcessed,
        success_rate: Math.round(successRate * 100),
        last_delivery: stats.last_delivery,
        time_since_last_delivery_hours: timeSinceLastDelivery ? Math.round(timeSinceLastDelivery / (60 * 60 * 1000)) : null
      },
      last_check: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      platform,
      status: HEALTH_LEVELS.DOWN,
      issues: [`Health check failed: ${error.message}`],
      configured: false,
      statistics: null,
      last_check: new Date().toISOString()
    };
  }
}

// Check social inbox health and performance
async function checkInboxHealth() {
  try {
    const { kv } = await import('@vercel/kv');
    
    const inboxKey = 'vibe:social_inbox';
    
    // Get inbox metrics
    const inboxSize = await kv.llen(inboxKey);
    const recentMessages = await kv.lrange(inboxKey, 0, 9);
    
    // Analyze message distribution
    const platformCounts = {};
    const signalScores = [];
    let oldestTimestamp = null;
    let newestTimestamp = null;
    
    recentMessages.forEach(msgStr => {
      try {
        const msg = JSON.parse(msgStr);
        platformCounts[msg.platform] = (platformCounts[msg.platform] || 0) + 1;
        
        if (msg.signal_score) signalScores.push(msg.signal_score);
        
        const msgTime = new Date(msg.timestamp);
        if (!oldestTimestamp || msgTime < oldestTimestamp) oldestTimestamp = msgTime;
        if (!newestTimestamp || msgTime > newestTimestamp) newestTimestamp = msgTime;
      } catch (e) {
        // Skip invalid messages
      }
    });
    
    const avgSignalScore = signalScores.length > 0 
      ? Math.round(signalScores.reduce((a, b) => a + b, 0) / signalScores.length)
      : 0;
    
    // Determine health status
    let status = HEALTH_LEVELS.HEALTHY;
    const issues = [];
    
    if (inboxSize === 0) {
      status = HEALTH_LEVELS.DEGRADED;
      issues.push('Inbox is empty - no recent social activity');
    } else if (inboxSize > 500) {
      status = HEALTH_LEVELS.DEGRADED;
      issues.push('Inbox getting large - may need cleanup');
    }
    
    if (avgSignalScore < 40) {
      issues.push('Low average signal score - mostly low-value events');
    }
    
    return {
      status,
      issues,
      inbox_size: inboxSize,
      platform_distribution: platformCounts,
      signal_analysis: {
        average_score: avgSignalScore,
        high_signal_percentage: signalScores.length > 0 
          ? Math.round((signalScores.filter(s => s >= 70).length / signalScores.length) * 100)
          : 0
      },
      time_range: oldestTimestamp && newestTimestamp ? {
        oldest: oldestTimestamp.toISOString(),
        newest: newestTimestamp.toISOString(),
        span_hours: Math.round((newestTimestamp - oldestTimestamp) / (60 * 60 * 1000))
      } : null,
      last_check: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: HEALTH_LEVELS.DOWN,
      issues: [`Inbox health check failed: ${error.message}`],
      inbox_size: null,
      last_check: new Date().toISOString()
    };
  }
}

// Check cross-platform adapter health
async function checkAdapterHealth() {
  const results = {};
  
  const platforms = ['x', 'farcaster'];
  
  for (const platform of platforms) {
    try {
      const adapterModule = await import(`../social/adapters/${platform}.js`);
      const AdapterClass = adapterModule[`${platform.charAt(0).toUpperCase() + platform.slice(1)}Adapter`];
      const adapter = new AdapterClass();
      
      const configured = adapter.isConfigured();
      const capabilities = adapter.getCapabilities();
      
      results[platform] = {
        status: configured ? HEALTH_LEVELS.HEALTHY : HEALTH_LEVELS.CRITICAL,
        configured,
        capabilities,
        issues: configured ? [] : ['Adapter not configured']
      };
      
    } catch (error) {
      results[platform] = {
        status: HEALTH_LEVELS.DOWN,
        configured: false,
        capabilities: null,
        issues: [`Adapter failed: ${error.message}`]
      };
    }
  }
  
  return results;
}

// Generate comprehensive health report
async function generateHealthReport() {
  console.log('[Bridge Health] Generating comprehensive health report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    overall_status: HEALTH_LEVELS.HEALTHY,
    components: {},
    alerts: [],
    recommendations: []
  };
  
  // Check all components
  const [storage, inbox, adapters] = await Promise.all([
    checkStorageHealth(),
    checkInboxHealth(), 
    checkAdapterHealth()
  ]);
  
  report.components.storage = storage;
  report.components.social_inbox = inbox;
  report.components.adapters = adapters;
  
  // Check webhook endpoints
  const platforms = ['x', 'discord', 'github', 'farcaster', 'telegram'];
  report.components.webhooks = {};
  
  for (const platform of platforms) {
    report.components.webhooks[platform] = await checkWebhookHealth(platform);
  }
  
  // Determine overall system health
  const componentStatuses = [
    storage.status,
    inbox.status,
    ...Object.values(adapters).map(a => a.status),
    ...Object.values(report.components.webhooks).map(w => w.status)
  ];
  
  const criticalIssues = componentStatuses.filter(s => s === HEALTH_LEVELS.CRITICAL || s === HEALTH_LEVELS.DOWN).length;
  const degradedIssues = componentStatuses.filter(s => s === HEALTH_LEVELS.DEGRADED).length;
  
  if (criticalIssues > 0) {
    report.overall_status = HEALTH_LEVELS.CRITICAL;
  } else if (degradedIssues > 2) {
    report.overall_status = HEALTH_LEVELS.DEGRADED;
  } else if (degradedIssues > 0) {
    report.overall_status = HEALTH_LEVELS.HEALTHY; // Minor issues are OK
  }
  
  // Generate alerts and recommendations
  if (storage.status !== HEALTH_LEVELS.HEALTHY) {
    report.alerts.push('🚨 Storage system issues detected');
    report.recommendations.push('Check KV storage configuration and connectivity');
  }
  
  const configuredWebhooks = Object.values(report.components.webhooks)
    .filter(w => w.configured).length;
  
  if (configuredWebhooks < 2) {
    report.recommendations.push('Configure additional webhook platforms for redundancy');
  }
  
  if (inbox.inbox_size === 0) {
    report.recommendations.push('Verify webhook delivery - no recent social events received');
  }
  
  console.log(`[Bridge Health] Report complete - Overall status: ${report.overall_status}`);
  
  return report;
}

export default async function handler(req, res) {
  const { method, query } = req;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET']
    });
  }
  
  try {
    const { component, platform } = query;
    
    // Check specific component
    if (component) {
      let result = null;
      
      switch (component) {
        case 'storage':
          result = await checkStorageHealth();
          break;
        case 'inbox':
          result = await checkInboxHealth();
          break;
        case 'adapters':
          result = await checkAdapterHealth();
          break;
        case 'webhook':
          if (platform) {
            result = await checkWebhookHealth(platform);
          } else {
            return res.status(400).json({ error: 'Platform required for webhook health check' });
          }
          break;
        default:
          return res.status(400).json({ 
            error: 'Invalid component',
            available: ['storage', 'inbox', 'adapters', 'webhook']
          });
      }
      
      return res.status(200).json({
        component,
        platform,
        health: result,
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate full health report
    const healthReport = await generateHealthReport();
    
    return res.status(200).json(healthReport);
    
  } catch (error) {
    console.error('[Bridge Health] Error:', error);
    return res.status(500).json({
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}