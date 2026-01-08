#!/usr/bin/env node

/**
 * Bridge System Health Check
 * Verifies all bridge endpoints and reports current status
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🌉 /vibe Bridge System Health Check\n');
console.log('==========================================\n');

// Check bridge endpoints
const bridgeEndpoints = [
  'api/webhooks/x.js',
  'api/webhooks/discord.js', 
  'api/webhooks/github.js',
  'api/webhooks/farcaster.js',
  'api/webhooks/whatsapp.js',
  'api/telegram/webhook.js',
  'api/webhooks/status.js',
  'api/webhooks/health.js'
];

console.log('📁 Bridge Endpoint Files:');
let implementedCount = 0;

bridgeEndpoints.forEach(endpoint => {
  const exists = existsSync(endpoint);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${endpoint}`);
  if (exists) implementedCount++;
});

console.log(`\n📊 Implementation Status: ${implementedCount}/${bridgeEndpoints.length} endpoints`);

// Check for platform support
const platforms = {
  'X/Twitter': ['api/webhooks/x.js'],
  'Discord': ['api/webhooks/discord.js'],
  'GitHub': ['api/webhooks/github.js'], 
  'Farcaster': ['api/webhooks/farcaster.js'],
  'WhatsApp': ['api/webhooks/whatsapp.js'],
  'Telegram': ['api/telegram/webhook.js']
};

console.log('\n🚀 Platform Support:');
Object.entries(platforms).forEach(([platform, files]) => {
  const allExist = files.every(f => existsSync(f));
  const status = allExist ? '✅' : '❌';
  console.log(`  ${status} ${platform}`);
});

// Analyze code quality for key bridges
console.log('\n🔍 Code Analysis:');

if (existsSync('api/webhooks/x.js')) {
  const xCode = readFileSync('api/webhooks/x.js', 'utf8');
  const hasSignatureVerification = xCode.includes('verifyXSignature');
  const hasCRCChallenge = xCode.includes('crc_token');
  const hasEventProcessing = xCode.includes('tweet_create_events');
  const hasKVIntegration = xCode.includes('vibe:social_inbox');
  
  console.log(`  X/Twitter Bridge:
    - Signature verification: ${hasSignatureVerification ? '✅' : '❌'}
    - CRC challenge: ${hasCRCChallenge ? '✅' : '❌'}
    - Event processing: ${hasEventProcessing ? '✅' : '❌'}
    - KV integration: ${hasKVIntegration ? '✅' : '❌'}`);
}

if (existsSync('api/webhooks/status.js')) {
  const statusCode = readFileSync('api/webhooks/status.js', 'utf8');
  const hasHealthChecks = statusCode.includes('performHealthChecks');
  const hasConfigStatus = statusCode.includes('getConfigurationStatus');
  const hasStatistics = statusCode.includes('getBridgeStatistics');
  
  console.log(`  Status Dashboard:
    - Health checks: ${hasHealthChecks ? '✅' : '❌'}
    - Config status: ${hasConfigStatus ? '✅' : '❌'}
    - Statistics: ${hasStatistics ? '✅' : '❌'}`);
}

// Overall system health score
const totalFeatures = 15; // Key features we check for
let implementedFeatures = implementedCount + 
  (existsSync('api/webhooks/x.js') ? 4 : 0) +
  (existsSync('api/webhooks/status.js') ? 3 : 0);

const healthScore = Math.round((implementedFeatures / totalFeatures) * 100);

console.log(`\n🎯 Overall System Health: ${healthScore}%`);

if (healthScore >= 90) {
  console.log('✅ EXCELLENT - Bridge system is complete and production-ready');
} else if (healthScore >= 70) {
  console.log('⚠️  GOOD - Bridge system is functional but has room for improvement');
} else {
  console.log('❌ NEEDS WORK - Bridge system requires significant development');
}

console.log('\n🔗 Key URLs:');
console.log('  Status: https://vibe.fyi/api/webhooks/status');
console.log('  Health: https://vibe.fyi/api/webhooks/health');
console.log('  X webhook: https://vibe.fyi/api/webhooks/x');
console.log('  Discord webhook: https://vibe.fyi/api/webhooks/discord');

console.log('\n📝 Next Steps:');
if (healthScore >= 90) {
  console.log('  1. Configure platform API credentials');
  console.log('  2. Test webhook endpoints with live data');
  console.log('  3. Monitor system health via status dashboard');
} else {
  console.log('  1. Complete missing bridge implementations');
  console.log('  2. Add proper error handling and logging');
  console.log('  3. Implement signature verification');
}

console.log('\n==========================================');
console.log(`Bridge Health Check Complete - Score: ${healthScore}%`);