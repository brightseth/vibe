/**
 * Enhanced leaderboard system for /vibe gamification
 * Multiple leaderboards and ranking systems
 */

const { DailyStatsSystem } = require('./daily-stats.js');
const { AchievementSystem } = require('./achievements.js');

class LeaderboardSystem {
  constructor() {
    this.dailyStats = new DailyStatsSystem();
    this.achievements = new AchievementSystem();
    this.loadStreakData();
  }
  
  loadStreakData() {
    try {
      const fs = require('fs');
      const path = require('path');
      const file = path.join(__dirname, 'streaks.json');
      
      if (fs.existsSync(file)) {
        this.streakData = JSON.parse(fs.readFileSync(file, 'utf8'));
      } else {
        this.streakData = { users: {} };
      }
    } catch (error) {
      this.streakData = { users: {} };
    }
  }
  
  generateStreakLeaderboard(limit = 10) {
    const users = Object.entries(this.streakData.users || {})
      .map(([handle, data]) => ({
        handle,
        currentStreak: data.currentStreak || 0,
        longestStreak: data.longestStreak || 0,
        lastActive: data.lastActive,
        totalDays: data.totalActiveDays || 0
      }))
      .sort((a, b) => b.currentStreak - a.currentStreak || b.longestStreak - a.longestStreak)
      .slice(0, limit);
    
    return users.map((user, index) => ({
      rank: index + 1,
      ...user,
      badge: this.getStreakBadge(user.currentStreak)
    }));
  }
  
  generateActivityLeaderboard(period = 'week', limit = 10) {
    const topPerformers = this.dailyStats.getTopPerformers('total', period);
    
    return topPerformers.slice(0, limit).map((performer, index) => ({
      rank: index + 1,
      ...performer,
      badge: this.getActivityBadge(performer.total, period)
    }));
  }
  
  generateAchievementLeaderboard(limit = 10) {
    const topAchievers = this.achievements.getTopAchievers(limit);
    
    return topAchievers.map((achiever, index) => ({
      rank: index + 1,
      ...achiever,
      badge: this.getAchievementBadge(achiever.count)
    }));
  }
  
  generateSpecialtyLeaderboards(limit = 5) {
    const week = this.dailyStats.getTopPerformers('total', 'week');
    const month = this.dailyStats.getTopPerformers('total', 'month');
    
    return {
      chatters: this.dailyStats.getTopPerformers('messages', 'week').slice(0, limit),
      gamers: this.dailyStats.getTopPerformers('games', 'week').slice(0, limit),
      shippers: this.dailyStats.getTopPerformers('ships', 'week').slice(0, limit),
      weeklyRising: week.slice(0, limit),
      monthlyLegends: month.slice(0, limit)
    };
  }
  
  getStreakBadge(streak) {
    if (streak >= 100) return '👑 Legend';
    if (streak >= 30) return '🏆 Champion';
    if (streak >= 14) return '🔥 Committed';
    if (streak >= 7) return '💪 Strong';
    if (streak >= 3) return '🌱 Growing';
    if (streak >= 1) return '✨ Started';
    return '😴 Inactive';
  }
  
  getActivityBadge(totalActivity, period) {
    const threshold = period === 'week' ? {
      legend: 50,
      champion: 30,
      active: 15,
      engaged: 5
    } : {
      legend: 200,
      champion: 120,
      active: 60,
      engaged: 20
    };
    
    if (totalActivity >= threshold.legend) return '🔥 Legend';
    if (totalActivity >= threshold.champion) return '⚡ Champion';
    if (totalActivity >= threshold.active) return '💫 Active';
    if (totalActivity >= threshold.engaged) return '✨ Engaged';
    return '🌱 Getting Started';
  }
  
  getAchievementBadge(count) {
    if (count >= 15) return '🎯 Master Achiever';
    if (count >= 10) return '🏆 Achievement Hunter';
    if (count >= 5) return '⭐ Collector';
    if (count >= 3) return '📈 Progressing';
    if (count >= 1) return '🎉 First Steps';
    return '🆕 New';
  }
  
  generateComprehensiveReport() {
    const report = {
      title: '🏆 /vibe Leaderboards & Stats',
      timestamp: new Date().toISOString(),
      
      // Main leaderboards
      streakLeaderboard: this.generateStreakLeaderboard(10),
      weeklyActivity: this.generateActivityLeaderboard('week', 10),
      monthlyActivity: this.generateActivityLeaderboard('month', 10),
      achievements: this.generateAchievementLeaderboard(10),
      
      // Specialty boards
      specialty: this.generateSpecialtyLeaderboards(5),
      
      // Global stats
      globalStats: {
        today: this.dailyStats.getGlobalStats(),
        thisWeek: this.getWeeklyGlobalStats(),
        allTime: this.getAllTimeGlobalStats()
      }
    };
    
    return report;
  }
  
  getWeeklyGlobalStats() {
    const stats = {
      totalUsers: new Set(),
      totalMessages: 0,
      totalGames: 0,
      totalShips: 0,
      activeDays: 0
    };
    
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStats = this.dailyStats.getGlobalStats(dateStr);
      stats.totalMessages += dayStats.totalMessages;
      stats.totalGames += dayStats.totalGames;
      stats.totalShips += dayStats.totalShips;
      
      if (dayStats.activeUsers > 0) {
        stats.activeDays++;
      }
      
      // Add users to set (automatically deduplicates)
      Object.keys(this.dailyStats.stats[dateStr] || {}).forEach(user => 
        stats.totalUsers.add(user)
      );
    }
    
    return {
      ...stats,
      totalUsers: stats.totalUsers.size,
      averageDaily: Math.round((stats.totalMessages + stats.totalGames + stats.totalShips) / 7)
    };
  }
  
  getAllTimeGlobalStats() {
    const allUsers = new Set();
    let totalMessages = 0;
    let totalGames = 0;
    let totalShips = 0;
    let totalDays = 0;
    
    for (const [date, dayData] of Object.entries(this.dailyStats.stats)) {
      totalDays++;
      Object.keys(dayData).forEach(user => allUsers.add(user));
      
      for (const userStats of Object.values(dayData)) {
        totalMessages += userStats.messages || 0;
        totalGames += userStats.games || 0;
        totalShips += userStats.ships || 0;
      }
    }
    
    return {
      totalUsers: allUsers.size,
      totalMessages,
      totalGames,
      totalShips,
      totalDays,
      totalActivity: totalMessages + totalGames + totalShips,
      averageDaily: totalDays > 0 ? Math.round((totalMessages + totalGames + totalShips) / totalDays) : 0
    };
  }
  
  formatLeaderboardForDisplay(leaderboard, title, showStats = true) {
    let output = `\n🏆 ${title}\n`;
    output += '═'.repeat(50) + '\n';
    
    if (leaderboard.length === 0) {
      output += '📭 No data yet - be the first to climb the ranks!\n';
      return output;
    }
    
    leaderboard.forEach((entry, index) => {
      const rank = entry.rank || (index + 1);
      const trophy = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
      
      output += `${trophy} @${entry.handle} `;
      
      if (entry.badge) {
        output += `${entry.badge} `;
      }
      
      if (showStats) {
        if (entry.currentStreak !== undefined) {
          output += `(${entry.currentStreak} day streak)`;
        } else if (entry.total !== undefined) {
          output += `(${entry.total} activities)`;
        } else if (entry.count !== undefined) {
          output += `(${entry.count} achievements)`;
        }
      }
      
      output += '\n';
    });
    
    return output;
  }
  
  generateDiscordEmbed(type = 'comprehensive') {
    const report = this.generateComprehensiveReport();
    
    switch (type) {
      case 'streaks':
        return {
          title: '🔥 Streak Leaderboard',
          description: 'Top streakers in /vibe',
          fields: report.streakLeaderboard.slice(0, 5).map(entry => ({
            name: `${entry.rank}. @${entry.handle} ${entry.badge}`,
            value: `${entry.currentStreak} day streak (best: ${entry.longestStreak})`,
            inline: false
          })),
          color: 0xff6b35
        };
        
      case 'activity':
        return {
          title: '⚡ Weekly Activity Leaders',
          description: 'Most active vibers this week',
          fields: report.weeklyActivity.slice(0, 5).map(entry => ({
            name: `${entry.rank}. @${entry.handle} ${entry.badge}`,
            value: `${entry.total} activities (${entry.messages}📱 ${entry.games}🎮 ${entry.ships}🚢)`,
            inline: false
          })),
          color: 0x4ecdc4
        };
        
      default:
        return {
          title: '🏆 /vibe Leaderboards',
          description: 'Your daily dose of competitive vibes!',
          fields: [
            {
              name: '🔥 Top Streaker',
              value: report.streakLeaderboard[0] ? 
                `@${report.streakLeaderboard[0].handle} - ${report.streakLeaderboard[0].currentStreak} days` : 
                'No active streaks yet!',
              inline: true
            },
            {
              name: '⚡ Weekly MVP',
              value: report.weeklyActivity[0] ? 
                `@${report.weeklyActivity[0].handle} - ${report.weeklyActivity[0].total} activities` : 
                'No activity this week!',
              inline: true
            },
            {
              name: '🎯 Achievement Leader',
              value: report.achievements[0] ? 
                `@${report.achievements[0].handle} - ${report.achievements[0].count} achievements` : 
                'No achievements yet!',
              inline: true
            }
          ],
          color: 0x45b7d1
        };
    }
  }
}

module.exports = {
  LeaderboardSystem
};