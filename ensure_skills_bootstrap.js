#!/usr/bin/env node

/**
 * Ensure Skills Exchange is bootstrapped
 * Run this to populate the marketplace if it's empty
 */

const { bootstrapSkillsExchange } = require('./bootstrap-skills-exchange.js');

console.log('🔍 Checking Skills Exchange marketplace...\n');

try {
  // This will only bootstrap if the file is empty
  bootstrapSkillsExchange();
  
  console.log('✅ Skills Exchange marketplace ready!\n');
  console.log('📊 Run dashboard: node skills-exchange-dashboard.js');
  
} catch (error) {
  console.error('❌ Failed to ensure bootstrap:', error.message);
  process.exit(1);
}