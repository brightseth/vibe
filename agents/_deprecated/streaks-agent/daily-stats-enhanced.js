/**
 * Enhanced daily stats system for rich user feedback
 * Provides detailed activity summaries and progress tracking
 */

const fs = require('fs');
const path = require('path');

class DailyStatsTracker {
  constructor() {
    this.statsFile = path.join(__dirname, 'user-stats.json');
    this.dailyFile = path.join(__dirname, 'daily-activity.json');
    this.loadStats();
  }
  
  loadStats() {
    try {
      if (fs.existsSync(this.statsFile)) {
        this.userStats = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
      } else {
        this.userStats = {};
      }
      
      if (fs.existsSync(this.dailyFile)) {
        this.dailyActivity = JSON.parse(fs.readFileSync(this.dailyFile, 'utf8'));
      } else {
        this.dailyActivity = {};
      }
    } catch (error) {
      console.log('Starting fresh stats system');
      this.userStats = {};
      this.dailyActivity = {};
    }
  }
  
  saveStats() {
    fs.writeFileSync(this.statsFile, JSON.stringify(this.userStats, null, 2));
    fs.writeFileSync(this.dailyFile, JSON.stringify(this.dailyActivity, null, 2));
  }
  
  recordActivity(handle, activityType, data = {}) {
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize user stats if needed
    if (!this.userStats[handle]) {
      this.userStats[handle] = {
        totalMessages: 0,
        totalGames: 0,
        totalShips: 0,
        totalOnlineDays: 0,
        firstSeen: today,
        lastSeen: today,
        achievements: []
      };
    }
    
    // Initialize daily activity if needed
    if (!this.dailyActivity[today]) {
      this.dailyActivity[today] = {};
    }
    
    if (!this.dailyActivity[today][handle]) {
      this.dailyActivity[today][handle] = {
        messages: 0,
        games: 0,
        ships: 0,
        activities: []
      };
    }
    
    // Record the activity
    const userDaily = this.dailyActivity[today][handle];
    const userStats = this.userStats[handle];
    
    switch (activityType) {
      case 'message':
        userDaily.messages++;
        userStats.totalMessages++;
        userDaily.activities.push({ type: 'message', timestamp: new Date().toISOString(), ...data });
        break;
        
      case 'game':
        userDaily.games++;
        userStats.totalGames++;
        userDaily.activities.push({ type: 'game', timestamp: new Date().toISOString(), ...data });
        break;
        
      case 'ship':
        userDaily.ships++;
        userStats.totalShips++;
        userDaily.activities.push({ type: 'ship', timestamp: new Date().toISOString(), ...data });
        break;
        
      case 'online':
        // Update last seen
        userStats.lastSeen = today;
        if (!userDaily.activities.find(a => a.type === 'online')) {
          userDaily.activities.push({ type: 'online', timestamp: new Date().toISOString() });
        }
        break;
    }
    
    this.saveStats();
  }
  
  getDailySummary(handle, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const daily = this.dailyActivity[targetDate]?.[handle];
    
    if (!daily) {
      return {
        date: targetDate,
        messages: 0,
        games: 0,
        ships: 0,
        activities: [],
        wasActive: false
      };
    }
    
    return {
      date: targetDate,
      messages: daily.messages,
      games: daily.games,
      ships: daily.ships,
      activities: daily.activities,
      wasActive: true
    };
  }
  
  getWeeklySummary(handle, weeksBack = 0) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (weeksBack * 7));
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    
    const summary = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalMessages: 0,
      totalGames: 0,
      totalShips: 0,
      activeDays: 0,
      dailyBreakdown: []
    };
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const daily = this.getDailySummary(handle, dateStr);
      
      summary.totalMessages += daily.messages;
      summary.totalGames += daily.games;
      summary.totalShips += daily.ships;
      if (daily.wasActive) summary.activeDays++;
      
      summary.dailyBreakdown.push(daily);
    }
    
    return summary;
  }
  
  getUserLifetimeStats(handle) {
    const userStats = this.userStats[handle];
    if (!userStats) {
      return {
        totalMessages: 0,
        totalGames: 0,
        totalShips: 0,
        totalOnlineDays: 0,
        firstSeen: null,
        lastSeen: null,
        achievements: []
      };
    }
    
    // Calculate total online days from daily activity
    let totalOnlineDays = 0;
    for (const [date, activities] of Object.entries(this.dailyActivity)) {
      if (activities[handle]) {
        totalOnlineDays++;
      }
    }
    
    return {
      ...userStats,
      totalOnlineDays
    };
  }
  
  generatePersonalizedMessage(handle, currentStreak) {
    const today = this.getDailySummary(handle);
    const thisWeek = this.getWeeklySummary(handle);
    const lifetime = this.getUserLifetimeStats(handle);
    
    let message = `🔥 **Daily Vibe Report** 🔥\n\n`;
    
    // Today's activity
    if (today.wasActive) {
      const activities = [];
      if (today.messages > 0) activities.push(`${today.messages} message${today.messages > 1 ? 's' : ''}`);
      if (today.games > 0) activities.push(`${today.games} game${today.games > 1 ? 's' : ''}`);
      if (today.ships > 0) activities.push(`${today.ships} ship${today.ships > 1 ? 's' : ''}`);
      
      if (activities.length > 0) {
        message += `📅 **Today:** ${activities.join(', ')}\n`;
      } else {
        message += `📅 **Today:** You're here and that's what matters! 🌟\n`;
      }
    } else {
      message += `📅 **Today:** First activity - welcome back! 👋\n`;
    }
    
    // Current streak
    message += `🔥 **Current Streak:** ${currentStreak} day${currentStreak > 1 ? 's' : ''}\n`;
    
    // This week summary
    if (thisWeek.activeDays > 1) {
      message += `📊 **This Week:** ${thisWeek.activeDays}/7 active days`;
      const weekActivities = [];
      if (thisWeek.totalMessages > 0) weekActivities.push(`${thisWeek.totalMessages} messages`);
      if (thisWeek.totalGames > 0) weekActivities.push(`${thisWeek.totalGames} games`);
      if (thisWeek.totalShips > 0) weekActivities.push(`${thisWeek.totalShips} ships`);
      
      if (weekActivities.length > 0) {
        message += `, ${weekActivities.join(', ')}`;
      }
      message += '\n';
    }
    
    // Lifetime highlights
    const highlights = [];
    if (lifetime.totalMessages >= 100) highlights.push(`${lifetime.totalMessages} total messages 💬`);
    if (lifetime.totalGames >= 10) highlights.push(`${lifetime.totalGames} games played 🎮`);
    if (lifetime.totalShips >= 5) highlights.push(`${lifetime.totalShips} projects shipped 🚢`);
    if (lifetime.totalOnlineDays >= 30) highlights.push(`${lifetime.totalOnlineDays} days active 📅`);
    
    if (highlights.length > 0) {
      message += `🏆 **Highlights:** ${highlights.join(', ')}\n`;
    }
    
    // Motivational close
    const motivations = [
      "Keep the momentum going! 🚀",
      "You're building something amazing! ✨",
      "Consistency is your superpower! 💪",
      "The vibe is strong with this one! 🌟",
      "Every day counts - you're crushing it! 🔥"
    ];
    
    message += `\n${motivations[Math.floor(Math.random() * motivations.length)]}`;
    
    return message;
  }
  
  getGlobalStats() {
    const stats = {
      totalUsers: Object.keys(this.userStats).length,
      totalMessages: 0,
      totalGames: 0,
      totalShips: 0,
      mostActiveUsers: [],
      recentActivity: []
    };
    
    // Calculate totals and find most active users
    const userActivity = [];
    for (const [handle, userStats] of Object.entries(this.userStats)) {
      stats.totalMessages += userStats.totalMessages;
      stats.totalGames += userStats.totalGames;
      stats.totalShips += userStats.totalShips;
      
      userActivity.push({
        handle,
        totalActivity: userStats.totalMessages + userStats.totalGames + userStats.totalShips,
        lastSeen: userStats.lastSeen
      });
    }
    
    stats.mostActiveUsers = userActivity
      .sort((a, b) => b.totalActivity - a.totalActivity)
      .slice(0, 5);
    
    return stats;
  }
}

module.exports = { DailyStatsTracker };