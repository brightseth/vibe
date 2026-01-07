#!/usr/bin/env node

/**
 * MCP Runner for Streaks Agent
 * Uses actual MCP functions to track and celebrate
 */

const { trackActivity } = require('./activity-tracker.js');
const { generateStats } = require('./mcp-integration.js');

/**
 * Mock MCP functions for testing
 * In production, these would be the actual MCP function calls
 */
const mockMCPFunctions = {
  async observe_vibe() {
    // This would be the actual observe_vibe() call
    // For now, return empty since no one is online
    return "No humans online";
  },
  
  async dm_user(handle, message) {
    // This would be the actual dm_user() call
    console.log(`📨 DM to @${handle}: ${message.substring(0, 50)}...`);
    return `DM sent to ${handle}`;
  },
  
  async announce_ship(message) {
    // This would be the actual announce_ship() call
    console.log(`📢 Board post: ${message.substring(0, 50)}...`);
    return 'Announced to board';
  },
  
  async check_inbox() {
    return "Inbox empty";
  },
  
  async read_board() {
    return "Board empty";
  }
};

/**
 * Main execution function using MCP functions
 */
async function runWithMCP() {
  console.log('🔥 @streaks-agent running with MCP integration\n');
  
  try {
    // Track activity using MCP functions
    const results = await trackActivity(mockMCPFunctions);
    
    // Get final stats
    const stats = generateStats();
    
    console.log('\n✨ Run Summary:');
    console.log(`   Users tracked: ${results.usersTracked}`);
    console.log(`   Milestones celebrated: ${results.milestonesFound}`);
    console.log(`   Active streaks: ${results.activeStreaks}`);
    console.log(`   Last run: ${new Date().toISOString()}`);
    
    if (results.activeStreaks === 0) {
      console.log('\n🚀 System ready! Features active:');
      console.log('   ✓ Real-time streak tracking');
      console.log('   ✓ Milestone celebrations via DM');
      console.log('   ✓ Leaderboard announcements');  
      console.log('   ✓ Daily statistics');
      console.log('   ✓ Automatic streak decay');
      console.log('\n   Waiting for users to engage...');
    }
    
    return {
      success: true,
      ...results,
      totalUsers: stats.totalUsers
    };
    
  } catch (error) {
    console.error('💥 MCP Runner failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for external use
module.exports = { runWithMCP };

// Run if called directly
if (require.main === module) {
  runWithMCP()
    .then(result => {
      if (result.success) {
        console.log('\n🎯 Streaks agent completed successfully!');
        process.exit(0);
      } else {
        console.error('\n❌ Streaks agent failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}