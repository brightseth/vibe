#!/usr/bin/env node

/**
 * 🎊 Achievement Celebration Runner
 * Checks current streaks and celebrates new achievements
 * Built by @streaks-agent for /vibe workshop
 */

const StreakAchievementEngine = require('./streak-achievement-engine.js');

class AchievementCelebrator {
  constructor() {
    this.engine = new StreakAchievementEngine();
    this.celebratedToday = new Set(); // Prevent duplicate celebrations
  }

  /**
   * Process current streaks and celebrate achievements
   */
  async processStreaks(streakData) {
    const celebrations = [];
    
    // Parse streak data format: "@handle: X days (best: Y)"
    for (const line of streakData.split('\\n')) {
      if (line.includes(':') && line.includes('days')) {
        const match = line.match(/@(\\w+): (\\d+) days \\(best: (\\d+)\\)/);
        if (match) {
          const [, handle, current, best] = match;
          const fullHandle = `@${handle}`;
          
          const achievements = this.engine.checkAchievements(
            fullHandle, 
            parseInt(current), 
            parseInt(best)
          );
          
          // Process each new achievement
          for (const achievement of achievements) {
            const celebrationKey = `${achievement.handle}_${achievement.key}`;
            
            if (!this.celebratedToday.has(celebrationKey)) {
              const celebration = this.engine.generateCelebration(achievement);
              celebrations.push({
                achievement,
                celebration,
                user: fullHandle
              });
              
              this.celebratedToday.add(celebrationKey);
            }
          }
        }
      }
    }
    
    return celebrations;
  }

  /**
   * Generate celebration summary
   */
  generateSummary(celebrations) {
    if (celebrations.length === 0) {
      return {
        summary: "No new achievements to celebrate",
        actions: []
      };
    }

    const actions = [];
    let summary = `Celebrated ${celebrations.length} achievements:\\n`;
    
    celebrations.forEach(({ achievement, celebration, user }) => {
      summary += `• ${user}: ${achievement.emoji} ${achievement.name}\\n`;
      
      actions.push({
        type: 'dm',
        user: user,
        message: celebration.dm
      });
      
      if (celebration.boardPost) {
        actions.push({
          type: 'board',
          message: celebration.boardPost
        });
      }
    });

    return { summary, actions };
  }

  /**
   * Get achievement statistics
   */
  getStats(streakData) {
    const stats = {
      totalUsers: 0,
      activeStreaks: 0,
      totalAchievements: 0,
      upcomingMilestones: []
    };

    for (const line of streakData.split('\\n')) {
      if (line.includes(':') && line.includes('days')) {
        const match = line.match(/@(\\w+): (\\d+) days \\(best: (\\d+)\\)/);
        if (match) {
          const [, handle, current, best] = match;
          const fullHandle = `@${handle}`;
          
          stats.totalUsers++;
          if (parseInt(current) > 0) stats.activeStreaks++;
          
          const summary = this.engine.getUserSummary(
            fullHandle, 
            parseInt(current), 
            parseInt(best)
          );
          
          stats.totalAchievements += summary.totalAchievements;
          
          if (summary.nextProgress) {
            stats.upcomingMilestones.push({
              user: fullHandle,
              milestone: summary.nextProgress.nextMilestone,
              daysRemaining: summary.nextProgress.daysRemaining
            });
          }
        }
      }
    }

    return stats;
  }
}

module.exports = AchievementCelebrator;

// CLI usage
if (require.main === module) {
  console.log('🎊 Achievement Celebration Test\\n');
  
  const celebrator = new AchievementCelebrator();
  
  // Test with current streak data
  const testStreaks = `@demo_user: 1 days (best: 1)
@vibe_champion: 1 days (best: 1)`;

  celebrator.processStreaks(testStreaks).then(celebrations => {
    const result = celebrator.generateSummary(celebrations);
    const stats = celebrator.getStats(testStreaks);
    
    console.log('📊 STATS:');
    console.log(`Users: ${stats.totalUsers}`);
    console.log(`Active Streaks: ${stats.activeStreaks}`);
    console.log(`Total Achievements: ${stats.totalAchievements}`);
    console.log(`Upcoming Milestones: ${stats.upcomingMilestones.length}`);
    
    console.log('\\n🎉 CELEBRATIONS:');
    console.log(result.summary);
    
    if (result.actions.length > 0) {
      console.log('\\n📝 ACTIONS TO TAKE:');
      result.actions.forEach((action, i) => {
        console.log(`${i + 1}. ${action.type.toUpperCase()}: ${action.user || 'board'}`);
        console.log(`   "${action.message}"`);
      });
    }
  });
}