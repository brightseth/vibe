#!/usr/bin/env node

/**
 * Run the live gamification system with MCP functions
 */

const { LiveGamificationAgent } = require('./live-gamification-runner.js');

// Mock MCP functions for testing (in real deployment these would be the actual MCP calls)
const mcpFunctions = {
  async observe_vibe() {
    // In real implementation, this would call the actual MCP function
    // For now, return empty since no one was online in our check
    return "No humans online";
  },
  
  async get_streaks() {
    // Return the actual streak data we saw earlier
    return "@demo_user: 1 days (best: 1)\n@vibe_champion: 1 days (best: 1)";
  },
  
  async dm_user(params) {
    console.log(`📩 Would send DM to @${params.to}:`);
    console.log(`   "${params.message}"`);
    return { status: 'sent' };
  },
  
  async celebrate_milestone(params) {
    console.log(`🎉 Would celebrate milestone for @${params.handle}: ${params.milestone}`);
    console.log(`   Message: "${params.message}"`);
    return { status: 'celebrated' };
  },
  
  async git_status() {
    return "On branch main\nYour branch is up to date with 'origin/main'.\n\nChanges not staged for commit:\n  modified:   agents/streaks-agent/milestones.json";
  },
  
  async git_commit(params) {
    console.log(`📝 Would commit with message: "${params.message}"`);
    return { status: 'committed' };
  }
};

async function main() {
  console.log('🎮 Starting Live Gamification Agent...\n');
  
  const agent = new LiveGamificationAgent(mcpFunctions);
  
  try {
    const results = await agent.run();
    
    console.log('\n✅ Live gamification run completed!');
    console.log('Final stats:', results);
    
  } catch (error) {
    console.error('❌ Live gamification failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };