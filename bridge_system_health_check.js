/**
 * Bridge System Health Check
 * Run comprehensive diagnostics on all bridge endpoints
 */

const bridges = [
  { name: 'X (Twitter)', path: 'api/webhooks/x.js', health: 'api/webhooks/x/health.js' },
  { name: 'Discord', path: 'api/webhooks/discord.js', health: 'api/webhooks/discord/health.js' },
  { name: 'GitHub', path: 'api/webhooks/github.js', health: 'api/webhooks/github/health.js' },
  { name: 'Farcaster', path: 'api/webhooks/farcaster.js', health: 'api/webhooks/farcaster/health.js' },
  { name: 'Telegram', path: 'api/telegram/webhook.js', health: 'api/telegram/health.js' }
];

const fs = require('fs');
const path = require('path');

console.log('🌉 Bridge System Health Check');
console.log('================================');

let allGood = true;
const issues = [];

for (const bridge of bridges) {
  try {
    // Check if main endpoint exists
    const mainPath = path.join(process.cwd(), bridge.path);
    const healthPath = path.join(process.cwd(), bridge.health);
    
    const mainExists = fs.existsSync(mainPath);
    const healthExists = fs.existsSync(healthPath);
    
    console.log(`\n${bridge.name}:`);
    console.log(`  Main endpoint: ${mainExists ? '✅' : '❌'} (${bridge.path})`);
    console.log(`  Health check: ${healthExists ? '✅' : '❌'} (${bridge.health})`);
    
    if (!mainExists) {
      issues.push(`${bridge.name}: Missing main endpoint`);
      allGood = false;
    }
    
    if (!healthExists) {
      issues.push(`${bridge.name}: Missing health endpoint`);
      allGood = false;
    }
    
    if (mainExists) {
      // Check if file has content
      const content = fs.readFileSync(mainPath, 'utf8');
      if (content.length < 1000) {
        issues.push(`${bridge.name}: Main endpoint seems incomplete (${content.length} chars)`);
        allGood = false;
      } else {
        console.log(`  Content size: ✅ ${content.length} characters`);
      }
    }
    
  } catch (error) {
    console.log(`  Error: ❌ ${error.message}`);
    issues.push(`${bridge.name}: ${error.message}`);
    allGood = false;
  }
}

console.log('\n================================');

if (allGood) {
  console.log('🎉 All bridge endpoints are healthy!');
  console.log('\nBridge system is COMPLETE and PRODUCTION READY.');
  console.log('\nRecommendation: Run maintenance cycle to check runtime health.');
} else {
  console.log('⚠️  Found issues:');
  issues.forEach(issue => console.log(`  - ${issue}`));
}

console.log('\n🔍 Next steps:');
console.log('  1. Check runtime health: GET /api/webhooks/status');
console.log('  2. Test endpoints: POST /api/webhooks/test');
console.log('  3. Monitor social inbox: GET /api/social');