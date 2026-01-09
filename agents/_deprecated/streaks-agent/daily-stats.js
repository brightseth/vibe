/**
 * Daily stats system for /vibe
 * Track and report meaningful daily activity metrics
 */

class DailyStatsSystem {
  constructor() {
    this.stats = {};
    this.loadStats();
  }
  
  loadStats() {
    try {
      const fs = require('fs');
      const path = require('path');
      const file = path.join(__dirname, 'daily-stats.json');
      
      if (fs.existsSync(file)) {
        this.stats = JSON.parse(fs.readFileSync(file, 'utf8'));
      } else {
        this.stats = {};
        this.saveStats();
      }
    } catch (error) {
      console.log('Starting fresh daily stats system');
      this.stats = {};
    }
  }
  
  saveStats() {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(__dirname, 'daily-stats.json');
    fs.writeFileSync(file, JSON.stringify(this.stats, null, 2));
  }
  
  getToday() {
    return new Date().toISOString().split('T')[0];
  }
  
  recordActivity(handle, activityType, amount = 1) {
    const today = this.getToday();
    
    if (!this.stats[today]) {
      this.stats[today] = {};
    }
    
    if (!this.stats[today][handle]) {
      this.stats[today][handle] = {
        messages: 0,
        games: 0,
        ships: 0,
        reactions: 0,
        firstActivity: new Date().toISOString()
      };
    }
    
    this.stats[today][handle][activityType] += amount;
    this.saveStats();
  }
  
  getDailyStats(handle, date = null) {
    const targetDate = date || this.getToday();
    return this.stats[targetDate]?.[handle] || {
      messages: 0,
      games: 0,
      ships: 0,
      reactions: 0
    };
  }
  
  getWeeklyStats(handle) {
    const today = new Date();
    const weekStats = {
      totalMessages: 0,
      totalGames: 0,
      totalShips: 0,
      totalReactions: 0,
      activeDays: 0,
      dailyBreakdown: []
    };
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStats = this.getDailyStats(handle, dateStr);
      weekStats.dailyBreakdown.push({
        date: dateStr,
        ...dayStats
      });
      
      if (dayStats.messages > 0 || dayStats.games > 0 || dayStats.ships > 0) {
        weekStats.activeDays++;
      }
      
      weekStats.totalMessages += dayStats.messages;
      weekStats.totalGames += dayStats.games;
      weekStats.totalShips += dayStats.ships;
      weekStats.totalReactions += dayStats.reactions;
    }
    
    return weekStats;
  }
  
  getAllTimeStats(handle) {
    const allTimeStats = {
      totalMessages: 0,
      totalGames: 0,
      totalShips: 0,
      totalReactions: 0,
      activeDays: 0,
      firstActivity: null,
      bestDay: { date: null, total: 0 }
    };
    
    for (const [date, dayData] of Object.entries(this.stats)) {
      if (dayData[handle]) {
        const userDay = dayData[handle];
        const dayTotal = userDay.messages + userDay.games + userDay.ships;
        
        allTimeStats.totalMessages += userDay.messages;
        allTimeStats.totalGames += userDay.games;
        allTimeStats.totalShips += userDay.ships;
        allTimeStats.totalReactions += userDay.reactions;
        
        if (dayTotal > 0) {
          allTimeStats.activeDays++;
          
          if (!allTimeStats.firstActivity) {
            allTimeStats.firstActivity = userDay.firstActivity || date;
          } else if (userDay.firstActivity && userDay.firstActivity < allTimeStats.firstActivity) {
            allTimeStats.firstActivity = userDay.firstActivity;
          }
          
          if (dayTotal > allTimeStats.bestDay.total) {
            allTimeStats.bestDay = { date, total: dayTotal };
          }
        }
      }
    }
    
    return allTimeStats;
  }
  
  generatePersonalReport(handle) {
    const todayStats = this.getDailyStats(handle);
    const weekStats = this.getWeeklyStats(handle);
    const allTimeStats = this.getAllTimeStats(handle);
    
    const report = {
      handle,
      today: todayStats,
      thisWeek: weekStats,
      allTime: allTimeStats,
      insights: this.generateInsights(handle, todayStats, weekStats, allTimeStats)
    };
    
    return report;
  }
  
  generateInsights(handle, today, week, allTime) {
    const insights = [];
    
    // Today insights
    if (today.messages > 0) {
      insights.push(`📱 You sent ${today.messages} message${today.messages === 1 ? '' : 's'} today`);
    }
    if (today.games > 0) {
      insights.push(`🎮 You played ${today.games} game${today.games === 1 ? '' : 's'} today`);
    }
    if (today.ships > 0) {
      insights.push(`🚢 You shipped ${today.ships} project${today.ships === 1 ? '' : 's'} today`);
    }
    
    // Weekly insights
    if (week.activeDays > 0) {
      insights.push(`✨ You were active ${week.activeDays}/7 days this week`);
    }
    
    // Streaks and consistency
    if (week.activeDays === 7) {
      insights.push(`🔥 Perfect week! You've been active every single day`);
    } else if (week.activeDays >= 5) {
      insights.push(`💪 Strong week! Almost perfect consistency`);
    }
    
    // All-time milestones
    if (allTime.totalMessages >= 100) {
      insights.push(`🎯 Century milestone: ${allTime.totalMessages} total messages!`);
    }
    
    if (allTime.activeDays >= 30) {
      insights.push(`🏆 You've been active for ${allTime.activeDays} days total!`);
    }
    
    // Best day
    if (allTime.bestDay.total > 0) {
      insights.push(`🌟 Your best day was ${allTime.bestDay.date} with ${allTime.bestDay.total} activities`);
    }
    
    return insights;
  }
  
  getGlobalStats(date = null) {
    const targetDate = date || this.getToday();
    const dayData = this.stats[targetDate] || {};
    
    let totalUsers = 0;
    let totalMessages = 0;
    let totalGames = 0;
    let totalShips = 0;
    let activeUsers = Object.keys(dayData).length;
    
    for (const userStats of Object.values(dayData)) {
      totalMessages += userStats.messages || 0;
      totalGames += userStats.games || 0;
      totalShips += userStats.ships || 0;
      totalUsers++;
    }
    
    return {
      date: targetDate,
      activeUsers,
      totalUsers,
      totalMessages,
      totalGames,
      totalShips,
      totalActivity: totalMessages + totalGames + totalShips
    };
  }
  
  getTopPerformers(metric = 'total', period = 'week') {
    const performers = {};
    const today = new Date();
    
    // Calculate date range based on period
    let startDate = new Date(today);
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    }
    
    // Aggregate stats for the period
    for (const [date, dayData] of Object.entries(this.stats)) {
      const checkDate = new Date(date);
      if (checkDate < startDate) continue;
      
      for (const [handle, userStats] of Object.entries(dayData)) {
        if (!performers[handle]) {
          performers[handle] = { messages: 0, games: 0, ships: 0, reactions: 0 };
        }
        
        performers[handle].messages += userStats.messages || 0;
        performers[handle].games += userStats.games || 0;
        performers[handle].ships += userStats.ships || 0;
        performers[handle].reactions += userStats.reactions || 0;
      }
    }
    
    // Calculate total and sort
    const sorted = Object.entries(performers)
      .map(([handle, stats]) => ({
        handle,
        ...stats,
        total: stats.messages + stats.games + stats.ships
      }))
      .sort((a, b) => {
        if (metric === 'total') return b.total - a.total;
        return b[metric] - a[metric];
      });
    
    return sorted.slice(0, 10);
  }
}

module.exports = {
  DailyStatsSystem
};