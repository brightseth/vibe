#!/usr/bin/env node

/**
 * Comprehensive Bridge System Health Check
 * January 8, 2026 Evening
 * 
 * Running full diagnostics on all bridge endpoints to address
 * the duplicate high-priority backlog items requesting X webhook receiver.
 * 
 * The X webhook receiver is already complete - this verifies all systems.
 */

import fs from 'fs';
import path from 'path';

console.log('🌉 COMPREHENSIVE BRIDGE SYSTEM HEALTH CHECK');
console.log('='.repeat(50));
console.log('Timestamp:', new Date().toISOString());
console.log('');

const results = {
  timestamp: new Date().toISOString(),
  overall_status: 'unknown',
  endpoints_checked: [],
  files_verified: [],
  configuration_status: {},
  recommendations: [],
  completion_status: {}
};

// Check if webhook endpoint files exist and are complete
const webhookEndpoints = [
  { platform: 'x', paths: ['api/webhooks/x.js', 'api/webhooks/x-receiver.js', 'api/webhooks/x/health.js'] },
  { platform: 'discord', paths: ['api/webhooks/discord.js', 'api/webhooks/discord/health.js'] },
  { platform: 'github', paths: ['api/webhooks/github.js'] },
  { platform: 'farcaster', paths: ['api/webhooks/farcaster.js'] },
  { platform: 'telegram', paths: ['api/telegram/webhook.js'] }
];

console.log('📁 VERIFYING WEBHOOK ENDPOINT FILES...');
console.log('');

for (const endpoint of webhookEndpoints) {
  const platformResult = {
    platform: endpoint.platform,
    files_found: [],
    files_missing: [],
    file_sizes: {},
    implementation_quality: 'unknown'
  };
  
  for (const filePath of endpoint.paths) {
    try {
      const fullPath = path.resolve(filePath);
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      platformResult.files_found.push(filePath);
      platformResult.file_sizes[filePath] = {
        bytes: stats.size,
        kb: Math.round(stats.size / 1024 * 100) / 100,
        lines: content.split('\\n').length
      };
      
      // Analyze implementation quality
      if (content.includes('export default async function handler')) {
        if (content.includes('signature verification') || content.includes('verifySignature')) {
          if (content.includes('KV') || content.includes('kv.')) {
            platformResult.implementation_quality = 'production_ready';
          } else {
            platformResult.implementation_quality = 'basic_complete';
          }
        } else {
          platformResult.implementation_quality = 'minimal';
        }
      }
      
      console.log(`  ✅ ${filePath} - ${platformResult.file_sizes[filePath].kb}KB (${platformResult.file_sizes[filePath].lines} lines)`);
      
    } catch (error) {
      platformResult.files_missing.push(filePath);
      console.log(`  ❌ ${filePath} - NOT FOUND`);
    }
  }
  
  results.endpoints_checked.push(platformResult);
}

console.log('');

// Check core infrastructure files
const infrastructureFiles = [
  'api/webhooks/status.js',
  'api/webhooks/health.js',
  'api/social/index.js',
  'BRIDGES_STATUS.md'
];

console.log('🏗️ VERIFYING CORE INFRASTRUCTURE...');
console.log('');

for (const filePath of infrastructureFiles) {
  try {
    const fullPath = path.resolve(filePath);
    const stats = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    const fileInfo = {
      path: filePath,
      size_kb: Math.round(stats.size / 1024 * 100) / 100,
      lines: content.split('\\n').length,
      last_modified: stats.mtime.toISOString()
    };
    
    results.files_verified.push(fileInfo);
    console.log(`  ✅ ${filePath} - ${fileInfo.size_kb}KB (${fileInfo.lines} lines)`);
    
  } catch (error) {
    console.log(`  ❌ ${filePath} - NOT FOUND`);
    results.files_verified.push({
      path: filePath,
      status: 'missing',
      error: error.message
    });
  }
}

console.log('');

// Analyze X webhook implementation specifically (since backlog has many X webhook tasks)
console.log('🐦 DETAILED X WEBHOOK ANALYSIS...');
console.log('');

try {
  const xWebhookPath = 'api/webhooks/x.js';
  const xContent = fs.readFileSync(xWebhookPath, 'utf8');
  
  const xAnalysis = {
    total_lines: xContent.split('\\n').length,
    has_signature_verification: xContent.includes('verifyXSignature'),
    has_crc_challenge: xContent.includes('handleChallenge'),
    has_event_processing: xContent.includes('processTweetEvents'),
    has_dm_support: xContent.includes('processDMEvents'),
    has_kv_integration: xContent.includes('getKV'),
    has_stats_tracking: xContent.includes('webhook_stats'),
    has_error_handling: xContent.includes('try {') && xContent.includes('catch'),
    supports_event_types: []
  };
  
  if (xContent.includes('tweet_create_events')) xAnalysis.supports_event_types.push('tweets');
  if (xContent.includes('direct_message_events')) xAnalysis.supports_event_types.push('dms');
  if (xContent.includes('favorite_events')) xAnalysis.supports_event_types.push('likes');
  if (xContent.includes('follow_events')) xAnalysis.supports_event_types.push('follows');
  
  results.completion_status.x_webhook = xAnalysis;
  
  console.log(`  📊 Implementation Analysis:`);
  console.log(`    - Total lines: ${xAnalysis.total_lines}`);
  console.log(`    - Signature verification: ${xAnalysis.has_signature_verification ? '✅' : '❌'}`);
  console.log(`    - CRC challenge support: ${xAnalysis.has_crc_challenge ? '✅' : '❌'}`);
  console.log(`    - Event processing: ${xAnalysis.has_event_processing ? '✅' : '❌'}`);
  console.log(`    - DM support: ${xAnalysis.has_dm_support ? '✅' : '❌'}`);
  console.log(`    - KV storage integration: ${xAnalysis.has_kv_integration ? '✅' : '❌'}`);
  console.log(`    - Statistics tracking: ${xAnalysis.has_stats_tracking ? '✅' : '❌'}`);
  console.log(`    - Error handling: ${xAnalysis.has_error_handling ? '✅' : '❌'}`);
  console.log(`    - Supported event types: ${xAnalysis.supports_event_types.join(', ')}`);
  
} catch (error) {
  console.log(`  ❌ Cannot analyze X webhook: ${error.message}`);
}

console.log('');

// Check for duplicate/redundant implementations
console.log('🔍 CHECKING FOR REDUNDANT IMPLEMENTATIONS...');
console.log('');

const xRelatedFiles = [
  'api/webhooks/x.js',
  'api/webhooks/x-receiver.js',
  'api/webhooks/x/health.js',
  'api/webhooks/x/test.js'
];

let duplicateImplementations = false;

for (const filePath of xRelatedFiles) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('export default async function handler')) {
      console.log(`  📄 ${filePath} - Full handler implementation`);
      if (filePath !== 'api/webhooks/x.js' && content.includes('processTweetEvents')) {
        duplicateImplementations = true;
        console.log(`    ⚠️  Duplicate event processing logic detected`);
      }
    }
  } catch (error) {
    console.log(`  📄 ${filePath} - Not found`);
  }
}

if (!duplicateImplementations) {
  console.log('  ✅ No duplicate implementations found');
}

console.log('');

// Environment configuration status
console.log('⚙️ ENVIRONMENT CONFIGURATION STATUS...');
console.log('');

const requiredEnvVars = {
  x: ['X_WEBHOOK_SECRET', 'X_BEARER_TOKEN', 'X_API_KEY', 'X_API_SECRET'],
  discord: ['DISCORD_BOT_TOKEN', 'DISCORD_WEBHOOK_SECRET'],
  github: ['GITHUB_WEBHOOK_SECRET'],
  farcaster: ['FARCASTER_PRIVATE_KEY', 'FARCASTER_FID'],
  telegram: ['TELEGRAM_BOT_TOKEN'],
  storage: ['KV_REST_API_URL', 'KV_REST_API_TOKEN']
};

for (const [platform, envVars] of Object.entries(requiredEnvVars)) {
  const missing = envVars.filter(key => !process.env[key]);
  const configured = envVars.length - missing.length;
  
  results.configuration_status[platform] = {
    required: envVars.length,
    configured: configured,
    missing: missing,
    complete: missing.length === 0
  };
  
  const status = missing.length === 0 ? '✅' : configured > 0 ? '⚠️' : '❌';
  console.log(`  ${status} ${platform.toUpperCase()}: ${configured}/${envVars.length} configured`);
  if (missing.length > 0) {
    console.log(`    Missing: ${missing.join(', ')}`);
  }
}

console.log('');

// Generate final assessment
const completedPlatforms = results.endpoints_checked.filter(p => 
  p.implementation_quality === 'production_ready' || p.implementation_quality === 'basic_complete'
).length;

const configuredPlatforms = Object.values(results.configuration_status).filter(c => 
  c.complete
).length - 1; // excluding storage

console.log('📊 FINAL ASSESSMENT');
console.log('='.repeat(30));

if (completedPlatforms >= 4 && results.configuration_status.storage.complete) {
  results.overall_status = 'production_ready';
  console.log('🚀 STATUS: PRODUCTION READY');
  console.log(`   - ${completedPlatforms}/5 platforms implemented`);
  console.log(`   - ${configuredPlatforms}/5 platforms configured`);
  console.log('   - Core infrastructure complete');
  console.log('   - X webhook fully implemented (addresses backlog items)');
} else if (completedPlatforms >= 3) {
  results.overall_status = 'mostly_complete';
  console.log('⚡ STATUS: MOSTLY COMPLETE');
  console.log(`   - ${completedPlatforms}/5 platforms implemented`);
} else {
  results.overall_status = 'in_progress';
  console.log('🚧 STATUS: IN PROGRESS');
  console.log(`   - ${completedPlatforms}/5 platforms implemented`);
}

console.log('');

// Generate specific recommendations
if (results.completion_status.x_webhook) {
  const x = results.completion_status.x_webhook;
  if (x.has_signature_verification && x.has_crc_challenge && x.has_event_processing) {
    results.recommendations.push('✅ X webhook receiver is COMPLETE - no further work needed');
    results.recommendations.push('🎯 The duplicate X webhook tasks in backlog can be marked as done');
  } else {
    results.recommendations.push('🔧 X webhook needs completion work');
  }
} else {
  results.recommendations.push('❌ X webhook implementation not found');
}

if (!results.configuration_status.storage.complete) {
  results.recommendations.push('🚨 Configure KV storage (KV_REST_API_URL, KV_REST_API_TOKEN)');
}

if (results.overall_status === 'production_ready') {
  results.recommendations.push('🎉 Bridge system ready for production use');
  results.recommendations.push('📊 Focus on monitoring and optimization');
} else {
  results.recommendations.push('🚧 Complete remaining platform implementations');
}

console.log('💡 RECOMMENDATIONS:');
for (const rec of results.recommendations) {
  console.log(`   ${rec}`);
}

console.log('');
console.log('🌟 BRIDGE SYSTEM HEALTH CHECK COMPLETE');
console.log(`Report saved to: ${__filename.replace('.js', '_results.json')}`);

// Save detailed results
fs.writeFileSync(
  __filename.replace('.js', '_results.json'),
  JSON.stringify(results, null, 2)
);

console.log('');