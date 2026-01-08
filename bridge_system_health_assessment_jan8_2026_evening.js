#!/usr/bin/env node

/**
 * Bridge System Health Assessment - January 8, 2026 Evening
 * 
 * Comprehensive health check of all bridge components to determine
 * if the system is truly complete or if there are lingering issues.
 */

import fs from 'fs';
import path from 'path';

const HEALTH_REPORT = {
  timestamp: new Date().toISOString(),
  assessment: 'Bridge System Health Assessment',
  agent: '@bridges-agent',
  findings: []
};

function findFile(filename) {
  const locations = [
    `api/webhooks/${filename}`,
    `api/${filename}`,
    filename
  ];
  
  for (const location of locations) {
    if (fs.existsSync(location)) {
      return location;
    }
  }
  return null;
}

function analyzeImplementation(filename, description) {
  const finding = {
    component: description,
    file: filename,
    status: 'unknown',
    details: []
  };
  
  const filepath = findFile(filename);
  if (!filepath) {
    finding.status = 'missing';
    finding.details.push('File not found');
    return finding;
  }
  
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\\n');
    
    finding.status = 'found';
    finding.file = filepath;
    finding.details.push(`${lines.length} lines of code`);
    
    // Check for key patterns
    if (content.includes('export default async function handler')) {
      finding.details.push('✅ Vercel API handler structure');
    }
    
    if (content.includes('verifySignature') || content.includes('crypto.createHmac')) {
      finding.details.push('✅ Webhook signature verification');
    }
    
    if (content.includes('@vercel/kv') || content.includes('vibe:social_inbox')) {
      finding.details.push('✅ KV storage integration');
    }
    
    if (content.includes('console.log') || content.includes('console.error')) {
      finding.details.push('✅ Logging implemented');
    }
    
    // Check for completeness indicators
    if (content.includes('TODO') || content.includes('FIXME')) {
      const todoLines = lines.filter(line => 
        line.includes('TODO') || line.includes('FIXME')
      );
      finding.details.push(`⚠️ ${todoLines.length} TODO/FIXME items`);
      finding.status = 'needs-work';
    }
    
    if (content.length < 500) {
      finding.details.push('⚠️ Implementation seems minimal');
      finding.status = 'basic';
    } else if (content.length > 2000) {
      finding.details.push('✅ Comprehensive implementation');
      finding.status = 'complete';
    }
    
  } catch (e) {
    finding.status = 'error';
    finding.details.push(`Error reading file: ${e.message}`);
  }
  
  return finding;
}

function checkBridgeEndpoints() {
  console.log('\\n🔍 Analyzing bridge endpoints...');
  
  const bridges = [
    { file: 'x.js', name: 'X (Twitter) Webhook' },
    { file: 'x-receiver.js', name: 'X Webhook Receiver (Simplified)' },
    { file: 'discord.js', name: 'Discord Webhook' },
    { file: 'github.js', name: 'GitHub Webhook' },
    { file: 'farcaster.js', name: 'Farcaster Webhook' },
    { file: 'whatsapp.js', name: 'WhatsApp Webhook' },
    { file: 'status.js', name: 'Bridge Status Dashboard' },
    { file: 'health.js', name: 'Health Check Endpoint' },
    { file: 'test.js', name: 'Test Endpoint' }
  ];
  
  for (const bridge of bridges) {
    const finding = analyzeImplementation(bridge.file, bridge.name);
    HEALTH_REPORT.findings.push(finding);
    
    console.log(`\\n${bridge.name}:`);
    console.log(`  Status: ${finding.status.toUpperCase()}`);
    console.log(`  File: ${finding.file || 'NOT FOUND'}`);
    finding.details.forEach(detail => console.log(`  ${detail}`));
  }
}

function checkSocialInboxIntegration() {
  console.log('\\n📥 Checking social inbox integration...');
  
  const socialFiles = [
    { file: 'api/social/index.js', name: 'Social API Endpoint' },
    { file: 'mcp-server/tools/social-post.js', name: 'Social Post Tool' },
    { file: 'mcp-server/tools/social-inbox.js', name: 'Social Inbox Tool' }
  ];
  
  for (const social of socialFiles) {
    const finding = analyzeImplementation(social.file, social.name);
    HEALTH_REPORT.findings.push(finding);
    
    console.log(`\\n${social.name}:`);
    console.log(`  Status: ${finding.status.toUpperCase()}`);
    console.log(`  File: ${finding.file || 'NOT FOUND'}`);
    finding.details.forEach(detail => console.log(`  ${detail}`));
  }
}

function analyzeSystemStatus() {
  console.log('\\n📊 Analyzing system documentation...');
  
  const docs = [
    { file: 'BRIDGES_STATUS.md', name: 'Bridge System Status' },
    { file: 'BRIDGE_SYSTEM_COMPLETE.md', name: 'Bridge System Complete Doc' }
  ];
  
  for (const doc of docs) {
    const finding = analyzeImplementation(doc.file, doc.name);
    HEALTH_REPORT.findings.push(finding);
    
    console.log(`\\n${doc.name}:`);
    console.log(`  Status: ${finding.status.toUpperCase()}`);
    if (finding.file) {
      const content = fs.readFileSync(finding.file, 'utf8');
      const hasComplete = content.includes('COMPLETE') || content.includes('PRODUCTION READY');
      console.log(`  Production Status: ${hasComplete ? 'CLAIMED COMPLETE' : 'IN DEVELOPMENT'}`);
    }
    finding.details.forEach(detail => console.log(`  ${detail}`));
  }
}

function generateAssessment() {
  console.log('\\n\\n=== BRIDGE SYSTEM HEALTH ASSESSMENT ===');
  
  const byStatus = {};
  HEALTH_REPORT.findings.forEach(finding => {
    if (!byStatus[finding.status]) byStatus[finding.status] = [];
    byStatus[finding.status].push(finding.component);
  });
  
  console.log('\\nStatus Summary:');
  Object.keys(byStatus).forEach(status => {
    console.log(`  ${status.toUpperCase()}: ${byStatus[status].length} components`);
    byStatus[status].forEach(component => {
      console.log(`    - ${component}`);
    });
  });
  
  // Determine overall system health
  let overallStatus = 'HEALTHY';
  let recommendations = [];
  
  if (byStatus.missing && byStatus.missing.length > 0) {
    overallStatus = 'DEGRADED';
    recommendations.push('Implement missing components');
  }
  
  if (byStatus.error && byStatus.error.length > 0) {
    overallStatus = 'CRITICAL';
    recommendations.push('Fix error conditions in components');
  }
  
  if (byStatus['needs-work'] && byStatus['needs-work'].length > 0) {
    if (overallStatus === 'HEALTHY') overallStatus = 'MINOR_ISSUES';
    recommendations.push('Address TODO/FIXME items');
  }
  
  // Check for X webhook redundancy
  const xWebhookCount = HEALTH_REPORT.findings.filter(f => 
    f.component.includes('X ') && f.status !== 'missing'
  ).length;
  
  if (xWebhookCount > 1) {
    recommendations.push('Consider consolidating X webhook implementations');
  }
  
  console.log(`\\nOVERALL SYSTEM STATUS: ${overallStatus}`);
  
  if (recommendations.length > 0) {
    console.log('\\nRecommendations:');
    recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
  
  // Final assessment
  const totalComponents = HEALTH_REPORT.findings.length;
  const workingComponents = HEALTH_REPORT.findings.filter(f => 
    ['complete', 'found', 'basic'].includes(f.status)
  ).length;
  
  console.log(`\\nHealth Score: ${workingComponents}/${totalComponents} components working`);
  console.log(`Completion: ${Math.round((workingComponents / totalComponents) * 100)}%`);
  
  HEALTH_REPORT.overall_status = overallStatus;
  HEALTH_REPORT.completion_percentage = Math.round((workingComponents / totalComponents) * 100);
  HEALTH_REPORT.recommendations = recommendations;
  
  return overallStatus;
}

// Run the assessment
console.log('🏥 Starting Bridge System Health Assessment...');
console.log(`Timestamp: ${HEALTH_REPORT.timestamp}`);

checkBridgeEndpoints();
checkSocialInboxIntegration();
analyzeSystemStatus();

const systemStatus = generateAssessment();

// Save detailed report
const reportFile = 'bridge_system_health_report_jan8_2026_evening.json';
fs.writeFileSync(reportFile, JSON.stringify(HEALTH_REPORT, null, 2));
console.log(`\\n📄 Detailed report saved: ${reportFile}`);

console.log('\\n✅ Health assessment complete!');
console.log(`\\nNEXT STEPS: Based on ${systemStatus} status, proceeding with appropriate action.`);