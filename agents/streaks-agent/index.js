#!/usr/bin/env node

/**
 * @streaks-agent - The Hype Person for /vibe
 * 
 * Gamify engagement through streak tracking and milestone celebrations.
 * Make people feel good about showing up consistently.
 */

const fs = require('fs');
const path = require('path');

// Streak data persistence
const STREAKS_FILE = path.join(__dirname, 'streaks.json');
const MILESTONES_FILE = path.join(__dirname, 'milestones.json');

// Milestone thresholds (days)
const MILESTONES = {
  3: { message: "Getting started! 🌱", emoji: "🌱" },
  7: { message: "One week strong! 💪", emoji: "💪" },
  14: { message: "Two weeks! You're committed! 🔥", emoji: "🔥" },
  30: { message: "Monthly legend! 🏆", emoji: "🏆" },
  100: { message: "Century club! 👑", emoji: "👑" }
};

/**
 * Load streak data from disk
 */
function loadStreaks() {
  try {
    if (fs.existsSync(STREAKS_FILE)) {
      const data = fs.readFileSync(STREAKS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('No existing streaks found, starting fresh');
  }
  
  return {
    users: {},           // { handle: { current: 5, longest: 10, lastActive: '2025-01-01' } }
    dailyStats: {},      // { '2025-01-01': { totalUsers: 5, newUsers: 2, activeUsers: 3 } }
    lastUpdate: null
  };
}

/**
 * Save streak data to disk
 */
function saveStreaks(data) {
  try {
    fs.writeFileSync(STREAKS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save streaks:', e);
  }
}

/**
 * Load milestone announcements (to avoid duplicate celebrations)
 */
function loadMilestones() {
  try {
    if (fs.existsSync(MILESTONES_FILE)) {
      const data = fs.readFileSync(MILESTONES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('No milestone history found');
  }
  
  return {
    announced: {}  // { 'handle:milestone': timestamp }
  };
}

/**
 * Save milestone announcements
 */
function saveMilestones(data) {
  try {
    fs.writeFileSync(MILESTONES_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save milestones:', e);
  }
}

/**
 * Update streaks based on who's online
 */
async function updateStreaks() {
  const streaks = loadStreaks();
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();
  
  console.log('🔥 Updating streaks for', today);
  
  // Check /vibe for online users (this would normally use the API)
  try {
    // For now, simulate with mock data
    const onlineUsers = []; // Would fetch from observe_vibe()
    
    // Initialize daily stats if needed
    if (!streaks.dailyStats[today]) {
      streaks.dailyStats[today] = {
        totalUsers: Object.keys(streaks.users).length,
        activeUsers: 0,
        newUsers: 0
      };
    }
    
    // Update streaks for active users
    for (const handle of onlineUsers) {
      if (!streaks.users[handle]) {
        streaks.users[handle] = {
          current: 0,
          longest: 0,
          lastActive: null,
          firstSeen: today
        };
        streaks.dailyStats[today].newUsers++;
      }
      
      const user = streaks.users[handle];
      const lastActive = user.lastActive;
      
      // Check if this is a new day of activity
      if (lastActive !== today) {
        // Check if streak continues (yesterday -> today)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastActive === yesterdayStr) {
          // Streak continues!
          user.current++;
        } else if (lastActive === null) {
          // First day
          user.current = 1;
        } else {
          // Streak broken, reset
          user.current = 1;
        }
        
        user.lastActive = today;
        user.longest = Math.max(user.longest, user.current);
        streaks.dailyStats[today].activeUsers++;
        
        console.log(`📊 ${handle}: ${user.current} day streak (longest: ${user.longest})`);
      }
    }
    
    // Check for users who haven't been active (decay streaks)
    for (const [handle, user] of Object.entries(streaks.users)) {
      if (user.lastActive && user.lastActive !== today && user.current > 0) {
        const lastDate = new Date(user.lastActive);
        const daysSince = Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSince > 1) {
          // Streak broken
          user.current = 0;
          console.log(`💔 ${handle}: streak broken after ${daysSince} days`);
        }
      }
    }
    
    streaks.lastUpdate = now;
    saveStreaks(streaks);
    
    return streaks;
    
  } catch (error) {
    console.error('Failed to update streaks:', error);
    return streaks;
  }
}

/**
 * Check for milestone achievements and celebrate
 */
async function celebrateMilestones() {
  const streaks = loadStreaks();
  const milestones = loadMilestones();
  let celebrated = 0;
  
  console.log('🎉 Checking for milestones to celebrate...');
  
  for (const [handle, user] of Object.entries(streaks.users)) {
    const currentStreak = user.current;
    
    // Check each milestone threshold
    for (const [threshold, celebration] of Object.entries(MILESTONES)) {
      const milestoneKey = `${handle}:${threshold}`;
      
      // Only celebrate if:
      // 1. User has reached this milestone
      // 2. We haven't celebrated it before
      if (currentStreak >= parseInt(threshold) && !milestones.announced[milestoneKey]) {
        
        const message = `${celebration.emoji} **${threshold}-Day Streak!** ${celebration.emoji}\n\n${celebration.message}\n\nYou've been active for ${currentStreak} consecutive days. Keep the momentum going! 🚀`;
        
        // Send celebration DM
        try {
          console.log(`🎊 Celebrating ${handle}'s ${threshold}-day milestone!`);
          
          // This would call dm_user function
          // await dmUser(handle, message);
          
          // Mark as announced
          milestones.announced[milestoneKey] = Date.now();
          celebrated++;
          
        } catch (error) {
          console.error(`Failed to celebrate ${handle}'s milestone:`, error);
        }
      }
    }
  }
  
  saveMilestones(milestones);
  console.log(`✨ Celebrated ${celebrated} milestones`);
  return celebrated;
}

/**
 * Generate daily stats summary
 */
function generateStats() {
  const streaks = loadStreaks();
  const today = new Date().toISOString().split('T')[0];
  
  const activeStreaks = Object.values(streaks.users)
    .filter(user => user.current > 0)
    .sort((a, b) => b.current - a.current);
  
  const todayStats = streaks.dailyStats[today] || { activeUsers: 0, newUsers: 0 };
  
  const stats = {
    totalUsers: Object.keys(streaks.users).length,
    activeStreaks: activeStreaks.length,
    longestStreak: activeStreaks.length > 0 ? activeStreaks[0].current : 0,
    todayActive: todayStats.activeUsers,
    newToday: todayStats.newUsers,
    leaderboard: activeStreaks.slice(0, 5).map((user, index) => ({
      rank: index + 1,
      handle: Object.keys(streaks.users).find(h => streaks.users[h] === user),
      streak: user.current
    }))
  };
  
  return stats;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  
  console.log('🔥 @streaks-agent starting up...');
  
  try {
    switch (command) {
      case 'run':
        const streaks = await updateStreaks();
        const celebrated = await celebrateMilestones();
        const stats = generateStats();
        
        console.log('\n📈 Current Stats:');
        console.log(`- Total users tracked: ${stats.totalUsers}`);
        console.log(`- Active streaks: ${stats.activeStreaks}`);
        console.log(`- Longest current streak: ${stats.longestStreak} days`);
        console.log(`- Milestones celebrated: ${celebrated}`);
        
        if (stats.leaderboard.length > 0) {
          console.log('\n🏆 Streak Leaderboard:');
          stats.leaderboard.forEach(entry => {
            console.log(`  ${entry.rank}. ${entry.handle}: ${entry.streak} days`);
          });
        }
        break;
        
      case 'stats':
        const currentStats = generateStats();
        console.log(JSON.stringify(currentStats, null, 2));
        break;
        
      case 'reset':
        const confirm = args[1];
        if (confirm === 'CONFIRM') {
          if (fs.existsSync(STREAKS_FILE)) fs.unlinkSync(STREAKS_FILE);
          if (fs.existsSync(MILESTONES_FILE)) fs.unlinkSync(MILESTONES_FILE);
          console.log('🗑️  All streak data reset');
        } else {
          console.log('To reset all data, run: node index.js reset CONFIRM');
        }
        break;
        
      default:
        console.log('Usage: node index.js [run|stats|reset]');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  updateStreaks,
  celebrateMilestones,
  generateStats,
  loadStreaks,
  saveStreaks,
  MILESTONES
};