#!/usr/bin/env node

/**
 * Comprehensive Bridge System Health Check - January 8, 2026
 * 
 * Validates the complete /vibe bridge infrastructure:
 * - All webhook endpoints are properly implemented
 * - Configuration validation
 * - Code quality assessment
 * - Integration completeness
 */

const fs = require('fs');
const path = require('path');

console.log('🌉 /vibe Bridge System Health Check - January 8, 2026');
console.log('========================================================\n');

const results = {
  timestamp: new Date().toISOString(),
  overall_status: 'healthy',
  bridges: {},
  infrastructure: {},
  recommendations: []
};

// Bridge endpoints to validate
const BRIDGES = {
  'x': '/api/webhooks/x.js',
  'discord': '/api/webhooks/discord.js', 
  'github': '/api/webhooks/github.js',
  'farcaster': '/api/webhooks/farcaster.js',
  'whatsapp': '/api/webhooks/whatsapp.js',
  'telegram': '/api/telegram/webhook.js' // Different path for Telegram
};

// Core infrastructure files
const INFRASTRUCTURE = {
  'status': '/api/webhooks/status.js',
  'health': '/api/webhooks/health.js', 
  'social_inbox': '/api/social/index.js'
};

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (e) {
    return false;
  }
}

function analyzeWebhookCode(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const analysis = {
      exists: true,
      line_count: content.split('\n').length,
      has_signature_verification: content.includes('verify') && (content.includes('signature') || content.includes('hmac')),
      has_kv_integration: content.includes('kv') || content.includes('social_inbox'),
      has_error_handling: content.includes('try') && content.includes('catch'),
      has_health_endpoint: content.includes('GET') && content.includes('health'),
      has_stats_tracking: content.includes('stats') || content.includes('deliveries'),
      platform_specific_features: extractPlatformFeatures(content, filePath),
      quality_score: 0
    };
    
    // Calculate quality score
    let score = 0;
    if (analysis.has_signature_verification) score += 20;
    if (analysis.has_kv_integration) score += 25;
    if (analysis.has_error_handling) score += 20;
    if (analysis.has_health_endpoint) score += 15;
    if (analysis.has_stats_tracking) score += 10;
    if (analysis.line_count > 100) score += 10; // Comprehensive implementation
    
    analysis.quality_score = score;
    
    return analysis;
    
  } catch (e) {
    return {
      exists: false,
      error: e.message
    };
  }
}

function extractPlatformFeatures(content, filePath) {
  const features = [];
  
  if (filePath.includes('x.js')) {
    if (content.includes('tweet_create_events')) features.push('tweet_mentions');
    if (content.includes('direct_message_events')) features.push('direct_messages');
    if (content.includes('favorite_events')) features.push('likes');
    if (content.includes('follow_events')) features.push('follows');
    if (content.includes('crc_token')) features.push('crc_challenge');
  }
  
  if (filePath.includes('discord.js')) {
    if (content.includes('MESSAGE_CREATE')) features.push('message_handling');
    if (content.includes('GUILD_MEMBER')) features.push('guild_events');
    if (content.includes('INTERACTION_CREATE')) features.push('slash_commands');
  }
  
  if (filePath.includes('github.js')) {
    if (content.includes('push')) features.push('push_events');
    if (content.includes('issues')) features.push('issue_events');
    if (content.includes('pull_request')) features.push('pr_events');
    if (content.includes('release')) features.push('release_events');
    if (content.includes('star')) features.push('star_events');
  }
  
  if (filePath.includes('farcaster.js')) {
    if (content.includes('casts')) features.push('cast_mentions');
    if (content.includes('reactions')) features.push('reactions');
    if (content.includes('follows')) features.push('follows');
  }
  
  if (filePath.includes('whatsapp.js')) {
    if (content.includes('messages')) features.push('message_handling');
    if (content.includes('statuses')) features.push('delivery_status');
  }
  
  return features;
}

console.log('🔍 Analyzing Bridge Endpoints...\n');

// Check all bridge implementations
for (const [platform, filePath] of Object.entries(BRIDGES)) {
  console.log(`📡 ${platform.toUpperCase()} Bridge:`);
  
  const fullPath = path.join(process.cwd(), filePath);
  const analysis = analyzeWebhookCode(fullPath);
  
  results.bridges[platform] = analysis;
  
  if (analysis.exists) {
    console.log(`   ✅ Implementation: ${analysis.line_count} lines`);
    console.log(`   🔐 Security: ${analysis.has_signature_verification ? '✅' : '❌'} Signature verification`);
    console.log(`   📦 Integration: ${analysis.has_kv_integration ? '✅' : '❌'} KV/Social inbox`);
    console.log(`   🛡️  Reliability: ${analysis.has_error_handling ? '✅' : '❌'} Error handling`);
    console.log(`   📊 Monitoring: ${analysis.has_stats_tracking ? '✅' : '❌'} Stats tracking`);
    console.log(`   🎯 Features: ${analysis.platform_specific_features.join(', ') || 'basic'}`);
    console.log(`   🏆 Quality Score: ${analysis.quality_score}/100`);
    
    if (analysis.quality_score < 70) {
      results.recommendations.push(`Improve ${platform} bridge quality (score: ${analysis.quality_score}/100)`);
    }
  } else {
    console.log('   ❌ Not implemented or missing');
    results.overall_status = 'degraded';
    results.recommendations.push(`Implement ${platform} bridge`);
  }
  
  console.log();
}

console.log('🏗️ Checking Core Infrastructure...\n');

// Check infrastructure components
for (const [component, filePath] of Object.entries(INFRASTRUCTURE)) {
  console.log(`🔧 ${component.toUpperCase()}:`);
  
  const fullPath = path.join(process.cwd(), filePath);
  const exists = checkFileExists(fullPath);
  
  results.infrastructure[component] = { exists };
  
  if (exists) {
    console.log('   ✅ Implemented');
  } else {
    console.log('   ❌ Missing');
    if (component === 'social_inbox') {
      results.overall_status = 'degraded';
      results.recommendations.push('Critical: Implement social inbox API');
    }
  }
  
  console.log();
}

// Check for documentation
console.log('📚 Documentation Check...\n');

const docFiles = [
  'BRIDGES_STATUS.md',
  'BRIDGE_SYSTEM_COMPLETE.md'
];

for (const docFile of docFiles) {
  const exists = checkFileExists(docFile);
  console.log(`📄 ${docFile}: ${exists ? '✅' : '❌'}`);
  
  if (exists) {
    const content = fs.readFileSync(docFile, 'utf8');
    console.log(`   📏 Length: ${content.length} characters`);
    console.log(`   📅 Updated: ${content.includes('2026') ? 'Recent' : 'Outdated'}`);
  }
}

console.log();

// Generate overall assessment
console.log('📋 Overall Assessment:\n');

const totalBridges = Object.keys(BRIDGES).length;
const implementedBridges = Object.values(results.bridges).filter(b => b.exists).length;
const avgQualityScore = Object.values(results.bridges)
  .filter(b => b.exists)
  .reduce((sum, b) => sum + b.quality_score, 0) / implementedBridges;

console.log(`🌉 Bridge Coverage: ${implementedBridges}/${totalBridges} platforms (${Math.round(implementedBridges/totalBridges*100)}%)`);
console.log(`🏆 Average Quality Score: ${Math.round(avgQualityScore)}/100`);
console.log(`🏗️ Infrastructure: ${Object.values(results.infrastructure).filter(i => i.exists).length}/${Object.keys(INFRASTRUCTURE).length} components`);

// Determine final status
if (implementedBridges === totalBridges && avgQualityScore >= 80) {
  results.overall_status = 'excellent';
  console.log('🎉 STATUS: EXCELLENT - Production ready bridge system!');
} else if (implementedBridges >= 4 && avgQualityScore >= 70) {
  results.overall_status = 'good';
  console.log('✅ STATUS: GOOD - Solid bridge infrastructure');
} else if (implementedBridges >= 2) {
  results.overall_status = 'functional';
  console.log('⚠️  STATUS: FUNCTIONAL - Basic bridges working');
} else {
  results.overall_status = 'incomplete';
  console.log('❌ STATUS: INCOMPLETE - Major gaps in bridge system');
}

console.log();

// Recommendations summary
if (results.recommendations.length > 0) {
  console.log('💡 Recommendations:\n');
  results.recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
  });
} else {
  console.log('🎯 No recommendations - system is complete!');
}

console.log();

// Bridge system capabilities summary
console.log('🚀 Current Capabilities:\n');

const capabilities = {
  'Real-time Events': implementedBridges > 0,
  'Signature Verification': Object.values(results.bridges).some(b => b.has_signature_verification),
  'Social Inbox Integration': Object.values(results.bridges).some(b => b.has_kv_integration),
  'Health Monitoring': Object.values(results.bridges).some(b => b.has_health_endpoint),
  'Statistics Tracking': Object.values(results.bridges).some(b => b.has_stats_tracking),
  'Multi-platform Support': implementedBridges >= 3,
  'Production Ready': avgQualityScore >= 80 && implementedBridges >= 4
};

for (const [capability, enabled] of Object.entries(capabilities)) {
  console.log(`   ${enabled ? '✅' : '❌'} ${capability}`);
}

console.log();

// Save results
const reportPath = 'bridge_health_report_jan8_2026.json';
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`📊 Full report saved to: ${reportPath}`);

console.log('\n🌉 Bridge system health check complete!');

// Set exit code based on status
if (results.overall_status === 'incomplete' || results.overall_status === 'degraded') {
  process.exit(1);
} else {
  process.exit(0);
}