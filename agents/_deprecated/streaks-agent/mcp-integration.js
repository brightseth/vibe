#!/usr/bin/env node

/**
 * @streaks-agent MCP Integration
 * 
 * Connects the streak tracking system with MCP functions
 * to observe vibe, update streaks, and celebrate milestones
 */

const fs = require('fs');
const path = require('path');

// Import our streak system
const {
  updateStreaks,
  celebrateMilestones,
  generateStats,
  loadStreaks,
  saveStreaks,
  MILESTONES
} = require('./index.js');

/**
 * Get online users and update their streaks
 */
async function trackOnlineUsers() {
  const streaks = loadStreaks();
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();
  
  // Initialize daily stats if needed
  if (!streaks.dailyStats[today]) {
    streaks.dailyStats[today] = {
      totalUsers: Object.keys(streaks.users).length,
      activeUsers: 0,
      newUsers: 0
    };
  }
  
  // For now, we'll track activity when people show up
  // This will be enhanced when we get actual online user data
  
  streaks.lastUpdate = now;
  saveStreaks(streaks);
  
  return streaks;
}

/**
 * Update streak for a specific user (called by MCP functions)
 */
function updateUserStreak(handle, action = 'active') {
  const streaks = loadStreaks();
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();
  
  console.log(`🔥 Updating streak for @${handle} (${action})`);
  
  if (!streaks.users[handle]) {
    streaks.users[handle] = {
      current: 0,
      longest: 0,
      lastActive: null,
      firstSeen: today
    };
    
    if (!streaks.dailyStats[today]) {
      streaks.dailyStats[today] = {
        totalUsers: Object.keys(streaks.users).length,
        activeUsers: 0,
        newUsers: 0
      };
    }
    streaks.dailyStats[today].newUsers++;
  }
  
  const user = streaks.users[handle];
  const lastActive = user.lastActive;
  
  if (action === 'reset') {
    user.current = 0;
    console.log(`💔 ${handle}: streak reset`);
  } else if (action === 'active') {
    // Check if this is a new day of activity
    if (lastActive !== today) {
      // Check if streak continues (yesterday -> today)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastActive === yesterdayStr) {
        // Streak continues!
        user.current++;
        console.log(`🔥 ${handle}: streak continues! Now ${user.current} days`);
      } else if (lastActive === null) {
        // First day
        user.current = 1;
        console.log(`🌱 ${handle}: starting their streak! Day 1`);
      } else {
        // Streak broken, reset
        user.current = 1;
        console.log(`🔄 ${handle}: streak reset to 1 day`);
      }
      
      user.lastActive = today;
      user.longest = Math.max(user.longest, user.current);
      
      if (streaks.dailyStats[today]) {
        streaks.dailyStats[today].activeUsers++;
      }
    }
  }
  
  streaks.lastUpdate = now;
  saveStreaks(streaks);
  
  return user;
}

/**
 * Check if user hit a milestone and return celebration info
 */
function checkMilestone(handle) {
  const streaks = loadStreaks();
  const user = streaks.users[handle];
  
  if (!user) return null;
  
  const currentStreak = user.current;
  
  // Check each milestone threshold
  for (const [threshold, celebration] of Object.entries(MILESTONES)) {
    const thresholdNum = parseInt(threshold);
    
    // If user just hit this milestone (current streak equals threshold)
    if (currentStreak === thresholdNum) {
      return {
        milestone: threshold,
        message: celebration.message,
        emoji: celebration.emoji,
        streak: currentStreak
      };
    }
  }
  
  return null;
}

/**
 * Mark milestone as announced to avoid duplicates
 */
function markMilestoneAnnounced(handle, milestone) {
  const MILESTONES_FILE = path.join(__dirname, 'milestones.json');
  
  let milestones = { announced: {} };
  try {
    if (fs.existsSync(MILESTONES_FILE)) {
      const data = fs.readFileSync(MILESTONES_FILE, 'utf8');
      milestones = JSON.parse(data);
    }
  } catch (e) {
    console.log('Creating new milestones file');
  }
  
  const milestoneKey = `${handle}:${milestone}`;
  milestones.announced[milestoneKey] = Date.now();
  
  try {
    fs.writeFileSync(MILESTONES_FILE, JSON.stringify(milestones, null, 2));
  } catch (e) {
    console.error('Failed to save milestones:', e);
  }
}

/**
 * Check if milestone was already announced
 */
function wasMilestoneAnnounced(handle, milestone) {
  const MILESTONES_FILE = path.join(__dirname, 'milestones.json');
  
  try {
    if (fs.existsSync(MILESTONES_FILE)) {
      const data = fs.readFileSync(MILESTONES_FILE, 'utf8');
      const milestones = JSON.parse(data);
      const milestoneKey = `${handle}:${milestone}`;
      return !!milestones.announced[milestoneKey];
    }
  } catch (e) {
    // File doesn't exist or is corrupted, assume not announced
  }
  
  return false;
}

/**
 * Generate leaderboard of current streaks
 */
function generateLeaderboard(limit = 5) {
  const streaks = loadStreaks();
  
  const activeStreaks = Object.entries(streaks.users)
    .filter(([handle, user]) => user.current > 0)
    .sort(([, a], [, b]) => b.current - a.current)
    .slice(0, limit);
  
  return activeStreaks.map(([handle, user], index) => ({
    rank: index + 1,
    handle: handle,
    streak: user.current,
    longest: user.longest
  }));
}

module.exports = {
  trackOnlineUsers,
  updateUserStreak,
  checkMilestone,
  markMilestoneAnnounced,
  wasMilestoneAnnounced,
  generateLeaderboard,
  generateStats,
  loadStreaks
};