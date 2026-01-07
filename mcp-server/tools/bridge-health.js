/**
 * vibe bridge-health — Monitor and diagnose bridge connections
 *
 * Real-time health monitoring for all social bridges.
 * Checks connectivity, rate limits, and provides recovery suggestions.
 */

const twitter = require('../twitter');
const telegram = require('../bridges/telegram');
const discord = require('../discord');
const discordBot = require('../bridges/discord-bot');
const farcaster = require('../bridges/farcaster');
const { requireInit, header, divider, success, warning, error } = require('./_shared');

const definition = {
  name: 'vibe_bridge_health',
  description: 'Monitor health and connectivity of all social bridges',
  inputSchema: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        enum: ['all', 'x', 'twitter', 'telegram', 'discord', 'farcaster'],
        description: 'Check specific platform or all (default: all)'
      },
      fix: {
        type: 'boolean',
        description: 'Attempt to fix detected issues (default: false)'
      },
      details: {
        type: 'boolean',
        description: 'Show detailed diagnostics (default: false)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { platform = 'all', fix = false, details = false } = args;

  try {
    const results = await runHealthChecks(platform);
    return formatHealthReport(results, fix, details);
  } catch (e) {
    return {
      display: `${header('Bridge Health Check')}\n\n${error('Health check failed: ' + e.message)}`
    };
  }
}

async function runHealthChecks(platform) {
  const checks = {};

  if (platform === 'all' || platform === 'x' || platform === 'twitter') {
    checks.x = await checkXHealth();
  }

  if (platform === 'all' || platform === 'telegram') {
    checks.telegram = await checkTelegramHealth();
  }

  if (platform === 'all' || platform === 'discord') {
    checks.discord = await checkDiscordHealth();
  }

  if (platform === 'all' || platform === 'farcaster') {
    checks.farcaster = await checkFarcasterHealth();
  }

  return checks;
}

async function checkXHealth() {
  const health = {
    platform: 'x',
    configured: twitter.isConfigured(),
    connected: false,
    canRead: false,
    canWrite: false,
    rateLimits: {},
    issues: [],
    suggestions: [],
    lastCheck: new Date().toISOString()
  };

  if (!health.configured) {
    health.issues.push('API credentials not configured');
    health.suggestions.push('Add X API credentials to config.json');
    health.suggestions.push('Requires paid X API access for posting');
    return health;
  }

  try {
    // Test authentication
    const me = await twitter.getMe();
    health.connected = true;
    health.username = me.data.username;
    health.userId = me.data.id;
    health.canRead = true;

    // Test read capability
    try {
      await twitter.getMentions();
      health.canRead = true;
    } catch (e) {
      health.issues.push(`Read test failed: ${e.message}`);
      if (e.message.includes('rate limit')) {
        health.rateLimits.mentions = 'exceeded';
      }
    }

    // Note: We don't test write capability to avoid spam
    health.canWrite = true; // Assume true if connected

  } catch (e) {
    health.issues.push(`Connection failed: ${e.message}`);
    
    if (e.message.includes('rate limit')) {
      health.suggestions.push('Wait for rate limit to reset (15 minutes)');
    } else if (e.message.includes('unauthorized')) {
      health.suggestions.push('Check API credentials and permissions');
    } else {
      health.suggestions.push('Verify API credentials and X API access level');
    }
  }

  return health;
}

async function checkTelegramHealth() {
  const health = {
    platform: 'telegram',
    configured: telegram.isConfigured(),
    connected: false,
    canRead: true, // Telegram bot always can read if configured
    canWrite: false,
    webhookConfigured: false,
    issues: [],
    suggestions: [],
    lastCheck: new Date().toISOString()
  };

  if (!health.configured) {
    health.issues.push('Bot token not configured');
    health.suggestions.push('Run: vibe telegram-bot --action setup');
    return health;
  }

  try {
    const botInfo = await telegram.getBotInfo();
    health.connected = true;
    health.canWrite = true;
    health.username = botInfo.username;
    health.botName = botInfo.first_name;
    health.botId = botInfo.id;
    health.canJoinGroups = botInfo.can_join_groups;

    // Check if webhook is set up (optional for polling mode)
    try {
      // This would require a separate API call to getWebhookInfo
      // For now, we'll assume webhook setup is external
      health.webhookConfigured = false;
      health.suggestions.push('Consider setting up webhook for real-time updates');
    } catch (e) {
      // Non-critical
    }

  } catch (e) {
    health.issues.push(`Bot connection failed: ${e.message}`);
    
    if (e.message.includes('token')) {
      health.suggestions.push('Check bot token in config.json');
    } else {
      health.suggestions.push('Verify bot is active and token is valid');
    }
  }

  return health;
}

async function checkDiscordHealth() {
  const health = {
    platform: 'discord',
    configured: discord.isConfigured() || discordBot.isConfigured(),
    connected: false,
    canRead: false,
    canWrite: false,
    webhookOnly: false,
    botConfigured: discordBot.isConfigured(),
    issues: [],
    suggestions: [],
    lastCheck: new Date().toISOString()
  };

  // Check webhook first (simpler)
  if (discord.isConfigured()) {
    try {
      const testSent = await discord.post('🔍 Health check - ignore this test');
      if (testSent) {
        health.canWrite = true;
        health.webhookOnly = true;
        health.connected = true;
      } else {
        health.issues.push('Webhook test failed');
      }
    } catch (e) {
      health.issues.push(`Webhook error: ${e.message}`);
      health.suggestions.push('Check DISCORD_WEBHOOK_URL in config.json');
    }
  }

  // Check bot (if configured)
  if (discordBot.isConfigured()) {
    try {
      const botInfo = await discordBot.getBotInfo();
      health.connected = true;
      health.canRead = true;
      health.canWrite = true;
      health.botUsername = botInfo.username;
      health.botId = botInfo.id;
      
      if (health.webhookOnly) {
        health.suggestions.push('Both webhook and bot configured - consider using bot only');
      }
    } catch (e) {
      health.issues.push(`Bot connection failed: ${e.message}`);
      health.suggestions.push('Check DISCORD_BOT_TOKEN and bot permissions');
    }
  }

  if (!health.configured) {
    health.issues.push('Neither webhook nor bot configured');
    health.suggestions.push('Add DISCORD_WEBHOOK_URL for one-way posting');
    health.suggestions.push('Or add DISCORD_BOT_TOKEN for full bot features');
  }

  return health;
}

async function checkFarcasterHealth() {
  const health = {
    platform: 'farcaster',
    configured: farcaster.isConfigured(),
    connected: false,
    canRead: false,
    canWrite: false,
    issues: [],
    suggestions: [],
    lastCheck: new Date().toISOString()
  };

  if (!health.configured) {
    health.issues.push('Farcaster credentials not configured');
    health.suggestions.push('Need: NEYNAR_API_KEY, FARCASTER_SIGNER_UUID, FARCASTER_FID');
    health.suggestions.push('Get API key from https://neynar.com');
    health.suggestions.push('Create signer via Neynar developer tools');
    return health;
  }

  try {
    const userInfo = await farcaster.getUser();
    const user = userInfo.users[0];
    
    health.connected = true;
    health.canRead = true;
    health.canWrite = true; // Assume true if we can read user info
    health.username = user.username;
    health.displayName = user.display_name;
    health.fid = user.fid;
    health.followers = user.follower_count;

    // Test read functionality
    try {
      await farcaster.getFeed(null, 5);
      health.canRead = true;
    } catch (e) {
      health.issues.push(`Feed read failed: ${e.message}`);
      health.canRead = false;
    }

  } catch (e) {
    health.issues.push(`Connection failed: ${e.message}`);
    
    if (e.message.includes('API key')) {
      health.suggestions.push('Check NEYNAR_API_KEY in config.json');
    } else if (e.message.includes('signer')) {
      health.suggestions.push('Verify FARCASTER_SIGNER_UUID is valid and active');
    } else if (e.message.includes('FID')) {
      health.suggestions.push('Check FARCASTER_FID matches your account');
    } else {
      health.suggestions.push('Verify all Farcaster credentials in config.json');
    }
  }

  return health;
}

function formatHealthReport(results, fix, details) {
  let display = header('Bridge Health Report');
  display += `\n\n_Checked at ${new Date().toLocaleString()}_\n`;
  display += divider();
  display += '\n';

  const allPlatforms = Object.keys(results);
  const healthyCount = allPlatforms.filter(p => results[p].connected).length;
  const configuredCount = allPlatforms.filter(p => results[p].configured).length;
  
  display += `**Summary:** ${healthyCount}/${allPlatforms.length} connected, ${configuredCount} configured\n\n`;

  // Individual platform reports
  for (const [platformName, health] of Object.entries(results)) {
    display += formatPlatformHealth(health, details);
    display += '\n';
  }

  // Overall recommendations
  display += divider();
  display += '**Quick Actions:**\n';

  const unconfigured = allPlatforms.filter(p => !results[p].configured);
  if (unconfigured.length > 0) {
    display += `• Configure: ${unconfigured.join(', ')}\n`;
  }

  const hasIssues = allPlatforms.filter(p => results[p].issues.length > 0);
  if (hasIssues.length > 0) {
    display += `• Fix issues: ${hasIssues.join(', ')}\n`;
  }

  display += `• Test posting: \`vibe social-post --dry_run --content "test" --channels ["${allPlatforms[0]}"]\`\n`;
  display += `• View unified inbox: \`vibe social-inbox --refresh\``;

  if (fix) {
    display += '\n\n' + divider();
    display += '**Auto-fix Results:**\n';
    display += '_Auto-fix not yet implemented. Check suggestions above._';
  }

  return { display };
}

function formatPlatformHealth(health, showDetails) {
  const statusIcon = health.connected ? '✅' : (health.configured ? '⚠️' : '❌');
  const platformName = health.platform.toUpperCase();
  
  let result = `${statusIcon} **${platformName}**`;
  
  if (health.username) {
    result += ` (@${health.username})`;
  }
  
  result += '\n';

  // Capabilities
  const caps = [];
  if (health.canRead) caps.push('read');
  if (health.canWrite) caps.push('write');
  if (health.webhookOnly) caps.push('webhook-only');
  if (health.botConfigured) caps.push('bot');
  if (caps.length > 0) {
    result += `   ${caps.join(' • ')}\n`;
  }

  // Issues
  if (health.issues.length > 0) {
    for (const issue of health.issues) {
      result += `   ⚠️ ${issue}\n`;
    }
  }

  // Show details if requested
  if (showDetails) {
    if (health.rateLimits && Object.keys(health.rateLimits).length > 0) {
      result += `   Rate limits: ${JSON.stringify(health.rateLimits)}\n`;
    }
    
    if (health.followers !== undefined) {
      result += `   Followers: ${health.followers}\n`;
    }
    
    if (health.lastCheck) {
      result += `   Last checked: ${new Date(health.lastCheck).toLocaleTimeString()}\n`;
    }
  }

  // Suggestions (first 2 to keep concise)
  const suggestions = health.suggestions.slice(0, 2);
  if (suggestions.length > 0) {
    for (const suggestion of suggestions) {
      result += `   💡 ${suggestion}\n`;
    }
  }

  return result;
}

module.exports = { definition, handler };