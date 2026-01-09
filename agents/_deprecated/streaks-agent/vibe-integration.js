#!/usr/bin/env node

/**
 * @streaks-agent integrated with /vibe API
 * 
 * This version uses the actual /vibe functions to track and celebrate streaks
 */

const fs = require('fs');
const path = require('path');

// Import the core streak logic
const streaksCore = require('./index.js');

// Streak data persistence  
const STREAKS_FILE = path.join(__dirname, 'streaks.json');
const MILESTONES_FILE = path.join(__dirname, 'milestones.json');

/**
 * Mock the /vibe API functions for now
 * In a real implementation, these would be imported from the MCP server
 */
const vibeAPI = {
  async observe_vibe() {
    // Mock: return empty for now, but this would check who's online
    return [];
  },
  
  async dm_user(handle, message) {
    console.log(`📱 DM to ${handle}: ${message.slice(0, 50)}...`);
    // Mock: log the DM, but in real implementation this would send
    return { success: true };
  },
  
  async announce_ship(what) {
    console.log(`📋 Board post: ${what}`);
    // Mock: log the announcement
    return { success: true };
  },
  
  async get_streaks() {
    // Return current streak data
    const streaks = streaksCore.loadStreaks();
    return streaks;
  },
  
  async update_streak(handle, action) {
    // Update a specific user's streak
    const streaks = streaksCore.loadStreaks();
    const today = new Date().toISOString().split('T')[0];
    
    if (!streaks.users[handle]) {
      streaks.users[handle] = {
        current: 0,
        longest: 0,
        lastActive: null,
        firstSeen: today
      };
    }
    
    const user = streaks.users[handle];
    
    if (action === 'active') {
      // Mark user as active today
      if (user.lastActive !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (user.lastActive === yesterdayStr || user.lastActive === null) {
          user.current = user.lastActive === null ? 1 : user.current + 1;
        } else {
          user.current = 1; // Streak broken, restart
        }
        
        user.lastActive = today;
        user.longest = Math.max(user.longest, user.current);
      }
    } else if (action === 'reset') {
      user.current = 0;
    }
    
    streaksCore.saveStreaks(streaks);
    return user;
  },
  
  async celebrate_milestone(handle, milestone, message) {
    console.log(`🎉 Celebrating ${handle}'s ${milestone} milestone!`);
    return await this.dm_user(handle, message);
  }
};

/**
 * Track streaks for currently online users
 */
async function trackOnlineUsers() {
  console.log('👀 Observing who\'s online...');
  
  try {
    const onlineUsers = await vibeAPI.observe_vibe();
    const streaks = streaksCore.loadStreaks();
    let updatedUsers = 0;
    
    if (onlineUsers.length === 0) {
      console.log('🏜️  No users online right now');
      return { updatedUsers: 0, streaks };
    }
    
    for (const handle of onlineUsers) {
      console.log(`📊 Updating streak for ${handle}...`);
      await vibeAPI.update_streak(handle, 'active');
      updatedUsers++;
    }
    
    console.log(`✅ Updated streaks for ${updatedUsers} users`);
    return { updatedUsers, streaks: streaksCore.loadStreaks() };
    
  } catch (error) {
    console.error('❌ Failed to track online users:', error);
    return { updatedUsers: 0, streaks: streaksCore.loadStreaks() };
  }
}

/**
 * Check and celebrate milestones
 */
async function checkMilestones() {
  console.log('🎊 Checking for milestones to celebrate...');
  
  const streaks = streaksCore.loadStreaks();
  const milestones = streaksCore.loadMilestones ? streaksCore.loadMilestones() : { announced: {} };
  let celebrated = 0;
  
  for (const [handle, user] of Object.entries(streaks.users)) {
    const currentStreak = user.current;
    
    // Check each milestone threshold
    for (const [threshold, celebration] of Object.entries(streaksCore.MILESTONES)) {
      const milestoneKey = `${handle}:${threshold}`;
      
      // Only celebrate if user reached milestone and we haven't celebrated before
      if (currentStreak >= parseInt(threshold) && !milestones.announced[milestoneKey]) {
        
        const message = `${celebration.emoji} **${threshold}-Day Streak!** ${celebration.emoji}\n\n${celebration.message}\n\nYou've been active for ${currentStreak} consecutive days. Keep the momentum going! 🚀`;
        
        try {
          await vibeAPI.celebrate_milestone(handle, `${threshold}-day`, message);
          milestones.announced[milestoneKey] = Date.now();
          celebrated++;
          
        } catch (error) {
          console.error(`❌ Failed to celebrate ${handle}'s milestone:`, error);
        }
      }
    }
  }
  
  // Save milestone tracking
  if (streaksCore.saveMilestones) {
    streaksCore.saveMilestones(milestones);
  }
  
  console.log(`🎉 Celebrated ${celebrated} milestones`);
  return celebrated;
}

/**
 * Generate and optionally announce daily stats
 */
async function announceStats() {
  const stats = streaksCore.generateStats();
  
  if (stats.activeStreaks === 0) {
    console.log('📊 No active streaks to report');
    return;
  }
  
  const announcement = `📈 **Daily Streak Stats**\n\n` +
    `🔥 ${stats.activeStreaks} active streaks\n` +
    `👑 Longest: ${stats.longestStreak} days\n` +
    `👥 Total tracked: ${stats.totalUsers} users\n\n` +
    `🏆 **Top Streakers:**\n` +
    stats.leaderboard.slice(0, 3).map(entry => 
      `${entry.rank}. ${entry.handle}: ${entry.streak} days`
    ).join('\n');
  
  console.log('\n' + announcement);
  
  // Optionally post to board (uncomment when ready)
  // await vibeAPI.announce_ship(announcement);
}

/**
 * Main execution loop
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'track';
  
  console.log('🔥 @streaks-agent (vibe-integrated) starting up...\n');
  
  try {
    switch (command) {
      case 'track':
        // Full tracking cycle
        const { updatedUsers } = await trackOnlineUsers();
        const celebrated = await checkMilestones();
        await announceStats();
        
        console.log(`\n✨ Summary: Updated ${updatedUsers} streaks, celebrated ${celebrated} milestones`);
        break;
        
      case 'celebrate':
        // Just check for milestones
        const celebratedOnly = await checkMilestones();
        console.log(`🎉 Celebrated ${celebratedOnly} milestones`);
        break;
        
      case 'stats':
        // Just show stats
        await announceStats();
        break;
        
      case 'reset':
        // Reset with confirmation
        if (args[1] === 'CONFIRM') {
          if (fs.existsSync(STREAKS_FILE)) fs.unlinkSync(STREAKS_FILE);
          if (fs.existsSync(MILESTONES_FILE)) fs.unlinkSync(MILESTONES_FILE);
          console.log('🗑️  All streak data reset');
        } else {
          console.log('❓ To reset all data: node vibe-integration.js reset CONFIRM');
        }
        break;
        
      default:
        console.log('Usage: node vibe-integration.js [track|celebrate|stats|reset]');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

// Simulate some users for testing
async function simulate() {
  console.log('🧪 Simulating streak activity...\n');
  
  // Mock some users being active
  const testUsers = ['alice', 'bob', 'charlie'];
  
  for (const user of testUsers) {
    await vibeAPI.update_streak(user, 'active');
  }
  
  // Add some history to make it interesting
  const streaks = streaksCore.loadStreaks();
  
  streaks.users.alice = { current: 7, longest: 10, lastActive: '2025-01-06', firstSeen: '2024-12-30' };
  streaks.users.bob = { current: 3, longest: 5, lastActive: '2025-01-06', firstSeen: '2025-01-04' };
  streaks.users.charlie = { current: 14, longest: 14, lastActive: '2025-01-06', firstSeen: '2024-12-23' };
  
  streaksCore.saveStreaks(streaks);
  
  console.log('📊 Simulated streak data created!');
  
  // Now run the tracking
  await main();
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === 'simulate') {
    simulate();
  } else {
    main();
  }
}

module.exports = {
  trackOnlineUsers,
  checkMilestones,
  announceStats,
  vibeAPI
};