/**
 * Daily motivation system for /vibe streakers
 * Send encouraging messages to keep momentum going
 */

const MOTIVATION_MESSAGES = {
  // By streak length
  1: [
    "🌱 Day one is the hardest - you've got this!",
    "✨ Every streak starts with a single day. Welcome to the journey!",
    "🎯 You've taken the first step. The momentum starts now!"
  ],
  
  3: [
    "🔥 Three days strong! You're building a habit!",
    "💪 The foundation is set. Keep the momentum rolling!",
    "🌟 Consistency is showing up - you're nailing it!"
  ],
  
  7: [
    "🏆 A full week! You're officially in the groove!",
    "⚡ Week one complete - the habit loop is forming!",
    "🎉 Seven days of showing up. That's commitment!"
  ],
  
  14: [
    "🔥 Two weeks of pure dedication! You're unstoppable!",
    "👑 Fourteen days - you've proven your commitment!",
    "💎 Two weeks strong. The habit is crystallizing!"
  ],
  
  30: [
    "🏆 A full month! You are a legend in the making!",
    "👑 Thirty days of consistency. Absolutely legendary!",
    "🌟 Monthly milestone! Your dedication is inspiring!"
  ],
  
  // Default messages for other lengths
  default: [
    "🔥 Keep that streak alive! Every day counts!",
    "💪 Your consistency is paying off. Stay strong!",
    "✨ Another day, another step forward!",
    "🎯 You're building something amazing. Keep going!",
    "⚡ The streak continues! Your future self will thank you!",
    "🌟 Showing up daily is where magic happens!",
    "🚀 Momentum is building. You're on fire!",
    "💎 Consistency creates diamonds. You're sparkling!"
  ]
};

const WEEKEND_BOOSTS = [
  "🎉 Weekend vibes! Keep the streak going even when relaxing!",
  "🏖️ Weekends are where dedication really shows. You've got this!",
  "☀️ Saturday/Sunday streak energy! The grind doesn't stop!",
  "🎮 Weekend warrior mode activated! Keep showing up!"
];

const MILESTONE_APPROACHING = {
  // When 1 day away from milestone
  6: "🎯 Tomorrow marks one week! Can you feel it?",
  13: "🔥 One day away from two weeks! The finish line is right there!",
  29: "👑 One more day to monthly legend status! You're so close!",
  99: "🏆 ONE DAY TO CENTURY CLUB! This is legendary territory!"
};

class DailyMotivationSystem {
  constructor() {
    this.lastSent = {}; // Track when we last sent motivation to avoid spam
    this.loadSentHistory();
  }
  
  loadSentHistory() {
    try {
      const fs = require('fs');
      const path = require('path');
      const file = path.join(__dirname, 'motivation-history.json');
      
      if (fs.existsSync(file)) {
        this.lastSent = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
    } catch (error) {
      this.lastSent = {};
    }
  }
  
  saveSentHistory() {
    try {
      const fs = require('fs');
      const path = require('path');
      const file = path.join(__dirname, 'motivation-history.json');
      fs.writeFileSync(file, JSON.stringify(this.lastSent, null, 2));
    } catch (error) {
      console.error('Failed to save motivation history:', error);
    }
  }
  
  shouldSendMotivation(handle, streakLength) {
    const today = new Date().toISOString().split('T')[0];
    const lastSentKey = `${handle}:${today}`;
    
    // Don't send more than once per day
    if (this.lastSent[lastSentKey]) {
      return false;
    }
    
    // Only send for streaks of 1+ days
    if (streakLength < 1) {
      return false;
    }
    
    // Send more frequently for new streakers (1-3 days)
    if (streakLength <= 3) {
      return true;
    }
    
    // Send on milestone days and approaching milestones
    if ([7, 14, 30, 100].includes(streakLength) || 
        Object.keys(MILESTONE_APPROACHING).includes(streakLength.toString())) {
      return true;
    }
    
    // For established streaks, send every 3-5 days randomly
    const daysSinceLastMotivation = this.getDaysSinceLastMotivation(handle);
    if (daysSinceLastMotivation >= 3 && Math.random() < 0.4) {
      return true;
    }
    
    return false;
  }
  
  getDaysSinceLastMotivation(handle) {
    const today = new Date();
    let days = 0;
    
    // Look back up to 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const key = `${handle}:${dateStr}`;
      
      if (this.lastSent[key]) {
        return i;
      }
      days = i;
    }
    
    return days;
  }
  
  generateMotivationMessage(handle, streakLength, userStats = {}) {
    let messages = [];
    
    // Check if approaching milestone
    if (MILESTONE_APPROACHING[streakLength]) {
      return MILESTONE_APPROACHING[streakLength];
    }
    
    // Get messages for specific streak length
    if (MOTIVATION_MESSAGES[streakLength]) {
      messages = [...MOTIVATION_MESSAGES[streakLength]];
    } else {
      messages = [...MOTIVATION_MESSAGES.default];
    }
    
    // Add weekend boost if it's weekend
    const isWeekend = [0, 6].includes(new Date().getDay());
    if (isWeekend) {
      messages = [...messages, ...WEEKEND_BOOSTS];
    }
    
    // Pick random message
    const baseMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Add personalization if we have user stats
    let personalizedMessage = baseMessage;
    
    if (userStats.totalMessages > 50) {
      personalizedMessage += "\n\nPS: Your chat energy is contagious! 💬";
    } else if (userStats.totalGames > 10) {
      personalizedMessage += "\n\nPS: Love seeing you in the games! 🎮";
    } else if (userStats.totalShips > 3) {
      personalizedMessage += "\n\nPS: Your shipping game is strong! 🚢";
    }
    
    return personalizedMessage;
  }
  
  async sendDailyMotivations(streakData, userStatsData = {}) {
    let messagesSent = 0;
    const today = new Date().toISOString().split('T')[0];
    
    console.log('💬 Checking for users who need daily motivation...');
    
    for (const [handle, userData] of Object.entries(streakData.users || {})) {
      const streakLength = userData.current || 0;
      const userStats = userStatsData[handle] || {};
      
      if (this.shouldSendMotivation(handle, streakLength)) {
        const message = this.generateMotivationMessage(handle, streakLength, userStats);
        
        try {
          console.log(`💌 Sending motivation to ${handle} (${streakLength} day streak)`);
          console.log(`Message: ${message}`);
          
          // This would be replaced with actual DM function call
          // await dmUser(handle, message);
          
          // Mark as sent
          const sentKey = `${handle}:${today}`;
          this.lastSent[sentKey] = {
            timestamp: Date.now(),
            streakLength,
            message
          };
          
          messagesSent++;
          
        } catch (error) {
          console.error(`Failed to send motivation to ${handle}:`, error);
        }
      }
    }
    
    this.saveSentHistory();
    
    if (messagesSent > 0) {
      console.log(`✅ Sent ${messagesSent} daily motivation messages!`);
    } else {
      console.log('📭 No motivation messages needed today');
    }
    
    return messagesSent;
  }
  
  getMotivationStats() {
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = [];
    
    // Get this week's dates
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      thisWeek.push(date.toISOString().split('T')[0]);
    }
    
    let sentToday = 0;
    let sentThisWeek = 0;
    let totalSent = 0;
    
    for (const [key, data] of Object.entries(this.lastSent)) {
      const [handle, date] = key.split(':');
      
      totalSent++;
      
      if (date === today) {
        sentToday++;
      }
      
      if (thisWeek.includes(date)) {
        sentThisWeek++;
      }
    }
    
    return {
      sentToday,
      sentThisWeek,
      totalSent,
      avgPerWeek: Math.round(sentThisWeek / Math.min(7, thisWeek.length))
    };
  }
}

module.exports = {
  DailyMotivationSystem,
  MOTIVATION_MESSAGES
};