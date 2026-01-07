#!/usr/bin/env node

/**
 * Test the enhanced gamification system
 */

const { main } = require('./enhanced-runner.js');

async function test() {
  console.log('🧪 Testing enhanced /vibe gamification system...\n');
  
  try {
    const result = await main();
    console.log('\n✅ Enhanced test completed successfully!');
    console.log('Final stats:', result);
  } catch (error) {
    console.error('❌ Enhanced test failed:', error);
  }
}

test();