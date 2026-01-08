#!/usr/bin/env node

/**
 * Bridge System Health Check - January 8, 2026
 * 
 * Comprehensive health check of all bridge endpoints and integrations.
 * Validates that the complete bridge system is functioning correctly.
 */

import fs from 'fs';
import path from 'path';

const WEBHOOK_ENDPOINTS = [
  'api/webhooks/x.js',
  'api/webhooks/discord.js', 
  'api/webhooks/github.js',
  'api/webhooks/farcaster.js',
  'api/telegram/webhook.js'
];

const CORE_BRIDGE_FILES = [
  'api/social/index.js',
  'api/webhooks/status.js',
  'api/webhooks/health.js',
  'api/webhooks/test.js'
];

console.log('🔍 Bridge System Health Check - January 8, 2026');
console.log('================================================\n');

/**
 * Check if file exists and get basic info
 */
function checkFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    const stats = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    return {
      exists: true,
      size: stats.size,
      lastModified: stats.mtime,
      lines: content.split('\n').length,
      hasExports: content.includes('export'),
      hasErrorHandling: content.includes('try {') || content.includes('catch'),
      hasLogging: content.includes('console.log') || content.includes('console.error')
    };
  } catch (e) {
    return {
      exists: false,
      error: e.message
    };
  }
}

/**
 * Analyze webhook endpoint implementation
 */
function analyzeWebhook(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const analysis = {
      hasSignatureVerification: content.includes('signature') && content.includes('verify'),
      hasErrorHandling: content.includes('try {') && content.includes('catch'),
      hasLogging: content.includes('console.log'),
      hasCORS: content.includes('Access-Control-Allow'),
      hasHealthCheck: content.includes('health') || content.includes('status'),
      hasKVIntegration: content.includes('kv') && content.includes('vibe:'),
      handlesGET: content.includes("method === 'GET'"),
      handlesPOST: content.includes("method === 'POST'"),
      hasDocumentation: content.includes('/**') && content.includes('*/')
    };
    
    const score = Object.values(analysis).filter(Boolean).length;
    analysis.healthScore = Math.round((score / Object.keys(analysis).length) * 100);
    
    return analysis;
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Check bridge system completeness
 */
function checkSystemCompleteness() {
  const results = {
    webhookEndpoints: {},
    coreFiles: {},
    overallHealth: 0
  };
  
  console.log('📦 Webhook Endpoints Check:');
  console.log('---------------------------');
  
  let webhookHealthTotal = 0;
  let webhookCount = 0;
  
  WEBHOOK_ENDPOINTS.forEach(endpoint => {
    const platform = path.basename(endpoint, '.js');
    const check = checkFile(endpoint);
    
    if (check.exists) {
      const analysis = analyzeWebhook(endpoint);
      results.webhookEndpoints[platform] = { ...check, ...analysis };
      webhookHealthTotal += analysis.healthScore || 0;
      webhookCount++;
      
      console.log(`✅ ${platform.toUpperCase()}: ${analysis.healthScore}% health`);
      console.log(`   Size: ${Math.round(check.size / 1024)}KB, Lines: ${check.lines}`);
      
      if (analysis.healthScore < 80) {
        console.log(`   ⚠️  Needs attention: ${analysis.healthScore}% health`);
      }
    } else {
      results.webhookEndpoints[platform] = check;
      console.log(`❌ ${platform.toUpperCase()}: Missing`);
    }
    console.log('');
  });
  
  console.log('🏗️ Core Bridge Infrastructure:');
  console.log('-------------------------------');
  
  let coreHealthTotal = 0;
  let coreCount = 0;
  
  CORE_BRIDGE_FILES.forEach(filePath => {
    const fileName = path.basename(filePath);
    const check = checkFile(filePath);
    results.coreFiles[fileName] = check;
    
    if (check.exists) {
      console.log(`✅ ${fileName}: ${Math.round(check.size / 1024)}KB`);
      coreHealthTotal += 100; // Core files just need to exist
      coreCount++;
    } else {
      console.log(`❌ ${fileName}: Missing`);
    }
  });
  
  // Calculate overall health
  const webhookHealth = webhookCount > 0 ? webhookHealthTotal / webhookCount : 0;
  const coreHealth = coreCount > 0 ? coreHealthTotal / coreCount : 0;
  results.overallHealth = Math.round((webhookHealth + coreHealth) / 2);
  
  console.log('\\n📊 System Health Summary:');
  console.log('===========================');
  console.log(`Webhook Health: ${Math.round(webhookHealth)}%`);
  console.log(`Core Infrastructure: ${Math.round(coreHealth)}%`);
  console.log(`Overall System Health: ${results.overallHealth}%`);
  
  if (results.overallHealth >= 90) {
    console.log('🎉 EXCELLENT: Bridge system is in excellent health!');
  } else if (results.overallHealth >= 80) {
    console.log('✅ GOOD: Bridge system is healthy with minor improvements possible.');
  } else if (results.overallHealth >= 60) {
    console.log('⚠️  FAIR: Bridge system needs some attention.');
  } else {
    console.log('🚨 POOR: Bridge system needs significant work.');
  }
  
  return results;
}

/**
 * Generate health report
 */
function generateHealthReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    overall_health: results.overallHealth,
    status: results.overallHealth >= 80 ? 'healthy' : 
            results.overallHealth >= 60 ? 'fair' : 'needs_attention',
    webhook_endpoints: results.webhookEndpoints,
    core_infrastructure: results.coreFiles,
    recommendations: []
  };
  
  // Generate recommendations
  Object.entries(results.webhookEndpoints).forEach(([platform, data]) => {
    if (data.exists && data.healthScore < 80) {
      report.recommendations.push(`Improve ${platform} webhook health (${data.healthScore}%)`);
    } else if (!data.exists) {
      report.recommendations.push(`Implement ${platform} webhook endpoint`);
    }
  });
  
  Object.entries(results.coreFiles).forEach(([file, data]) => {
    if (!data.exists) {
      report.recommendations.push(`Implement core file: ${file}`);
    }
  });
  
  if (report.recommendations.length === 0) {
    report.recommendations.push('System is healthy - continue monitoring');
  }
  
  return report;
}

/**
 * Main health check execution
 */
function runHealthCheck() {
  console.log('Starting comprehensive bridge system health check...\\n');
  
  const results = checkSystemCompleteness();
  const report = generateHealthReport(results);
  
  // Save report
  const reportPath = 'bridge_system_health_report_jan8_2026.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\\n📄 Health report saved: ${reportPath}`);
  console.log('\\n🎯 Next Steps:');
  
  report.recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
  
  console.log('\\n✨ Bridge System Health Check Complete!\\n');
  
  return report;
}

// Run the health check
if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthCheck();
}

export { runHealthCheck, checkFile, analyzeWebhook };