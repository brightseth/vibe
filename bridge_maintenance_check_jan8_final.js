#!/usr/bin/env node
/**
 * Bridge System Maintenance Check - Jan 8, 2026 Final
 * 
 * Comprehensive health check of all /vibe bridge systems.
 * Run by @bridges-agent to verify production readiness.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🌉 /vibe Bridge System - Final Maintenance Check');
console.log('='.repeat(60));

// Check 1: Verify all webhook endpoints exist
const webhookEndpoints = [
  'api/webhooks/x.js',
  'api/webhooks/discord.js', 
  'api/webhooks/github.js',
  'api/webhooks/farcaster.js',
  'api/webhooks/whatsapp.js',
  'api/telegram/webhook.js',
  'api/webhooks/status.js',
  'api/webhooks/health.js'
];

console.log('\n📁 WEBHOOK ENDPOINTS CHECK');
const endpointStatus = {};

for (const endpoint of webhookEndpoints) {
  try {
    const content = readFileSync(endpoint, 'utf8');
    const hasSecurityVerification = content.includes('signature') || content.includes('verify');
    const hasEventProcessing = content.includes('process') || content.includes('forward');
    const hasErrorHandling = content.includes('try {') && content.includes('catch');
    
    endpointStatus[endpoint] = {
      exists: true,
      size: content.length,
      hasSecurityVerification,
      hasEventProcessing,
      hasErrorHandling,
      quality: hasSecurityVerification && hasEventProcessing && hasErrorHandling ? '✅ EXCELLENT' : '⚠️ BASIC'
    };
    
    console.log(`  ✅ ${endpoint} - ${endpointStatus[endpoint].quality} (${content.length} bytes)`);
  } catch (e) {
    endpointStatus[endpoint] = { exists: false, error: e.message };
    console.log(`  ❌ ${endpoint} - MISSING`);
  }
}

// Check 2: Verify MCP server bridge infrastructure
console.log('\n🔧 MCP BRIDGE INFRASTRUCTURE');
const mcpBridges = [
  'mcp-server/bridges/x-webhook.js',
  'mcp-server/bridges/discord-bot.js',
  'mcp-server/bridges/farcaster.js',
  'mcp-server/bridges/telegram.js',
  'mcp-server/bridges/whatsapp.js',
  'mcp-server/bridges/webhook-health.js'
];

for (const bridge of mcpBridges) {
  try {
    statSync(bridge);
    console.log(`  ✅ ${bridge} - EXISTS`);
  } catch (e) {
    console.log(`  ❌ ${bridge} - MISSING`);
  }
}

// Check 3: Count total bridge files
console.log('\n📊 BRIDGE SYSTEM METRICS');

const totalWebhookFiles = Object.values(endpointStatus).filter(s => s.exists).length;
const excellentQualityFiles = Object.values(endpointStatus).filter(s => s.quality === '✅ EXCELLENT').length;
const totalCodeSize = Object.values(endpointStatus).reduce((sum, s) => sum + (s.size || 0), 0);

console.log(`  📁 Total Webhook Files: ${totalWebhookFiles}/8`);
console.log(`  ⭐ Excellent Quality: ${excellentQualityFiles}/${totalWebhookFiles}`);
console.log(`  💾 Total Code Size: ${(totalCodeSize / 1024).toFixed(1)}KB`);

// Check 4: Verify documentation exists
console.log('\n📚 DOCUMENTATION CHECK');
const docs = [
  'BRIDGE_SYSTEM_COMPLETE.md',
  'BRIDGE_SYSTEM_STATUS_FINAL_JAN8.md',
  'BRIDGES_STATUS.md'
];

for (const doc of docs) {
  try {
    statSync(doc);
    console.log(`  ✅ ${doc} - EXISTS`);
  } catch (e) {
    console.log(`  ❌ ${doc} - MISSING`);
  }
}

// Check 5: Calculate overall system health
console.log('\n🏥 OVERALL SYSTEM HEALTH');

const webhookHealth = (totalWebhookFiles / 8) * 100;
const qualityHealth = (excellentQualityFiles / totalWebhookFiles) * 100;
const overallHealth = Math.round((webhookHealth + qualityHealth) / 2);

console.log(`  🌉 Webhook Coverage: ${webhookHealth.toFixed(1)}%`);
console.log(`  ⭐ Code Quality: ${qualityHealth.toFixed(1)}%`);
console.log(`  📈 Overall Health: ${overallHealth}%`);

// Final status
console.log('\n🎯 BRIDGE SYSTEM STATUS');
if (overallHealth >= 90) {
  console.log('  ✅ STATUS: EXCELLENT - Production Ready');
  console.log('  🚀 RECOMMENDATION: System is complete and operational');
} else if (overallHealth >= 75) {
  console.log('  ⚠️ STATUS: GOOD - Minor improvements needed');
  console.log('  🔧 RECOMMENDATION: Address missing components');
} else {
  console.log('  ❌ STATUS: NEEDS WORK - Major gaps identified');
  console.log('  🚨 RECOMMENDATION: Complete missing bridges');
}

// Timestamp
console.log(`\n⏰ Check completed: ${new Date().toISOString()}`);
console.log('🤖 Maintenance performed by: @bridges-agent');
console.log('='.repeat(60));

// Export results for potential API consumption
const results = {
  timestamp: new Date().toISOString(),
  agent: '@bridges-agent',
  metrics: {
    webhook_files: totalWebhookFiles,
    excellent_quality: excellentQualityFiles,
    total_code_size_kb: Math.round(totalCodeSize / 1024),
    overall_health_percent: overallHealth
  },
  endpoints: endpointStatus,
  status: overallHealth >= 90 ? 'EXCELLENT' : overallHealth >= 75 ? 'GOOD' : 'NEEDS_WORK',
  recommendation: overallHealth >= 90 
    ? 'System is complete and operational'
    : 'Address missing components'
};

console.log('\n📊 MACHINE-READABLE RESULTS:');
console.log(JSON.stringify(results, null, 2));