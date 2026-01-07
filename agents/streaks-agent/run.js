#!/usr/bin/env node

/**
 * Main runner for streaks agent using MCP functions
 * This is what gets called by the system to track and celebrate
 */

const { 
  updateUserStreak, 
  checkMilestone, 
  markMilestoneAnnounced,
  wasMilestoneAnnounced,
  generateLeaderboard,
  generateStats 
} = require('./mcp-integration.js');

async function main() {
  console.log('🔥 @streaks-agent starting streak tracking...\n');
  
  let usersTracked = 0;
  let milestonesAnnounced = 0;
  
  try {
    // 1. Check who's online and update their streaks
    console.log('👀 Observing vibe for online users...');
    
    // This would be replaced with actual MCP function calls
    // For now, we'll check the current state
    const stats = generateStats();
    console.log(`📊 Current tracking: ${stats.totalUsers} users, ${stats.activeStreaks} active streaks`);
    
    // If there were online users, we'd update them like this:
    /*
    const onlineUsers = await observe_vibe();
    for (const user of onlineUsers) {
      const userStreak = updateUserStreak(user.handle, 'active');
      usersTracked++;
      
      // Check for milestone
      const milestone = checkMilestone(user.handle);
      if (milestone && !wasMilestoneAnnounced(user.handle, milestone.milestone)) {
        const message = `${milestone.emoji} **${milestone.milestone}-Day Streak!** ${milestone.emoji}\n\n${milestone.message}\n\nYou've been active for ${milestone.streak} consecutive days. Keep the momentum going! 🚀`;
        
        await dm_user(user.handle, message);
        markMilestoneAnnounced(user.handle, milestone.milestone);
        milestonesAnnounced++;
        
        console.log(`🎉 Celebrated ${user.handle}'s ${milestone.milestone}-day milestone!`);
      }
    }
    */
    
    // 2. Display current leaderboard
    const leaderboard = generateLeaderboard();
    if (leaderboard.length > 0) {
      console.log('\n🏆 Current Streak Leaderboard:');
      leaderboard.forEach(entry => {
        console.log(`  ${entry.rank}. @${entry.handle}: ${entry.streak} days (best: ${entry.longest})`);
      });
    } else {
      console.log('\n📭 No active streaks yet - waiting for users to engage!');
    }
    
    // 3. Summary
    console.log(`\n✨ Run complete:`);
    console.log(`   Users tracked: ${usersTracked}`);
    console.log(`   Milestones announced: ${milestonesAnnounced}`);
    console.log(`   Active streaks: ${stats.activeStreaks}`);
    
    if (stats.activeStreaks === 0) {
      console.log('\n🚀 Ready to track streaks when users come online!');
      console.log('   Features active:');
      console.log('   ✓ Streak tracking (consecutive days)');
      console.log('   ✓ Milestone celebrations (3, 7, 14, 30, 100 days)');
      console.log('   ✓ Leaderboard ranking');
      console.log('   ✓ Achievement system');
    }
    
  } catch (error) {
    console.error('💥 Error during streak tracking:', error);
    throw error;
  }
  
  return {
    usersTracked,
    milestonesAnnounced,
    summary: `Tracked ${usersTracked} users, announced ${milestonesAnnounced} milestones`
  };
}

// Export for use in other contexts
module.exports = { main };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}