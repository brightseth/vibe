#!/usr/bin/env node

/**
 * Activity Tracker - Monitors vibe for user engagement
 * Integrates with MCP functions to track streaks in real-time
 */

const { 
  updateUserStreak, 
  checkMilestone, 
  markMilestoneAnnounced,
  wasMilestoneAnnounced,
  generateLeaderboard,
  generateStats 
} = require('./mcp-integration.js');

/**
 * Process online users and update streaks
 */
async function processOnlineUsers(mcpFunctions) {
  console.log('👀 Checking who\'s online...');
  
  try {
    const vibeData = await mcpFunctions.observe_vibe();
    let usersTracked = 0;
    let milestonesFound = 0;
    
    if (!vibeData || vibeData === "No humans online") {
      console.log('📭 No users currently online');
      return { usersTracked, milestonesFound };
    }
    
    // Parse online users (format would depend on actual API response)
    const onlineUsers = Array.isArray(vibeData) ? vibeData : [];
    
    for (const user of onlineUsers) {
      const handle = user.handle || user.name || user;
      
      // Update their streak
      const userStreak = updateUserStreak(handle, 'active');
      usersTracked++;
      
      console.log(`🔥 @${handle}: ${userStreak.current} day streak`);
      
      // Check for milestone achievements
      const milestone = checkMilestone(handle);
      if (milestone && !wasMilestoneAnnounced(handle, milestone.milestone)) {
        
        const celebrationMessage = `${milestone.emoji} **${milestone.milestone}-Day Streak!** ${milestone.emoji}\n\n${milestone.message}\n\nYou've been active for ${milestone.streak} consecutive days. Keep the momentum going! 🚀`;
        
        try {
          // Send DM celebration
          await mcpFunctions.dm_user(handle, celebrationMessage);
          
          // Also announce on board for bigger milestones
          if (parseInt(milestone.milestone) >= 30) {
            await mcpFunctions.announce_ship(`🏆 @${handle} just hit a ${milestone.streak}-day streak! ${milestone.emoji} Legendary consistency!`);
          }
          
          // Mark as announced
          markMilestoneAnnounced(handle, milestone.milestone);
          milestonesFound++;
          
          console.log(`🎉 Celebrated @${handle}'s ${milestone.milestone}-day milestone!`);
          
        } catch (error) {
          console.error(`Failed to celebrate milestone for @${handle}:`, error);
        }
      }
    }
    
    return { usersTracked, milestonesFound };
    
  } catch (error) {
    console.error('Error processing online users:', error);
    return { usersTracked: 0, milestonesFound: 0 };
  }
}

/**
 * Check for streak decay (users who haven't been active)
 */
async function checkStreakDecay() {
  const streaks = require('./mcp-integration.js').loadStreaks();
  const today = new Date().toISOString().split('T')[0];
  let decayedStreaks = 0;
  
  for (const [handle, user] of Object.entries(streaks.users)) {
    if (user.lastActive && user.lastActive !== today && user.current > 0) {
      const lastDate = new Date(user.lastActive);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Grace period of 1 day, then streak breaks
      if (daysSince > 1) {
        updateUserStreak(handle, 'reset');
        decayedStreaks++;
        console.log(`💔 @${handle}'s streak ended after ${daysSince} days away`);
      }
    }
  }
  
  return decayedStreaks;
}

/**
 * Generate and announce daily stats
 */
async function announceStats(mcpFunctions) {
  const stats = generateStats();
  const leaderboard = generateLeaderboard(3);
  
  if (stats.activeStreaks > 0) {
    let message = `📊 **Daily Streak Report**\n\n`;
    message += `🔥 ${stats.activeStreaks} active streaks\n`;
    message += `👥 ${stats.totalUsers} total users tracked\n`;
    message += `🏆 Longest current streak: ${stats.longestStreak} days\n\n`;
    
    if (leaderboard.length > 0) {
      message += `**Top Streakers:**\n`;
      leaderboard.forEach((entry, i) => {
        const medal = ['🥇', '🥈', '🥉'][i] || '🏅';
        message += `${medal} @${entry.handle}: ${entry.streak} days\n`;
      });
    }
    
    message += `\n*Keep the momentum going! Every day counts.* 🚀`;
    
    try {
      await mcpFunctions.announce_ship(message);
      console.log('📢 Posted daily stats to board');
    } catch (error) {
      console.error('Failed to post stats:', error);
    }
  }
}

/**
 * Main tracking workflow
 */
async function trackActivity(mcpFunctions) {
  console.log('🔥 Starting activity tracking...\n');
  
  try {
    // 1. Process online users
    const { usersTracked, milestonesFound } = await processOnlineUsers(mcpFunctions);
    
    // 2. Check for streak decay
    const decayedStreaks = await checkStreakDecay();
    
    // 3. Show current status
    const stats = generateStats();
    const leaderboard = generateLeaderboard();
    
    console.log('\n📈 Current Status:');
    console.log(`- Users tracked today: ${usersTracked}`);
    console.log(`- Milestones celebrated: ${milestonesFound}`);
    console.log(`- Streaks that ended: ${decayedStreaks}`);
    console.log(`- Active streaks: ${stats.activeStreaks}`);
    console.log(`- Total users: ${stats.totalUsers}`);
    
    if (leaderboard.length > 0) {
      console.log('\n🏆 Current Leaders:');
      leaderboard.slice(0, 3).forEach(entry => {
        console.log(`  ${entry.rank}. @${entry.handle}: ${entry.streak} days`);
      });
    }
    
    // 4. Announce daily stats (if significant activity)
    if (stats.activeStreaks >= 2) {
      await announceStats(mcpFunctions);
    }
    
    return {
      usersTracked,
      milestonesFound,
      decayedStreaks,
      activeStreaks: stats.activeStreaks
    };
    
  } catch (error) {
    console.error('💥 Activity tracking failed:', error);
    throw error;
  }
}

module.exports = {
  trackActivity,
  processOnlineUsers,
  checkStreakDecay,
  announceStats
};