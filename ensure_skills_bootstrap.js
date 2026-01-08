#!/usr/bin/env node

/**
 * Ensure Skills Exchange is bootstrapped with sample data
 */

const { bootstrapSkillsExchange } = require('./bootstrap-skills-exchange.js');

console.log('🔍 Checking Skills Exchange marketplace...\n');

try {
  // This will only create sample data if none exists
  bootstrapSkillsExchange();
  
  console.log('\n✅ Skills Exchange is ready for users!');
  
} catch (error) {
  console.error('❌ Bootstrap check failed:', error.message);
}