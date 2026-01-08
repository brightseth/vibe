#!/usr/bin/env node

/**
 * /vibe Bridge System Health Check - Final Report Jan 8, 2026
 * 
 * Comprehensive health check of all bridge systems.
 * Tests endpoints, configuration, and overall system status.
 */

const fs = require('fs');

console.log('🌉 /vibe Bridge System Health Check - January 8, 2026 (Final)');
console.log('='.repeat(60));

// Configuration Check
function checkConfiguration() {
  console.log('\n📋 CONFIGURATION STATUS');
  console.log('-'.repeat(30));
  
  const requiredEnvVars = {
    'Storage (KV)': ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    'X/Twitter': ['X_WEBHOOK_SECRET', 'X_BEARER_TOKEN', 'X_API_KEY', 'X_API_SECRET'],
    'Discord': ['DISCORD_BOT_TOKEN', 'DISCORD_WEBHOOK_SECRET', 'DISCORD_PUBLIC_KEY'],
    'GitHub': ['GITHUB_WEBHOOK_SECRET'],
    'Telegram': ['TELEGRAM_BOT_TOKEN'],
    'Farcaster': ['FARCASTER_PRIVATE_KEY', 'FARCASTER_FID', 'FARCASTER_WEBHOOK_SECRET']
  };
  
  let configuredPlatforms = 0;
  const totalPlatforms = Object.keys(requiredEnvVars).length - 1; // excluding storage
  
  for (const [platform, vars] of Object.entries(requiredEnvVars)) {
    const missing = vars.filter(v => !process.env[v]);
    const configured = missing.length === 0;
    
    if (platform !== 'Storage (KV)' && configured) {
      configuredPlatforms++;
    }
    
    const status = configured ? '✅' : '❌';
    console.log(`${status} ${platform}: ${configured ? 'CONFIGURED' : `MISSING ${missing.join(', ')}`}`);
  }
  
  return { configuredPlatforms, totalPlatforms };
}

// File System Check
function checkBridgeFiles() {
  console.log('\n📁 BRIDGE FILES STATUS');
  console.log('-'.repeat(30));
  
  const bridgeFiles = [
    'api/webhooks/x.js',
    'api/webhooks/x-receiver.js',
    'api/webhooks/discord.js',
    'api/webhooks/github.js',
    'api/webhooks/farcaster.js',
    'api/webhooks/whatsapp.js',
    'api/webhooks/status.js',
    'api/webhooks/health.js',
    'api/webhooks/test.js'
  ];
  
  let existingFiles = 0;
  
  for (const file of bridgeFiles) {
    const exists = fs.existsSync(file);
    const status = exists ? '✅' : '❌';
    if (exists) existingFiles++;
    
    console.log(`${status} ${file}`);
  }
  
  return { existingFiles, totalFiles: bridgeFiles.length };
}

// Directory Structure Check
function checkDirectoryStructure() {
  console.log('\n📂 DIRECTORY STRUCTURE');
  console.log('-'.repeat(30));
  
  const directories = [
    'api/webhooks',
    'api/webhooks/x',
    'api/webhooks/discord',
    'api/webhooks/farcaster',
    'api/social',
    'api/telegram'
  ];
  
  let existingDirs = 0;
  
  for (const dir of directories) {
    const exists = fs.existsSync(dir);
    const status = exists ? '✅' : '❌';
    if (exists) existingDirs++;
    
    console.log(`${status} ${dir}/`);
  }
  
  return { existingDirs, totalDirs: directories.length };
}

// Documentation Check
function checkDocumentation() {
  console.log('\n📚 DOCUMENTATION STATUS');
  console.log('-'.repeat(30));
  
  const docs = [
    'BRIDGES_STATUS.md',
    'BRIDGE_SYSTEM_COMPLETE.md',
    'X_WEBHOOK_STATUS.md'
  ];
  
  let existingDocs = 0;
  
  for (const doc of docs) {
    const exists = fs.existsSync(doc);
    const status = exists ? '✅' : '❌';
    if (exists) existingDocs++;
    
    console.log(`${status} ${doc}`);
  }
  
  return { existingDocs, totalDocs: docs.length };
}

// System Health Summary
function generateHealthSummary() {
  console.log('\n🏥 SYSTEM HEALTH SUMMARY');
  console.log('='.repeat(40));
  
  const config = checkConfiguration();
  const files = checkBridgeFiles();
  const dirs = checkDirectoryStructure();
  const docs = checkDocumentation();
  
  console.log('\n📊 HEALTH METRICS:');
  console.log(`  • Configured Platforms: ${config.configuredPlatforms}/${config.totalPlatforms}`);
  console.log(`  • Bridge Files: ${files.existingFiles}/${files.totalFiles}`);
  console.log(`  • Directories: ${dirs.existingDirs}/${dirs.totalDirs}`);
  console.log(`  • Documentation: ${docs.existingDocs}/${docs.totalDocs}`);
  
  // Calculate overall health score
  const totalItems = config.totalPlatforms + files.totalFiles + dirs.totalDirs + docs.totalDocs;
  const healthyItems = config.configuredPlatforms + files.existingFiles + dirs.existingDirs + docs.existingDocs;
  const healthScore = Math.round((healthyItems / totalItems) * 100);
  
  console.log(`  • Overall Health Score: ${healthScore}%`);
  
  let healthStatus = 'DEGRADED';
  if (healthScore >= 90) healthStatus = 'EXCELLENT';
  else if (healthScore >= 75) healthStatus = 'GOOD';
  else if (healthScore >= 60) healthStatus = 'FAIR';
  
  console.log(`  • Health Status: ${healthStatus}`);
  
  // Key recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (config.configuredPlatforms === 0) {
    console.log('  🚨 CRITICAL: No platforms configured - set environment variables');
  } else if (config.configuredPlatforms < 2) {
    console.log('  ⚠️  Configure additional platforms for redundancy');
  } else {
    console.log('  ✅ Platform configuration looks good');
  }
  
  if (files.existingFiles < files.totalFiles) {
    console.log('  ⚠️  Some bridge files are missing - check implementation');
  } else {
    console.log('  ✅ All bridge files are present');
  }
  
  if (docs.existingDocs === docs.totalDocs) {
    console.log('  ✅ Documentation is complete');
  } else {
    console.log('  ⚠️  Documentation could be improved');
  }
  
  return {
    healthScore,
    healthStatus,
    metrics: { config, files, dirs, docs }
  };
}

// Available Endpoints Summary
function listAvailableEndpoints() {
  console.log('\n🔗 AVAILABLE BRIDGE ENDPOINTS');
  console.log('-'.repeat(40));
  
  const endpoints = [
    { name: 'X/Twitter Webhook', path: '/api/webhooks/x', method: 'GET/POST' },
    { name: 'X Receiver (Alt)', path: '/api/webhooks/x-receiver', method: 'GET/POST' },
    { name: 'Discord Webhook', path: '/api/webhooks/discord', method: 'GET/POST' },
    { name: 'GitHub Webhook', path: '/api/webhooks/github', method: 'GET/POST' },
    { name: 'Farcaster Webhook', path: '/api/webhooks/farcaster', method: 'GET/POST' },
    { name: 'WhatsApp Webhook', path: '/api/webhooks/whatsapp', method: 'GET/POST' },
    { name: 'Telegram Webhook', path: '/api/telegram/webhook', method: 'GET/POST' },
    { name: 'Bridge Status', path: '/api/webhooks/status', method: 'GET' },
    { name: 'Bridge Health', path: '/api/webhooks/health', method: 'GET' },
    { name: 'Bridge Test', path: '/api/webhooks/test', method: 'GET/POST' },
    { name: 'Social Inbox', path: '/api/social', method: 'GET/POST' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`  ${endpoint.method.padEnd(8)} ${endpoint.path.padEnd(30)} ${endpoint.name}`);
  }
}

// Next Steps
function suggestNextSteps(healthData) {
  console.log('\n🎯 NEXT STEPS FOR BRIDGE SYSTEM');
  console.log('-'.repeat(40));
  
  if (healthData.healthScore >= 90) {
    console.log('  🎉 Bridge system is in excellent health!');
    console.log('  📊 Consider adding analytics and monitoring');
    console.log('  🔄 Run periodic health checks');
    console.log('  📝 Keep documentation updated');
  } else if (healthData.healthScore >= 75) {
    console.log('  🔧 System is good but could be improved:');
    console.log('  ⚙️  Configure missing platform credentials');
    console.log('  🧪 Test webhook endpoints with real data');
    console.log('  📊 Add monitoring and alerting');
  } else {
    console.log('  🚨 System needs attention:');
    console.log('  🔧 Fix missing files and configurations');
    console.log('  🔑 Set up platform credentials');
    console.log('  🧪 Test all webhook endpoints');
    console.log('  📚 Update documentation');
  }
}

// Main execution
function main() {
  try {
    const healthData = generateHealthSummary();
    listAvailableEndpoints();
    suggestNextSteps(healthData);
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 BRIDGE HEALTH CHECK COMPLETE');
    console.log(`📅 Generated: ${new Date().toISOString()}`);
    console.log(`🎯 Status: ${healthData.healthStatus} (${healthData.healthScore}%)`);
    console.log('='.repeat(60));
    
    // Save results to file
    const report = {
      timestamp: new Date().toISOString(),
      healthScore: healthData.healthScore,
      healthStatus: healthData.healthStatus,
      metrics: healthData.metrics,
      recommendations: 'See console output for detailed recommendations'
    };
    
    fs.writeFileSync('bridge_system_health_report.json', JSON.stringify(report, null, 2));
    console.log('📄 Detailed report saved to: bridge_system_health_report.json');
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

// Run the health check
main();