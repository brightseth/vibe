#!/usr/bin/env node

/**
 * Test the streaks system
 */

const { main } = require('./agents/streaks-agent/run.js');

async function test() {
  console.log('🧪 Testing streaks system...\n');
  
  try {
    const result = await main();
    console.log('\n✅ Test completed successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();