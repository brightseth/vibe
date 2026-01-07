/**
 * /vibe Webhook Health Monitor
 * 
 * Monitors webhook endpoint health and provides diagnostics for bridge connectivity.
 * Ensures external platforms can reach /vibe webhook endpoints reliably.
 */

const https = require('https');
const { getConfig } = require('./webhook-server');

/**
 * Test webhook endpoint connectivity
 */
async function testWebhookEndpoint(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const options = {
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'vibe-webhook-health-check'
      }
    };

    const req = https.request(url, options, (res) => {
      const responseTime = Date.now() - startTime;
      let body = '';

      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          responseTime,
          headers: res.headers,
          body: body.slice(0, 500) // First 500 chars
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        responseTime: Date.now() - startTime
      });
    });

    req.end();
  });
}

/**
 * Test webhook endpoint with mock payload
 */
async function testWebhookPost(url, platform, mockPayload) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const payloadStr = JSON.stringify(mockPayload);
    
    const options = {
      method: 'POST',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadStr),
        'User-Agent': `vibe-webhook-test-${platform}`
      }
    };

    // Add platform-specific headers
    if (platform === 'telegram') {
      options.headers['x-telegram-bot-api-secret-token'] = 'test-token';
    } else if (platform === 'discord') {
      options.headers['x-signature-ed25519'] = 'test-signature';
      options.headers['x-signature-timestamp'] = Math.floor(Date.now() / 1000).toString();
    }

    const req = https.request(url, options, (res) => {
      const responseTime = Date.now() - startTime;
      let body = '';

      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          responseTime,
          body: body.slice(0, 1000)
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        responseTime: Date.now() - startTime
      });
    });

    req.write(payloadStr);
    req.end();
  });
}

/**
 * Generate mock payloads for testing
 */
function getMockPayloads() {
  return {
    telegram: {
      update_id: 123456789,
      message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        text: '/test webhook connectivity',
        from: {
          id: 987654321,
          is_bot: false,
          first_name: 'Test',
          username: 'testuser'
        },
        chat: {
          id: 987654321,
          type: 'private',
          first_name: 'Test',
          username: 'testuser'
        }
      }
    },
    
    discord: {
      type: 1, // PING
      timestamp: new Date().toISOString(),
      id: '123456789012345678',
      token: 'test_interaction_token'
    }
  };
}

/**
 * Comprehensive webhook health check
 */
async function performWebhookHealthCheck(baseUrl) {
  const results = {
    timestamp: new Date().toISOString(),
    baseUrl,
    endpoints: {},
    overall: { healthy: true, issues: [] }
  };

  // Test health endpoint
  const healthUrl = `${baseUrl}/health`;
  console.log(`Testing health endpoint: ${healthUrl}`);
  
  const healthResult = await testWebhookEndpoint(healthUrl);
  results.endpoints.health = {
    url: healthUrl,
    ...healthResult
  };
  
  if (!healthResult.success) {
    results.overall.healthy = false;
    results.overall.issues.push('Health endpoint unreachable');
  }

  // Test Telegram webhook endpoint
  const telegramUrl = `${baseUrl}/webhook/telegram`;
  console.log(`Testing Telegram webhook: ${telegramUrl}`);
  
  const mockPayloads = getMockPayloads();
  const telegramResult = await testWebhookPost(telegramUrl, 'telegram', mockPayloads.telegram);
  results.endpoints.telegram = {
    url: telegramUrl,
    ...telegramResult
  };

  if (!telegramResult.success && telegramResult.status !== 401) {
    // 401 is expected for test payload, other errors are concerning
    results.overall.healthy = false;
    results.overall.issues.push(`Telegram webhook issue: ${telegramResult.error || 'HTTP ' + telegramResult.status}`);
  }

  // Test Discord webhook endpoint  
  const discordUrl = `${baseUrl}/webhook/discord`;
  console.log(`Testing Discord webhook: ${discordUrl}`);
  
  const discordResult = await testWebhookPost(discordUrl, 'discord', mockPayloads.discord);
  results.endpoints.discord = {
    url: discordUrl,
    ...discordResult
  };

  if (!discordResult.success && discordResult.status !== 401) {
    results.overall.healthy = false;
    results.overall.issues.push(`Discord webhook issue: ${discordResult.error || 'HTTP ' + discordResult.status}`);
  }

  return results;
}

/**
 * Get webhook endpoint status for external platforms
 */
async function getWebhookStatus(publicUrl) {
  if (!publicUrl) {
    return {
      configured: false,
      error: 'No public webhook URL configured',
      setup: 'Set WEBHOOK_PUBLIC_URL environment variable'
    };
  }

  try {
    const healthCheck = await performWebhookHealthCheck(publicUrl);
    
    return {
      configured: true,
      healthy: healthCheck.overall.healthy,
      lastCheck: healthCheck.timestamp,
      endpoints: {
        health: healthCheck.endpoints.health?.success || false,
        telegram: healthCheck.endpoints.telegram?.success || healthCheck.endpoints.telegram?.status === 401,
        discord: healthCheck.endpoints.discord?.success || healthCheck.endpoints.discord?.status === 401
      },
      issues: healthCheck.overall.issues,
      publicUrl
    };

  } catch (e) {
    return {
      configured: true,
      healthy: false,
      error: e.message,
      publicUrl
    };
  }
}

/**
 * Generate webhook setup diagnostics
 */
function getWebhookDiagnostics() {
  const config = getConfig();
  
  const diagnostics = {
    server: {
      port: config.port,
      configured: true
    },
    security: {
      webhookSecret: !!config.secret,
      telegramSecret: !!config.telegramSecret,
      discordPublicKey: !!config.discordPublicKey
    },
    channels: {
      telegram: {
        botConfigured: !!config.telegramSecret,
        chatId: !!config.telegramChatId
      },
      discord: {
        publicKeyConfigured: !!config.discordPublicKey,
        channelId: !!config.vibeChannelId
      }
    },
    recommendations: []
  };

  // Add recommendations based on configuration gaps
  if (!config.secret) {
    diagnostics.recommendations.push('Set WEBHOOK_SECRET for signature verification');
  }
  
  if (!config.telegramSecret) {
    diagnostics.recommendations.push('Set TELEGRAM_WEBHOOK_SECRET for Telegram webhook security');
  }
  
  if (!config.discordPublicKey) {
    diagnostics.recommendations.push('Set DISCORD_PUBLIC_KEY for Discord interaction verification');
  }

  if (!config.telegramChatId) {
    diagnostics.recommendations.push('Set TELEGRAM_VIBE_CHAT_ID to forward messages to /vibe');
  }

  if (!config.vibeChannelId) {
    diagnostics.recommendations.push('Set DISCORD_VIBE_CHANNEL_ID to forward messages to /vibe');
  }

  return diagnostics;
}

/**
 * Monitor webhook endpoint availability over time
 */
class WebhookMonitor {
  constructor(publicUrl, checkIntervalMs = 300000) { // 5 minutes
    this.publicUrl = publicUrl;
    this.checkIntervalMs = checkIntervalMs;
    this.isRunning = false;
    this.intervalId = null;
    this.history = [];
    this.maxHistorySize = 144; // 24 hours at 5-minute intervals
  }

  async start() {
    if (this.isRunning) return;
    
    console.log(`🔍 Starting webhook endpoint monitoring (${this.publicUrl})`);
    this.isRunning = true;
    
    // Initial check
    await this.performCheck();
    
    // Schedule regular checks
    this.intervalId = setInterval(() => {
      this.performCheck().catch(err => {
        console.error('Webhook monitor error:', err);
      });
    }, this.checkIntervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    
    console.log('🛑 Stopping webhook endpoint monitoring');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async performCheck() {
    const checkResult = await getWebhookStatus(this.publicUrl);
    
    const historyEntry = {
      timestamp: new Date().toISOString(),
      healthy: checkResult.healthy,
      responseTime: checkResult.endpoints?.health ? 
        (checkResult.endpoints.health.responseTime || 0) : 0,
      issues: checkResult.issues || []
    };

    // Add to history
    this.history.unshift(historyEntry);
    
    // Trim history to max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    // Log significant state changes
    if (this.history.length > 1) {
      const prevCheck = this.history[1];
      if (checkResult.healthy !== prevCheck.healthy) {
        const status = checkResult.healthy ? '✅ RECOVERED' : '❌ DEGRADED';
        console.log(`Webhook health changed: ${status} - ${this.publicUrl}`);
      }
    }

    return checkResult;
  }

  getHealthStats() {
    if (this.history.length === 0) return null;

    const totalChecks = this.history.length;
    const healthyChecks = this.history.filter(h => h.healthy).length;
    const uptime = (healthyChecks / totalChecks) * 100;

    const responseTimes = this.history
      .filter(h => h.responseTime > 0)
      .map(h => h.responseTime);
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      uptime: `${uptime.toFixed(1)}%`,
      totalChecks,
      healthyChecks,
      avgResponseTime: Math.round(avgResponseTime),
      lastCheck: this.history[0]?.timestamp,
      isCurrentlyHealthy: this.history[0]?.healthy || false
    };
  }
}

module.exports = {
  testWebhookEndpoint,
  testWebhookPost,
  performWebhookHealthCheck,
  getWebhookStatus,
  getWebhookDiagnostics,
  getMockPayloads,
  WebhookMonitor
};