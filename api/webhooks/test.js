/**
 * /api/webhooks/test — Bridge System Test Endpoint
 * 
 * Comprehensive testing endpoint for all bridge integrations.
 * Tests webhook functionality, social inbox integration, and cross-platform posting.
 */

import crypto from 'crypto';

// Test KV availability
async function testKV() {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set('test:webhook:ping', Date.now(), { ex: 60 });
    const result = await kv.get('test:webhook:ping');
    return { available: true, working: !!result };
  } catch (e) {
    return { available: false, error: e.message };
  }
}

// Test individual webhook endpoint
async function testWebhookEndpoint(platform) {
  try {
    const webhookHandlers = {
      x: () => import('./x.js'),
      discord: () => import('./discord.js'), 
      github: () => import('./github.js'),
      farcaster: () => import('./farcaster.js')
    };
    
    if (!webhookHandlers[platform]) {
      throw new Error('Platform not supported');
    }

    const handler = await webhookHandlers[platform]();
    
    // Create mock health check request
    const mockReq = {
      method: 'GET',
      query: {},
      headers: { host: 'vibe.fyi' },
      body: {}
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => ({ status: code, data })
      })
    };
    
    const result = await handler.default(mockReq, mockRes);
    return { 
      endpoint: `/api/webhooks/${platform}`,
      healthy: result.status === 200,
      response: result.data
    };
    
  } catch (e) {
    return { 
      endpoint: `/api/webhooks/${platform}`,
      healthy: false,
      error: e.message
    };
  }
}

// Test social inbox integration
async function testSocialInbox() {
  try {
    // Create test event
    const testEvent = {
      id: `test_${Date.now()}`,
      platform: 'test',
      type: 'mention',
      timestamp: new Date().toISOString(),
      from: {
        id: 'test_user',
        handle: 'tester',
        name: 'Test User'
      },
      content: 'This is a test message from the bridge system test',
      metadata: { test: true },
      signal_score: 85,
      processed: false
    };
    
    const { kv } = await import('@vercel/kv');
    
    // Store in social inbox
    const inboxKey = 'vibe:social_inbox';
    await kv.lpush(inboxKey, JSON.stringify(testEvent));
    
    // Retrieve and verify
    const stored = await kv.lrange(inboxKey, 0, 0);
    const retrieved = stored.length > 0 ? JSON.parse(stored[0]) : null;
    
    // Clean up test event
    await kv.lrem(inboxKey, 1, JSON.stringify(testEvent));
    
    return {
      working: retrieved && retrieved.id === testEvent.id,
      event_stored: !!retrieved,
      event_id: retrieved?.id
    };
    
  } catch (e) {
    return {
      working: false,
      error: e.message
    };
  }
}

// Test cross-platform posting capability
async function testCrossPlatformPosting() {
  try {
    // Import adapters
    const { XAdapter } = await import('../social/adapters/x.js');
    const { FarcasterAdapter } = await import('../social/adapters/farcaster.js');
    
    const adapters = {
      x: new XAdapter(),
      farcaster: new FarcasterAdapter()
    };
    
    const results = {};
    
    for (const [platform, adapter] of Object.entries(adapters)) {
      try {
        const capabilities = adapter.getCapabilities();
        const configured = adapter.isConfigured();
        
        results[platform] = {
          available: true,
          configured,
          capabilities,
          can_read: capabilities.read,
          can_write: capabilities.write && configured
        };
        
      } catch (e) {
        results[platform] = {
          available: false,
          error: e.message
        };
      }
    }
    
    return results;
    
  } catch (e) {
    return {
      error: e.message,
      working: false
    };
  }
}

// Get bridge statistics
async function getBridgeStats() {
  try {
    const { kv } = await import('@vercel/kv');
    
    const platforms = ['x', 'discord', 'github', 'farcaster', 'telegram'];
    const stats = {};
    
    for (const platform of platforms) {
      const key = `vibe:${platform}_webhook_stats`;
      const platformStats = await kv.hgetall(key) || {};
      
      stats[platform] = {
        total_deliveries: parseInt(platformStats.total_deliveries) || 0,
        events_processed: parseInt(platformStats.events_processed) || 0,
        last_delivery: platformStats.last_delivery || null,
        configured: true // We'll check this properly in webhook tests
      };
    }
    
    return stats;
    
  } catch (e) {
    return { error: e.message };
  }
}

export default async function handler(req, res) {
  const { method, query } = req;
  
  // Only support GET for testing
  if (method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET']
    });
  }
  
  try {
    const { platform, quick } = query;
    
    // Test specific platform
    if (platform) {
      const result = await testWebhookEndpoint(platform);
      return res.status(200).json({
        platform,
        test_result: result,
        timestamp: new Date().toISOString()
      });
    }
    
    // Quick health check
    if (quick === 'true') {
      const kv = await testKV();
      return res.status(200).json({
        status: kv.available ? 'healthy' : 'degraded',
        kv_available: kv.available,
        timestamp: new Date().toISOString()
      });
    }
    
    // Full bridge system test
    console.log('[Bridge Test] Running comprehensive bridge system test...');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      overall_status: 'testing',
      tests: {}
    };
    
    // Test 1: KV Storage
    console.log('[Bridge Test] Testing KV storage...');
    testResults.tests.kv_storage = await testKV();
    
    // Test 2: Webhook Endpoints
    console.log('[Bridge Test] Testing webhook endpoints...');
    const platforms = ['x', 'discord', 'github', 'farcaster'];
    testResults.tests.webhook_endpoints = {};
    
    for (const platform of platforms) {
      testResults.tests.webhook_endpoints[platform] = await testWebhookEndpoint(platform);
    }
    
    // Test 3: Social Inbox Integration
    console.log('[Bridge Test] Testing social inbox...');
    testResults.tests.social_inbox = await testSocialInbox();
    
    // Test 4: Cross-Platform Posting
    console.log('[Bridge Test] Testing cross-platform posting...');
    testResults.tests.cross_platform_posting = await testCrossPlatformPosting();
    
    // Test 5: Bridge Statistics
    console.log('[Bridge Test] Getting bridge statistics...');
    testResults.stats = await getBridgeStats();
    
    // Determine overall status
    const kvWorking = testResults.tests.kv_storage.available;
    const webhooksHealthy = Object.values(testResults.tests.webhook_endpoints)
      .filter(r => r.healthy).length;
    const inboxWorking = testResults.tests.social_inbox.working;
    
    if (kvWorking && webhooksHealthy >= 3 && inboxWorking) {
      testResults.overall_status = 'healthy';
    } else if (kvWorking && webhooksHealthy >= 2) {
      testResults.overall_status = 'degraded';
    } else {
      testResults.overall_status = 'unhealthy';
    }
    
    testResults.summary = {
      kv_storage: kvWorking ? 'working' : 'failed',
      webhooks_healthy: `${webhooksHealthy}/${platforms.length}`,
      social_inbox: inboxWorking ? 'working' : 'failed',
      platforms_configured: Object.values(testResults.tests.cross_platform_posting || {})
        .filter(p => p.configured).length
    };
    
    console.log(`[Bridge Test] Complete - Status: ${testResults.overall_status}`);
    
    return res.status(200).json(testResults);
    
  } catch (error) {
    console.error('[Bridge Test] Error:', error);
    return res.status(500).json({
      error: 'Test execution failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}