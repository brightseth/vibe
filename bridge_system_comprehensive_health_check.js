/**
 * Comprehensive Bridge System Health Check
 * 
 * Verifies all bridge endpoints and their current status.
 * This will help determine if existing bridges are working or need fixes.
 */

const bridges = [
  { name: 'X', endpoint: '/api/webhooks/x' },
  { name: 'X-Receiver', endpoint: '/api/webhooks/x-receiver' },
  { name: 'Discord', endpoint: '/api/webhooks/discord' },
  { name: 'GitHub', endpoint: '/api/webhooks/github' },
  { name: 'Farcaster', endpoint: '/api/webhooks/farcaster' },
  { name: 'Telegram', endpoint: '/api/telegram/webhook' },
  { name: 'WhatsApp', endpoint: '/api/webhooks/whatsapp' },
  { name: 'Health', endpoint: '/api/webhooks/health' },
  { name: 'Status', endpoint: '/api/webhooks/status' }
];

async function testEndpoint(endpoint) {
  try {
    const baseUrl = 'https://vibe.fyi'; // Production URL
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'BridgeHealthCheck/1.0'
      }
    });
    
    return {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      body: response.ok ? await response.text() : null
    };
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.message
    };
  }
}

async function runHealthCheck() {
  console.log('🔍 Running Comprehensive Bridge System Health Check...\n');
  
  const results = {};
  
  for (const bridge of bridges) {
    console.log(`Testing ${bridge.name}: ${bridge.endpoint}`);
    const result = await testEndpoint(bridge.endpoint);
    results[bridge.name] = result;
    
    if (result.status === 'ERROR') {
      console.log(`  ❌ ERROR: ${result.error}`);
    } else if (result.ok) {
      console.log(`  ✅ OK (${result.status})`);
    } else {
      console.log(`  ⚠️ ${result.status} - ${result.statusText}`);
    }
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(50));
  
  let healthyCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  
  for (const [name, result] of Object.entries(results)) {
    if (result.status === 'ERROR') {
      console.log(`❌ ${name}: ${result.error}`);
      errorCount++;
    } else if (result.ok) {
      console.log(`✅ ${name}: Healthy (${result.status})`);
      healthyCount++;
    } else {
      console.log(`⚠️ ${name}: ${result.status} - ${result.statusText}`);
      warningCount++;
    }
  }
  
  console.log(`\n📈 TOTALS: ${healthyCount} healthy, ${warningCount} warnings, ${errorCount} errors`);
  
  // Overall system health
  const totalEndpoints = bridges.length;
  const healthScore = Math.round((healthyCount / totalEndpoints) * 100);
  
  console.log(`🎯 OVERALL HEALTH SCORE: ${healthScore}%`);
  
  if (healthScore >= 80) {
    console.log('🟢 System Status: HEALTHY');
  } else if (healthScore >= 60) {
    console.log('🟡 System Status: DEGRADED');
  } else {
    console.log('🔴 System Status: CRITICAL');
  }
  
  return {
    healthy: healthyCount,
    warnings: warningCount,
    errors: errorCount,
    healthScore,
    results
  };
}

// Run the health check
runHealthCheck().catch(console.error);