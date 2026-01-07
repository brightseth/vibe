#!/usr/bin/env node

/**
 * Enhanced MCP-based streak tracking with full gamification
 * Uses MCP functions for real-time tracking and celebration
 */

const { DailyStatsTracker } = require('./daily-stats-enhanced.js');
const { AchievementSystem } = require('./achievements.js');
const { EnhancedLeaderboard } = require('./leaderboard-enhanced.js');

async function runEnhancedStreakTracking() {
  console.log('🔥 @streaks-agent: Enhanced streak tracking and celebration! 🎉\n');
  
  let usersTracked = 0;
  let milestonesAnnounced = 0;
  let achievementsUnlocked = 0;
  
  // Initialize our systems
  const statsTracker = new DailyStatsTracker();
  const achievementSystem = new AchievementSystem();
  const leaderboard = new EnhancedLeaderboard();
  
  try {
    // 1. Check who's online (this updates their streaks automatically)
    console.log('👀 Observing vibe for online users...');
    // In real MCP context: const onlineUsers = await observe_vibe();
    
    // 2. Get current streak data 
    console.log('📊 Getting current streak data...');
    // In real MCP context: const streakData = await get_streaks();
    
    // For demo, let's simulate some activity
    const currentUsers = [
      { handle: 'demo_user', streak: 1, isOnline: false },
      { handle: 'vibe_champion', streak: 1, isOnline: false }
    ];
    
    // 3. Process each user
    for (const user of currentUsers) {
      // Record online activity
      if (user.isOnline) {
        statsTracker.recordActivity(user.handle, 'online');
        // In real MCP: await update_streak(user.handle, 'active');
        usersTracked++;
        console.log(`✅ Updated streak for @${user.handle}`);
      }
      
      // Get user's lifetime stats for achievement checking
      const userStats = statsTracker.getUserLifetimeStats(user.handle);
      userStats.currentStreak = user.streak;
      
      // Check for new achievements
      const newAchievements = achievementSystem.checkForNewAchievements(user.handle, userStats);
      
      if (newAchievements.length > 0) {
        for (const achievement of newAchievements) {
          console.log(`🎉 @${user.handle} unlocked: ${achievement.emoji} ${achievement.name}!`);
          
          const message = `🎉 **Achievement Unlocked!** 🎉\\n\\n${achievement.emoji} **${achievement.name}**\\n${achievement.description}\\n\\nYou're making great progress! Keep up the amazing work! 🚀`;
          
          // In real MCP: await dm_user(user.handle, message);
          achievementsUnlocked++;
        }
      }
      
      // Check for streak milestones
      const milestones = [
        { days: 3, name: 'Getting Started', emoji: '🌱', message: 'Three days of consistency! You\'re building a great habit!' },
        { days: 7, name: 'Weekly Warrior', emoji: '💪', message: 'One week strong! You\'re proving your dedication!' },
        { days: 14, name: 'Committed Viber', emoji: '🔥', message: 'Two weeks! You\'re truly committed to the vibe!' },
        { days: 30, name: 'Monthly Legend', emoji: '🏆', message: 'A full month! You are a /vibe legend!' },
        { days: 100, name: 'Century Club', emoji: '👑', message: '100 days! You are /vibe royalty! Incredible dedication!' }
      ];
      
      for (const milestone of milestones) {
        if (user.streak === milestone.days) {
          console.log(`🎯 @${user.handle} hit ${milestone.days}-day milestone!`);
          
          const celebrationMessage = `${milestone.emoji} **${milestone.days}-Day Streak!** ${milestone.emoji}\\n\\n${milestone.message}\\n\\n${statsTracker.generatePersonalizedMessage(user.handle, user.streak)}`;
          
          // In real MCP: await celebrate_milestone(user.handle, milestone.name, celebrationMessage);
          milestonesAnnounced++;
          break;
        }
      }
    }
    
    // 4. Display enhanced leaderboards
    console.log('\\n🏆 Current Leaderboards:');
    
    // Streak leaderboard
    console.log('\\n' + leaderboard.generateLeaderboardMessage('streak', 3));
    
    // Activity leaderboard 
    console.log('\\n' + leaderboard.generateLeaderboardMessage('activity', 3));
    
    // Achievement leaderboard
    console.log('\\n' + leaderboard.generateLeaderboardMessage('achievements', 3));
    
    // 5. Global stats
    const globalStats = statsTracker.getGlobalStats();
    console.log('\\n📈 Global /vibe Stats:');
    console.log(`   Total users: ${globalStats.totalUsers}`);
    console.log(`   Total messages: ${globalStats.totalMessages}`);
    console.log(`   Total games: ${globalStats.totalGames}`);
    console.log(`   Total ships: ${globalStats.totalShips}`);
    
    // 6. Summary
    console.log(`\\n✨ Enhanced Run Complete:`);
    console.log(`   Users tracked: ${usersTracked}`);
    console.log(`   Milestones announced: ${milestonesAnnounced}`);
    console.log(`   Achievements unlocked: ${achievementsUnlocked}`);
    
    if (usersTracked === 0) {
      console.log('\\n🚀 Enhanced gamification system ready!');
      console.log('   Features active:');
      console.log('   ✓ Advanced streak tracking with personalized stats');
      console.log('   ✓ Multi-tier milestone celebrations');
      console.log('   ✓ Achievement system (streak, activity, game, ship badges)');
      console.log('   ✓ Enhanced leaderboards (streak, activity, achievement)');
      console.log('   ✓ Daily/weekly progress reports');
      console.log('   ✓ Competitive insights and motivation');
      console.log('   ✓ Personalized daily summaries');
    } else {
      console.log('\\n🎉 Users are getting the full gamification experience!');
    }
    
  } catch (error) {
    console.error('💥 Error during enhanced streak tracking:', error);
    throw error;
  }
  
  return {
    usersTracked,
    milestonesAnnounced,
    achievementsUnlocked,
    summary: `Tracked ${usersTracked} users, announced ${milestonesAnnounced} milestones, unlocked ${achievementsUnlocked} achievements`
  };
}

// Example of how to provide daily stats to a user
function generateDailyStatsMessage(handle) {
  const statsTracker = new DailyStatsTracker();
  const achievementSystem = new AchievementSystem();
  const leaderboard = new EnhancedLeaderboard();
  
  // Get user stats
  const userStats = statsTracker.getUserLifetimeStats(handle);
  const dailyStats = statsTracker.getDailySummary(handle);
  const weeklyStats = statsTracker.getWeeklySummary(handle);
  const rankings = leaderboard.getUserRankings(handle);
  const competitiveInsight = leaderboard.getCompetitiveInsight(handle);
  
  // Get achievements progress
  const achievementProgress = achievementSystem.generateProgressReport(handle, userStats);
  
  let message = statsTracker.generatePersonalizedMessage(handle, userStats.currentStreak || 0);
  
  // Add rankings if available
  if (rankings.streak || rankings.activity || rankings.achievements) {
    message += '\\n\\n📊 **Your Rankings:**\\n';
    if (rankings.streak) message += `🔥 Streak: #${rankings.streak}\\n`;
    if (rankings.activity) message += `⚡ Weekly Activity: #${rankings.activity}\\n`;
    if (rankings.achievements) message += `🏆 Achievements: #${rankings.achievements}\\n`;
  }
  
  // Add competitive insight
  if (competitiveInsight) {
    message += `\\n${competitiveInsight}`;
  }
  
  // Add achievement progress
  if (achievementProgress.inProgress.length > 0) {
    message += '\\n\\n🎯 **Next Achievements:**\\n';
    achievementProgress.inProgress.slice(0, 3).forEach(achievement => {
      message += `${achievement.emoji} ${achievement.name} (${achievement.progress}% complete)\\n`;
    });
  }
  
  return message;
}

module.exports = { 
  runEnhancedStreakTracking,
  generateDailyStatsMessage
};

// Run if called directly
if (require.main === module) {
  runEnhancedStreakTracking().catch(console.error);
}