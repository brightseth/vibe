/**
 * /vibe Bridge Health Monitor
 *
 * Continuously monitors bridge connections and provides health metrics.
 * Tracks API quotas, error rates, response times, and connection status.
 */

const twitter = require('../twitter');
const telegram = require('./telegram');
const farcaster = require('./farcaster');
const discord = require('../discord');
const config = require('../config');

/**
 * Bridge health status tracker
 */
class BridgeMonitor {
  constructor() {
    this.metrics = {
      x: { calls: 0, errors: 0, lastCheck: null, avgResponseTime: 0, status: 'unknown' },
      telegram: { calls: 0, errors: 0, lastCheck: null, avgResponseTime: 0, status: 'unknown' },
      farcaster: { calls: 0, errors: 0, lastCheck: null, avgResponseTime: 0, status: 'unknown' },
      discord: { calls: 0, errors: 0, lastCheck: null, avgResponseTime: 0, status: 'unknown' }
    };
    this.healthCheckInterval = null;
    this.alertThresholds = {
      errorRate: 0.1, // 10% error rate triggers alert
      responseTime: 5000, // 5 second response time threshold
      consecutiveFailures: 3
    };
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMinutes = 5) {
    console.log(`🔍 Starting bridge health monitoring (every ${intervalMinutes} minutes)`);
    
    // Initial health check
    this.performHealthCheck();
    
    // Schedule regular health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Stopped bridge health monitoring');
    }
  }

  /**
   * Perform comprehensive health check on all bridges
   */
  async performHealthCheck() {
    console.log('🔍 Running bridge health check...');
    const results = {};

    // Test each configured bridge
    const bridges = ['x', 'telegram', 'farcaster', 'discord'];
    
    for (const bridge of bridges) {
      try {
        const startTime = Date.now();
        const isHealthy = await this.checkBridgeHealth(bridge);
        const responseTime = Date.now() - startTime;
        
        this.updateMetrics(bridge, true, responseTime);
        results[bridge] = { 
          healthy: isHealthy, 
          responseTime,
          error: null
        };
        
      } catch (error) {
        this.updateMetrics(bridge, false, 0);
        results[bridge] = { 
          healthy: false, 
          responseTime: 0,
          error: error.message
        };
      }
    }

    // Check for alerts
    this.checkForAlerts(results);
    
    console.log(`✅ Health check complete: ${Object.values(results).filter(r => r.healthy).length}/${bridges.length} bridges healthy`);
    
    return results;
  }

  /**
   * Check health of specific bridge
   */
  async checkBridgeHealth(bridge) {
    switch (bridge) {
      case 'x':
        if (!twitter.isConfigured()) return false;
        const me = await twitter.getMe();
        return !!(me && me.data && me.data.id);

      case 'telegram':
        if (!telegram.isConfigured()) return false;
        const botInfo = await telegram.getBotInfo();
        return !!(botInfo && botInfo.id);

      case 'farcaster':
        if (!farcaster.isConfigured()) return false;
        const user = await farcaster.getUser();
        return !!(user && user.users && user.users.length > 0);

      case 'discord':
        if (!discord.isConfigured()) return false;
        // Discord webhooks can't be tested without sending, so assume healthy if configured
        return true;

      default:
        throw new Error(`Unknown bridge: ${bridge}`);
    }
  }

  /**
   * Update bridge metrics
   */
  updateMetrics(bridge, success, responseTime) {
    const metric = this.metrics[bridge];
    
    metric.calls++;
    if (!success) metric.errors++;
    metric.lastCheck = new Date().toISOString();
    
    // Update average response time (simple moving average)
    if (responseTime > 0) {
      metric.avgResponseTime = metric.avgResponseTime === 0 
        ? responseTime 
        : (metric.avgResponseTime + responseTime) / 2;
    }
    
    // Update status
    const errorRate = metric.errors / metric.calls;
    const isHealthy = success && errorRate < this.alertThresholds.errorRate;
    metric.status = isHealthy ? 'healthy' : 'degraded';
  }

  /**
   * Check metrics against alert thresholds
   */
  checkForAlerts(results) {
    const alerts = [];
    
    for (const [bridge, result] of Object.entries(results)) {
      const metric = this.metrics[bridge];
      
      // High error rate alert
      if (metric.calls > 10) { // Only alert after some calls
        const errorRate = metric.errors / metric.calls;
        if (errorRate > this.alertThresholds.errorRate) {
          alerts.push({
            bridge,
            type: 'high_error_rate',
            message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
            severity: 'warning'
          });
        }
      }
      
      // Slow response time alert
      if (result.responseTime > this.alertThresholds.responseTime) {
        alerts.push({
          bridge,
          type: 'slow_response',
          message: `Slow response: ${result.responseTime}ms`,
          severity: 'warning'
        });
      }
      
      // Bridge down alert
      if (!result.healthy) {
        alerts.push({
          bridge,
          type: 'bridge_down',
          message: `Bridge unhealthy: ${result.error || 'Unknown error'}`,
          severity: 'critical'
        });
      }
    }
    
    // Process alerts
    if (alerts.length > 0) {
      this.handleAlerts(alerts);
    }
  }

  /**
   * Handle bridge alerts (log, notify, etc.)
   */
  async handleAlerts(alerts) {
    for (const alert of alerts) {
      const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
      console.log(`${icon} Bridge Alert [${alert.bridge.toUpperCase()}]: ${alert.message}`);
    }
    
    // In a full implementation, this would:
    // 1. Send notifications to /vibe users
    // 2. Log to monitoring system
    // 3. Trigger automatic recovery attempts
    // 4. Update status dashboard
  }

  /**
   * Get current health status for all bridges
   */
  getHealthStatus() {
    const status = {};
    
    for (const [bridge, metric] of Object.entries(this.metrics)) {
      const errorRate = metric.calls > 0 ? metric.errors / metric.calls : 0;
      
      status[bridge] = {
        configured: this.isBridgeConfigured(bridge),
        status: metric.status,
        calls: metric.calls,
        errors: metric.errors,
        errorRate: (errorRate * 100).toFixed(1) + '%',
        avgResponseTime: Math.round(metric.avgResponseTime) + 'ms',
        lastCheck: metric.lastCheck,
        uptime: this.calculateUptime(bridge)
      };
    }
    
    return status;
  }

  /**
   * Check if bridge is configured
   */
  isBridgeConfigured(bridge) {
    switch (bridge) {
      case 'x': return twitter.isConfigured();
      case 'telegram': return telegram.isConfigured();
      case 'farcaster': return farcaster.isConfigured();
      case 'discord': return discord.isConfigured();
      default: return false;
    }
  }

  /**
   * Calculate bridge uptime percentage
   */
  calculateUptime(bridge) {
    const metric = this.metrics[bridge];
    if (metric.calls === 0) return '0%';
    
    const successRate = (metric.calls - metric.errors) / metric.calls;
    return (successRate * 100).toFixed(1) + '%';
  }

  /**
   * Get API quota information (where available)
   */
  async getQuotaInfo() {
    const quotas = {};
    
    // X API has rate limits we can track
    if (twitter.isConfigured()) {
      try {
        // This would require implementing rate limit header tracking
        quotas.x = {
          remaining: 'Unknown',
          reset: 'Unknown',
          note: 'Rate limit tracking not implemented'
        };
      } catch (e) {
        quotas.x = { error: e.message };
      }
    }
    
    // Telegram has generous limits
    if (telegram.isConfigured()) {
      quotas.telegram = {
        remaining: '30 messages/second',
        note: 'Telegram bot API limits'
      };
    }
    
    // Farcaster via Neynar has API limits
    if (farcaster.isConfigured()) {
      quotas.farcaster = {
        remaining: 'Depends on Neynar plan',
        note: 'Check Neynar dashboard for quotas'
      };
    }
    
    return quotas;
  }

  /**
   * Test bridge recovery after outage
   */
  async testRecovery(bridge) {
    console.log(`🔄 Testing recovery for ${bridge} bridge...`);
    
    try {
      const isHealthy = await this.checkBridgeHealth(bridge);
      if (isHealthy) {
        this.metrics[bridge].status = 'healthy';
        console.log(`✅ ${bridge} bridge recovered`);
        return true;
      } else {
        console.log(`❌ ${bridge} bridge still unhealthy`);
        return false;
      }
    } catch (error) {
      console.log(`💥 ${bridge} bridge recovery test failed: ${error.message}`);
      return false;
    }
  }
}

// Global monitor instance
let globalMonitor = null;

/**
 * Get or create global monitor instance
 */
function getMonitor() {
  if (!globalMonitor) {
    globalMonitor = new BridgeMonitor();
  }
  return globalMonitor;
}

/**
 * Start monitoring all bridges
 */
function startMonitoring(intervalMinutes = 5) {
  const monitor = getMonitor();
  monitor.startMonitoring(intervalMinutes);
  return monitor;
}

/**
 * Stop monitoring
 */
function stopMonitoring() {
  if (globalMonitor) {
    globalMonitor.stopMonitoring();
  }
}

/**
 * Get current health dashboard
 */
async function getHealthDashboard() {
  const monitor = getMonitor();
  
  const healthStatus = monitor.getHealthStatus();
  const quotaInfo = await monitor.getQuotaInfo();
  const recentCheck = await monitor.performHealthCheck();
  
  return {
    timestamp: new Date().toISOString(),
    bridges: healthStatus,
    quotas: quotaInfo,
    recentCheck,
    summary: {
      totalBridges: Object.keys(healthStatus).length,
      healthyBridges: Object.values(healthStatus).filter(b => b.status === 'healthy').length,
      configuredBridges: Object.values(healthStatus).filter(b => b.configured).length
    }
  };
}

module.exports = {
  BridgeMonitor,
  getMonitor,
  startMonitoring,
  stopMonitoring,
  getHealthDashboard
};