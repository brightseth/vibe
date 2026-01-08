/**
 * vibe bridge-dashboard — Real-time bridge monitoring dashboard
 *
 * Live view of all bridge health, recent events, and webhook activity.
 * Auto-refreshes to show real-time status of social connections.
 */

const twitter = require('../twitter');
const telegram = require('../bridges/telegram');
const discord = require('../discord');
const farcaster = require('../bridges/farcaster');
const { requireInit, header, divider, success, warning, error } = require('./_shared');

const definition = {
  name: 'vibe_bridge_dashboard',
  description: 'Real-time monitoring dashboard for all social bridges and webhook activity',
  inputSchema: {
    type: 'object',
    properties: {
      refresh_rate: {
        type: 'number',
        description: 'Auto-refresh interval in seconds (0 = no auto-refresh, default: 30)'
      },
      show_events: {
        type: 'boolean',
        description: 'Show recent webhook events (default: true)'
      },
      compact: {
        type: 'boolean',
        description: 'Compact view with minimal details (default: false)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const {
    refresh_rate = 30,
    show_events = true,
    compact = false
  } = args;

  try {
    // Get comprehensive bridge status
    const bridgeStatuses = await getAllBridgeStatuses();
    const webhookStats = await getWebhookStats();
    const recentEvents = show_events ? await getRecentWebhookEvents(10) : [];

    return formatDashboard(bridgeStatuses, webhookStats, recentEvents, compact, refresh_rate);

  } catch (e) {
    return {
      display: `${header('Bridge Dashboard')}\n\n${error('Dashboard error: ' + e.message)}`
    };
  }
}

async function getAllBridgeStatuses() {
  const statuses = {};

  // X Bridge
  statuses.x = await getBridgeStatus('x', twitter);

  // Telegram Bridge
  statuses.telegram = await getBridgeStatus('telegram', telegram);

  // Discord Bridge
  statuses.discord = await getBridgeStatus('discord', discord);

  // Farcaster Bridge
  statuses.farcaster = await getBridgeStatus('farcaster', farcaster);

  return statuses;
}

async function getBridgeStatus(platform, module) {
  const status = {
    platform,
    configured: module.isConfigured(),
    connected: false,
    username: null,
    lastActivity: null,
    errors: [],
    capabilities: getCapabilities(platform),
    health: 'unknown'
  };

  if (!status.configured) {
    status.health = 'not_configured';
    return status;
  }

  try {
    // Test connection based on platform
    switch (platform) {
      case 'x':
        const me = await twitter.getMe();
        status.connected = true;
        status.username = me.data.username;
        status.health = 'healthy';
        break;

      case 'telegram':
        const botInfo = await telegram.getBotInfo();
        status.connected = true;
        status.username = botInfo.username;
        status.health = 'healthy';
        break;

      case 'discord':
        // Discord webhook doesn't have a test endpoint, assume healthy if configured
        status.connected = true;
        status.health = 'healthy';
        status.username = 'webhook';
        break;

      case 'farcaster':
        const userInfo = await farcaster.getUser();
        status.connected = true;
        status.username = userInfo.users[0].username;
        status.health = 'healthy';
        break;
    }

    // Check for recent activity (would require KV access for webhook events)
    status.lastActivity = await getLastActivity(platform);

  } catch (e) {
    status.health = 'error';
    status.errors.push(e.message);
  }

  return status;
}

async function getWebhookStats() {
  try {
    // Try to get KV store
    const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    if (!KV_CONFIGURED) {
      return {
        x: { total_deliveries: 0, events_processed: 0, last_delivery: null }
      };
    }

    const { kv } = await import('@vercel/kv');
    
    // Get X webhook stats
    const xStats = await kv.hgetall('vibe:x_webhook_stats') || {};

    return {
      x: {
        total_deliveries: parseInt(xStats.total_deliveries) || 0,
        events_processed: parseInt(xStats.events_processed) || 0,
        last_delivery: xStats.last_delivery || null,
        kv_available: true
      }
    };

  } catch (e) {
    return {
      x: { total_deliveries: 0, events_processed: 0, last_delivery: null, error: e.message }
    };
  }
}

async function getRecentWebhookEvents(limit) {
  try {
    const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    if (!KV_CONFIGURED) return [];

    const { kv } = await import('@vercel/kv');
    const inboxKey = 'vibe:social_inbox';
    
    const rawEvents = await kv.lrange(inboxKey, 0, limit - 1);
    
    return rawEvents.map(eventStr => {
      const event = JSON.parse(eventStr);
      return {
        id: event.id,
        platform: event.platform,
        type: event.type,
        from: event.from?.handle || 'unknown',
        timestamp: event.timestamp,
        timeAgo: formatTimeAgo(new Date(event.timestamp))
      };
    });

  } catch (e) {
    return [];
  }
}

async function getLastActivity(platform) {
  // Placeholder - would check KV for last webhook event from this platform
  return null;
}

function getCapabilities(platform) {
  const capabilities = {
    x: ['read', 'write', 'dm', 'webhook'],
    telegram: ['read', 'write', 'groups', 'bot'],
    discord: ['write', 'webhook'],
    farcaster: ['read', 'write', 'channels', 'frames']
  };
  return capabilities[platform] || [];
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatDashboard(bridges, webhookStats, events, compact, refreshRate) {
  let display = header('🔗 Bridge Dashboard');
  display += `\n\n_Live status • ${new Date().toLocaleTimeString()}_\n`;
  
  if (refreshRate > 0) {
    display += `_Auto-refresh: ${refreshRate}s_\n`;
  }
  
  display += divider();
  display += '\n';

  // Overall health summary
  const totalBridges = Object.keys(bridges).length;
  const connectedBridges = Object.values(bridges).filter(b => b.connected).length;
  const healthyBridges = Object.values(bridges).filter(b => b.health === 'healthy').length;
  
  let healthIcon = '✅';
  if (healthyBridges === 0) healthIcon = '❌';
  else if (healthyBridges < connectedBridges) healthIcon = '⚠️';

  display += `${healthIcon} **System Health:** ${healthyBridges}/${totalBridges} bridges healthy\n`;

  // Quick stats
  if (webhookStats.x.total_deliveries > 0) {
    display += `🔔 **Webhooks:** ${webhookStats.x.total_deliveries} deliveries, ${webhookStats.x.events_processed} events processed\n`;
  }

  if (events.length > 0) {
    const recentCount = events.filter(e => new Date() - new Date(e.timestamp) < 60 * 60 * 1000).length;
    display += `📬 **Recent Activity:** ${recentCount} events in last hour\n`;
  }

  display += '\n' + divider();
  display += '**BRIDGE STATUS**\n\n';

  // Individual bridge status
  for (const [platformName, bridge] of Object.entries(bridges)) {
    display += formatBridgeQuickStatus(bridge, compact);
  }

  // Recent webhook events
  if (events.length > 0) {
    display += '\n' + divider();
    display += '**RECENT EVENTS**\n\n';
    
    for (const event of events.slice(0, compact ? 3 : 5)) {
      display += formatEventQuickStatus(event);
    }

    if (events.length > (compact ? 3 : 5)) {
      display += `_...and ${events.length - (compact ? 3 : 5)} more events_\n`;
    }
  }

  // Quick actions
  display += '\n' + divider();
  display += '**QUICK ACTIONS**\n';
  display += '• `vibe social-inbox` - View all messages\n';
  display += '• `vibe bridge-health --details` - Detailed diagnostics\n';
  display += '• `vibe bridges --action test --platform x` - Test specific bridge\n';
  display += '• `vibe bridge-dashboard --compact` - Compact view';

  return { display };
}

function formatBridgeQuickStatus(bridge, compact) {
  const statusIcons = {
    healthy: '🟢',
    error: '🔴',
    not_configured: '⚪',
    unknown: '🟡'
  };

  const icon = statusIcons[bridge.health] || '🟡';
  const platformName = bridge.platform.toUpperCase().padEnd(10);
  
  let line = `${icon} ${platformName}`;
  
  if (bridge.connected && bridge.username) {
    line += ` @${bridge.username}`;
  } else if (bridge.health === 'not_configured') {
    line += ` Not configured`;
  } else if (bridge.errors.length > 0) {
    line += ` ${bridge.errors[0]}`;
  }

  line += '\n';

  if (!compact && bridge.capabilities.length > 0) {
    line += `          ${bridge.capabilities.join(' • ')}\n`;
  }

  return line;
}

function formatEventQuickStatus(event) {
  const platformIcons = {
    x: '𝕏',
    farcaster: '🟣',
    telegram: '✈️',
    discord: '💬'
  };

  const typeIcons = {
    mention: '@',
    dm: '✉️',
    like: '❤️',
    follow: '👤',
    cast: '📡'
  };

  const platformIcon = platformIcons[event.platform] || '📱';
  const typeIcon = typeIcons[event.type] || '';

  return `${platformIcon} ${typeIcon} @${event.from} • ${event.timeAgo}\n`;
}

module.exports = { definition, handler };