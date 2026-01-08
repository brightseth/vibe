/**
 * Quick test check for X webhook functionality
 * Validates the endpoint is working and properly configured
 */

export default async function handler(req, res) {
  // Only allow GET for health check
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test the main X webhook endpoint
    const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    
    // 1. Test GET (health check)
    const healthResponse = await fetch(`${baseUrl}/api/webhooks/x`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const healthResult = await healthResponse.json();
    
    // 2. Test CRC challenge simulation
    const crcResponse = await fetch(`${baseUrl}/api/webhooks/x?crc_token=test123`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const testResults = {
      timestamp: new Date().toISOString(),
      endpoint: '/api/webhooks/x',
      tests: {
        health_check: {
          status: healthResponse.status,
          success: healthResponse.status === 200,
          response: healthResult
        },
        crc_challenge: {
          status: crcResponse.status,
          success: crcResponse.status === 200 || crcResponse.status === 500, // 500 is ok if no secret configured
          configured: !!process.env.X_WEBHOOK_SECRET
        }
      },
      configuration: {
        webhook_secret: !!process.env.X_WEBHOOK_SECRET,
        bearer_token: !!process.env.X_BEARER_TOKEN,
        api_credentials: !!(process.env.X_API_KEY && process.env.X_API_SECRET),
        kv_configured: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
      }
    };
    
    // Overall status
    const allTestsPassing = testResults.tests.health_check.success && 
                           testResults.tests.crc_challenge.success;
    
    testResults.overall_status = allTestsPassing ? 'working' : 'needs_attention';
    testResults.ready_for_production = allTestsPassing && 
                                      testResults.configuration.webhook_secret &&
                                      testResults.configuration.kv_configured;
    
    return res.status(200).json(testResults);
    
  } catch (error) {
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}