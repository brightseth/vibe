#!/usr/bin/env node

/**
 * Run gamification with REAL MCP functions
 */

const { LiveGamificationAgent } = require('./agents/streaks-agent/live-gamification-runner.js');

// These will be the actual MCP functions available in this environment
const realMcpFunctions = {
  observe_vibe: global.observe_vibe,
  get_streaks: global.get_streaks,
  dm_user: global.dm_user,
  celebrate_milestone: global.celebrate_milestone,
  git_status: global.git_status,
  git_commit: global.git_commit,
  announce_ship: global.announce_ship
};

async function main() {
  console.log('🔥 @streaks-agent: LIVE GAMIFICATION TRACKING');
  console.log('='.repeat(55));
  console.log('Time to spread the good vibes! 🎉\n');
  
  const agent = new LiveGamificationAgent(realMcpFunctions);
  
  try {
    const results = await agent.run();
    
    console.log('\n' + '🌟'.repeat(20));
    console.log('🎊 GAMIFICATION MISSION ACCOMPLISHED! 🎊');
    console.log('🌟'.repeat(20));
    
    // Announce our work to the board
    if (results.milestonesAnnounced > 0 || results.achievementsUnlocked > 0) {
      const shipMessage = `🎮 Gamification Update: Celebrated ${results.milestonesAnnounced} milestones and ${results.achievementsUnlocked} achievements for ${results.usersTracked} vibers! The streak game is strong! 🔥`;
      
      await realMcpFunctions.announce_ship({
        what: shipMessage
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('💥 Gamification error:', error);
    throw error;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };