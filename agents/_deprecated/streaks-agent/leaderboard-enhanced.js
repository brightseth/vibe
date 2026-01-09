/**
 * Enhanced leaderboard system with multiple categories
 * Shows various ways to compete and celebrate achievements
 */

const { DailyStatsTracker } = require('./daily-stats-enhanced.js');
const { AchievementSystem } = require('./achievements.js');

class EnhancedLeaderboard {
  constructor() {
    this.statsTracker = new DailyStatsTracker();
    this.achievementSystem = new AchievementSystem();
  }
  
  getStreakLeaderboard(limit = 10) {
    // This would use the MCP get_streaks() function in live environment
    // For now, we'll simulate with sample data
    const streaks = [
      { handle: 'demo_user', current: 1, best: 1 },
      { handle: 'vibe_champion', current: 1, best: 1 }
    ];
    
    return streaks
      .sort((a, b) => {
        // Sort by current streak first, then by best streak
        if (b.current !== a.current) return b.current - a.current;
        return b.best - a.best;
      })
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        handle: entry.handle,
        currentStreak: entry.current,
        bestStreak: entry.best,
        badge: this.getStreakBadge(entry.current),
        isActive: entry.current > 0
      }));
  }
  
  getActivityLeaderboard(limit = 10, timeframe = 'week') {
    const users = Object.keys(this.statsTracker.userStats);
    const leaderboard = [];
    
    for (const handle of users) {
      let stats;
      if (timeframe === 'week') {
        stats = this.statsTracker.getWeeklySummary(handle);
        stats.totalActivity = stats.totalMessages + stats.totalGames + stats.totalShips;
      } else {
        stats = this.statsTracker.getUserLifetimeStats(handle);
        stats.totalActivity = stats.totalMessages + stats.totalGames + stats.totalShips;
      }
      
      leaderboard.push({
        handle,
        totalActivity: stats.totalActivity,
        messages: timeframe === 'week' ? stats.totalMessages : stats.totalMessages,
        games: timeframe === 'week' ? stats.totalGames : stats.totalGames,
        ships: timeframe === 'week' ? stats.totalShips : stats.totalShips,
        badge: this.getActivityBadge(stats.totalActivity)
      });
    }
    
    return leaderboard
      .sort((a, b) => b.totalActivity - a.totalActivity)
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry
      }));
  }
  
  getAchievementLeaderboard(limit = 10) {
    const achievers = this.achievementSystem.getTopAchievers(limit);
    
    return achievers.map((entry, index) => ({
      rank: index + 1,
      handle: entry.handle,
      achievementCount: entry.count,
      recentAchievements: entry.achievements.slice(-3),
      badge: this.getAchievementBadge(entry.count)
    }));
  }
  
  getStreakBadge(days) {
    if (days >= 100) return '👑 Legend';
    if (days >= 30) return '🏆 Champion';
    if (days >= 14) return '🔥 Committed';
    if (days >= 7) return '💪 Strong';
    if (days >= 3) return '🌱 Growing';
    if (days >= 1) return '✨ Started';
    return '💤 Inactive';
  }
  
  getActivityBadge(totalActivity) {
    if (totalActivity >= 500) return '⚡ Hyperactive';
    if (totalActivity >= 200) return '🚀 Very Active';
    if (totalActivity >= 100) return '🔥 Active';
    if (totalActivity >= 50) return '💪 Engaged';
    if (totalActivity >= 20) return '🌟 Participant';
    if (totalActivity >= 5) return '🌱 Newcomer';
    return '👋 Just Started';
  }
  
  getAchievementBadge(count) {
    if (count >= 15) return '🎖️ Completionist';
    if (count >= 10) return '🏅 Achiever';
    if (count >= 5) return '⭐ Collector';
    if (count >= 3) return '🎯 Focused';
    if (count >= 1) return '🏆 Started';
    return '🔍 Exploring';
  }
  
  generateLeaderboardMessage(type = 'streak', limit = 5) {
    let message = '';
    let leaderboard = [];
    
    switch (type) {
      case 'streak':
        leaderboard = this.getStreakLeaderboard(limit);
        message = '🔥 **Streak Leaderboard** 🔥\n\n';
        if (leaderboard.length === 0) {
          message += 'No active streaks yet! Be the first to start your journey! 🚀\n\n';
          message += 'Come online tomorrow to start building your streak! 💪';
        } else {
          leaderboard.forEach(entry => {
            const status = entry.isActive ? '🔥' : '💤';
            message += `${entry.rank}. **@${entry.handle}** ${status}\n`;
            message += `   Current: ${entry.currentStreak} days | Best: ${entry.bestStreak} days\n`;
            message += `   ${entry.badge}\n\n`;
          });
        }
        break;
        
      case 'activity':
        leaderboard = this.getActivityLeaderboard(limit, 'week');
        message = '⚡ **Weekly Activity Leaders** ⚡\n\n';
        if (leaderboard.length === 0) {
          message += 'No activity tracked yet! Start participating to claim your spot! 🌟';
        } else {
          leaderboard.forEach(entry => {
            message += `${entry.rank}. **@${entry.handle}** ${entry.badge}\n`;
            const activities = [];
            if (entry.messages > 0) activities.push(`${entry.messages} messages`);
            if (entry.games > 0) activities.push(`${entry.games} games`);
            if (entry.ships > 0) activities.push(`${entry.ships} ships`);
            message += `   ${activities.join(', ') || 'Getting started'}\n\n`;
          });
        }
        break;
        
      case 'achievements':
        leaderboard = this.getAchievementLeaderboard(limit);
        message = '🏆 **Achievement Leaders** 🏆\n\n';
        if (leaderboard.length === 0) {
          message += 'No achievements unlocked yet! Start your journey today! ✨';
        } else {
          leaderboard.forEach(entry => {
            message += `${entry.rank}. **@${entry.handle}** ${entry.badge}\n`;
            message += `   ${entry.achievementCount} achievement${entry.achievementCount > 1 ? 's' : ''} unlocked\n`;
            if (entry.recentAchievements.length > 0) {
              const recent = entry.recentAchievements.map(a => `${a.emoji} ${a.name}`).join(', ');
              message += `   Recent: ${recent}\n`;
            }
            message += '\n';
          });
        }
        break;
    }
    
    return message;
  }
  
  getUserRankings(handle) {
    const streakLeaderboard = this.getStreakLeaderboard(50);
    const activityLeaderboard = this.getActivityLeaderboard(50, 'week');
    const achievementLeaderboard = this.getAchievementLeaderboard(50);
    
    const streakRank = streakLeaderboard.findIndex(entry => entry.handle === handle) + 1;
    const activityRank = activityLeaderboard.findIndex(entry => entry.handle === handle) + 1;
    const achievementRank = achievementLeaderboard.findIndex(entry => entry.handle === handle) + 1;
    
    return {
      streak: streakRank || null,
      activity: activityRank || null,
      achievements: achievementRank || null
    };
  }
  
  getCompetitiveInsight(handle) {
    const rankings = this.getUserRankings(handle);
    const streakBoard = this.getStreakLeaderboard(10);
    const activityBoard = this.getActivityLeaderboard(10, 'week');
    
    let insight = '';
    
    // Find what they're closest to improving in
    if (rankings.streak && rankings.streak <= 10) {
      const userEntry = streakBoard.find(e => e.handle === handle);
      if (userEntry && rankings.streak > 1) {
        const aboveUser = streakBoard[rankings.streak - 2];
        const daysBehind = aboveUser.currentStreak - userEntry.currentStreak;
        if (daysBehind <= 3) {
          insight += `🎯 You're only ${daysBehind} day${daysBehind > 1 ? 's' : ''} behind @${aboveUser.handle} in streak rankings!\n`;
        }
      }
    }
    
    if (rankings.activity && rankings.activity <= 10) {
      const userEntry = activityBoard.find(e => e.handle === handle);
      if (userEntry && rankings.activity > 1) {
        const aboveUser = activityBoard[rankings.activity - 2];
        const activityBehind = aboveUser.totalActivity - userEntry.totalActivity;
        if (activityBehind <= 10) {
          insight += `⚡ ${activityBehind} more activities this week to pass @${aboveUser.handle}!\n`;
        }
      }
    }
    
    if (!insight) {
      insight = '🚀 Keep participating to climb the leaderboards!';
    }
    
    return insight;
  }
}

module.exports = { EnhancedLeaderboard };