/**
 * /api/webhooks/test — Bridge Testing Endpoint
 * 
 * Tests all webhook endpoints and their integration with the social inbox.
 * Use this to verify the bridge system is working end-to-end.
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
 * Test webhook endpoint functionality
 */
async function testWebhookEndpoint(endpoint) {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://vibe.fyi';
        
    const url = `${baseUrl}${endpoint}`;
    
    // Test health endpoint
    const healthResponse = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'vibe-bridge-test/1.0' }
    });
    
    if (!healthResponse.ok) {
      return {
        status: 'error',
        error: `HTTP ${healthResponse.status}`,
        endpoint
      };
    }
    
    const healthData = await healthResponse.json();
    
    return {
      status: 'healthy',
      endpoint,
      configured: healthData.configured || false,
      kv_available: healthData.kv_available || false,
      stats: healthData.stats || {}
    };
    
  } catch (error) {
    return {
      status: 'error',
      endpoint,
      error: error.message
    };
  }
}

/**
 * Test social inbox integration
 */
async function testSocialInbox() {
  try {
    const kv = await getKV();
    if (!kv) {
      return {
        status: 'error',
        error: 'KV storage not available'
      };
    }
    
    // Test writing to inbox
    const testEvent = {
      id: `test_${Date.now()}`,
      platform: 'test',
      type: 'bridge_test',
      timestamp: new Date().toISOString(),
      from: {
        id: 'test_user',
        handle: 'bridges-agent',
        name: 'Bridge Test'
      },
      content: 'Bridge system test message',
      processed: false,
      signal_score: 100
    };
    
    // Add to inbox
    await kv.lpush('vibe:social_inbox', JSON.stringify(testEvent));
    
    // Read back from inbox
    const inboxEvents = await kv.lrange('vibe:social_inbox', 0, 0);
    const retrievedEvent = inboxEvents.length > 0 ? JSON.parse(inboxEvents[0]) : null;
    
    // Clean up test event
    await kv.lrem('vibe:social_inbox', 0, JSON.stringify(testEvent));
    
    return {
      status: 'working',
      test_event_id: testEvent.id,
      retrieved: !!retrievedEvent,
      roundtrip_success: retrievedEvent?.id === testEvent.id
    };
    
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Generate test summary
 */
function generateTestSummary(results) {
  const webhooks = results.webhook_tests;
  const inbox = results.inbox_test;
  
  const totalWebhooks = Object.keys(webhooks).length;
  const healthyWebhooks = Object.values(webhooks).filter(w => w.status === 'healthy').length;
  const configuredWebhooks = Object.values(webhooks).filter(w => w.configured).length;
  
  let status = 'healthy';
  if (inbox.status !== 'working') status = 'degraded';
  else if (healthyWebhooks < totalWebhooks) status = 'partial';
  
  return {
    overall_status: status,
    webhook_health: `${healthyWebhooks}/${totalWebhooks} healthy`,
    configured_bridges: `${configuredWebhooks}/${totalWebhooks} configured`,
    social_inbox: inbox.status,
    ready_for_production: status === 'healthy' && configuredWebhooks > 0
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET required for testing' });
  }
  
  try {
    // Test all webhook endpoints
    const webhookEndpoints = {
      x: '/api/webhooks/x',
      discord: '/api/webhooks/discord', 
      github: '/api/webhooks/github',
      farcaster: '/api/webhooks/farcaster'
    };
    
    const webhookTests = {};
    for (const [platform, endpoint] of Object.entries(webhookEndpoints)) {
      webhookTests[platform] = await testWebhookEndpoint(endpoint);
    }
    
    // Test social inbox
    const inboxTest = await testSocialInbox();
    
    // Generate summary
    const results = {
      webhook_tests: webhookTests,
      inbox_test: inboxTest
    };
    
    const summary = generateTestSummary(results);
    
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      test_results: results,
      summary,
      recommendations: summary.ready_for_production 
        ? ['System ready! Set up webhook URLs in platform dashboards']
        : [
            'Configure environment variables for each platform',
            'Test individual webhook health endpoints',
            'Verify social inbox with GET /api/social'
          ],
      next_steps: [
        '1. Check platform-specific setup guides',
        '2. Configure webhook URLs in platform dashboards', 
        '3. Test with real events from each platform',
        '4. Monitor delivery stats in /api/webhooks/status'
      ]
    });
    
  } catch (error) {
    return res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
}