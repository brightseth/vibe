/**
 * Achievement system for /vibe gamification
 * Track various types of accomplishments beyond just streaks
 */

// Achievement definitions
const ACHIEVEMENTS = {
  // Streak milestones
  'first_streak': {
    name: 'First Steps',
    description: 'Started your first streak!',
    emoji: '🌱',
    type: 'streak',
    threshold: 1
  },
  'getting_started': {
    name: 'Getting Started',
    description: '3 days of consistency!',
    emoji: '🌱',
    type: 'streak', 
    threshold: 3
  },
  'one_week': {
    name: 'Weekly Warrior',
    description: 'One week strong!',
    emoji: '💪',
    type: 'streak',
    threshold: 7
  },
  'two_weeks': {
    name: 'Committed Viber',
    description: 'Two weeks! You\'re committed!',
    emoji: '🔥',
    type: 'streak',
    threshold: 14
  },
  'monthly_legend': {
    name: 'Monthly Legend',
    description: '30 days of pure dedication!',
    emoji: '🏆',
    type: 'streak',
    threshold: 30
  },
  'century_club': {
    name: 'Century Club',
    description: '100 days! You are legendary!',
    emoji: '👑',
    type: 'streak',
    threshold: 100
  },
  
  // Activity achievements
  'first_message': {
    name: 'Hello World',
    description: 'Sent your first message in /vibe',
    emoji: '👋',
    type: 'activity',
    threshold: 1
  },
  'chatty': {
    name: 'Chatty Vibe',
    description: 'Sent 50 messages',
    emoji: '💬',
    type: 'activity',
    threshold: 50
  },
  'super_chatty': {
    name: 'Super Chatty',
    description: 'Sent 200 messages',
    emoji: '🗣️',
    type: 'activity',
    threshold: 200
  },
  
  // Game achievements
  'first_game': {
    name: 'Game On',
    description: 'Played your first game',
    emoji: '🎮',
    type: 'games',
    threshold: 1
  },
  'gamer': {
    name: 'Dedicated Gamer',
    description: 'Played 25 games',
    emoji: '🏆',
    type: 'games', 
    threshold: 25
  },
  
  // Ship achievements
  'first_ship': {
    name: 'First Voyage',
    description: 'Shipped your first project',
    emoji: '🚢',
    type: 'ships',
    threshold: 1
  },
  'serial_shipper': {
    name: 'Serial Shipper',
    description: 'Shipped 5 projects',
    emoji: '⚡',
    type: 'ships',
    threshold: 5
  }
};

class AchievementSystem {
  constructor() {
    this.userAchievements = {}; // Will load from file
    this.loadAchievements();
  }
  
  loadAchievements() {
    // Load from achievements.json or initialize
    try {
      const fs = require('fs');
      const path = require('path');
      const file = path.join(__dirname, 'achievements.json');
      
      if (fs.existsSync(file)) {
        this.userAchievements = JSON.parse(fs.readFileSync(file, 'utf8'));
      } else {
        this.userAchievements = {};
        this.saveAchievements();
      }
    } catch (error) {
      console.log('Starting fresh achievements system');
      this.userAchievements = {};
    }
  }
  
  saveAchievements() {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(__dirname, 'achievements.json');
    fs.writeFileSync(file, JSON.stringify(this.userAchievements, null, 2));
  }
  
  checkForNewAchievements(handle, stats) {
    const newAchievements = [];
    
    if (!this.userAchievements[handle]) {
      this.userAchievements[handle] = [];
    }
    
    const userAchievements = this.userAchievements[handle];
    
    // Check each achievement
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
      // Skip if user already has this achievement
      if (userAchievements.includes(key)) continue;
      
      let qualified = false;
      
      switch (achievement.type) {
        case 'streak':
          qualified = stats.currentStreak >= achievement.threshold;
          break;
        case 'activity':
          qualified = (stats.totalMessages || 0) >= achievement.threshold;
          break;
        case 'games':
          qualified = (stats.totalGames || 0) >= achievement.threshold;
          break;
        case 'ships':
          qualified = (stats.totalShips || 0) >= achievement.threshold;
          break;
      }
      
      if (qualified) {
        userAchievements.push(key);
        newAchievements.push({
          key,
          ...achievement
        });
      }
    }
    
    if (newAchievements.length > 0) {
      this.saveAchievements();
    }
    
    return newAchievements;
  }
  
  getUserAchievements(handle) {
    const userKeys = this.userAchievements[handle] || [];
    return userKeys.map(key => ({
      key,
      ...ACHIEVEMENTS[key]
    }));
  }
  
  getTopAchievers(limit = 10) {
    const achievers = Object.entries(this.userAchievements)
      .map(([handle, achievements]) => ({
        handle,
        count: achievements.length,
        achievements: achievements.map(key => ACHIEVEMENTS[key])
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
      
    return achievers;
  }
  
  generateProgressReport(handle, stats) {
    const userAchievements = this.getUserAchievements(handle);
    const nextAchievements = [];
    
    // Find next achievements they can work towards
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (this.userAchievements[handle]?.includes(key)) continue;
      
      let progress = 0;
      switch (achievement.type) {
        case 'streak':
          progress = Math.min((stats.currentStreak / achievement.threshold) * 100, 100);
          break;
        case 'activity':
          progress = Math.min(((stats.totalMessages || 0) / achievement.threshold) * 100, 100);
          break;
        case 'games':
          progress = Math.min(((stats.totalGames || 0) / achievement.threshold) * 100, 100);
          break;
        case 'ships':
          progress = Math.min(((stats.totalShips || 0) / achievement.threshold) * 100, 100);
          break;
      }
      
      if (progress > 0 && progress < 100) {
        nextAchievements.push({
          key,
          ...achievement,
          progress: Math.round(progress)
        });
      }
    }
    
    return {
      earned: userAchievements,
      inProgress: nextAchievements.sort((a, b) => b.progress - a.progress).slice(0, 5)
    };
  }
}

module.exports = {
  AchievementSystem,
  ACHIEVEMENTS
};