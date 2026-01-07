#!/usr/bin/env node

/**
 * 🏆 Streak Achievement Engine
 * Automatically tracks, awards, and celebrates streak milestones
 * Built by @streaks-agent for /vibe workshop
 */

class StreakAchievementEngine {
  constructor() {
    this.milestones = [
      { days: 3, emoji: '🌱', name: 'Seedling', message: 'Getting started! Every journey begins with a single step!' },
      { days: 7, emoji: '💪', name: 'Sprout', message: 'One week strong! You\'re building something real!' },
      { days: 14, emoji: '🔥', name: 'Growing', message: 'Two weeks! You\'re officially committed!' },
      { days: 30, emoji: '🏆', name: 'Blooming', message: 'Monthly legend! Your consistency is inspiring!' },
      { days: 100, emoji: '👑', name: 'Mighty Tree', message: 'Century club! You\'re a /vibe workshop legend!' }
    ];

    this.specialAchievements = {
      firstDay: { emoji: '🎉', name: 'First Day', message: 'Welcome to the journey!' },
      comebackKid: { emoji: '💫', name: 'Comeback Kid', message: 'Resilience is your strength!' },
      streakSaver: { emoji: '⭐', name: 'Streak Saver', message: 'Dedication recognized!' }
    };

    // In-memory achievement store (would be persistent in real system)
    this.userAchievements = new Map();
    this.celebratedMilestones = new Set();
  }

  /**
   * Check and award achievements for a user
   */
  checkAchievements(handle, currentStreak, bestStreak) {
    const achievements = [];
    
    // First day achievement
    if (currentStreak >= 1 && !this.hasAchievement(handle, 'firstDay')) {
      achievements.push(this.awardAchievement(handle, 'firstDay'));
    }

    // Milestone achievements
    for (const milestone of this.milestones) {
      const achievementKey = `milestone_${milestone.days}`;
      if (currentStreak >= milestone.days && !this.hasAchievement(handle, achievementKey)) {
        achievements.push(this.awardMilestone(handle, milestone));
      }
    }

    // Special achievements
    if (currentStreak >= 3 && !this.hasAchievement(handle, 'streakSaver')) {
      achievements.push(this.awardAchievement(handle, 'streakSaver'));
    }

    return achievements;
  }

  /**
   * Award a special achievement
   */
  awardAchievement(handle, achievementType) {
    const achievement = this.specialAchievements[achievementType];
    const key = `${handle}_${achievementType}`;
    
    if (!this.userAchievements.has(handle)) {
      this.userAchievements.set(handle, new Set());
    }
    
    this.userAchievements.get(handle).add(achievementType);
    
    return {
      handle,
      type: 'special',
      key: achievementType,
      name: achievement.name,
      emoji: achievement.emoji,
      message: achievement.message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Award a milestone achievement
   */
  awardMilestone(handle, milestone) {
    const achievementKey = `milestone_${milestone.days}`;
    
    if (!this.userAchievements.has(handle)) {
      this.userAchievements.set(handle, new Set());
    }
    
    this.userAchievements.get(handle).add(achievementKey);
    
    return {
      handle,
      type: 'milestone',
      key: achievementKey,
      days: milestone.days,
      name: milestone.name,
      emoji: milestone.emoji,
      message: milestone.message,
      timestamp: new Date().toISOString(),
      boardAnnounce: milestone.days >= 7 // Announce major milestones
    };
  }

  /**
   * Check if user has specific achievement
   */
  hasAchievement(handle, achievementKey) {
    return this.userAchievements.has(handle) && 
           this.userAchievements.get(handle).has(achievementKey);
  }

  /**
   * Get user's progress toward next milestone
   */
  getProgress(handle, currentStreak) {
    const nextMilestone = this.milestones.find(m => 
      currentStreak < m.days && !this.hasAchievement(handle, `milestone_${m.days}`)
    );

    if (!nextMilestone) return null;

    return {
      nextMilestone: nextMilestone.name,
      currentStreak,
      targetDays: nextMilestone.days,
      daysRemaining: nextMilestone.days - currentStreak,
      progressPercent: Math.round((currentStreak / nextMilestone.days) * 100),
      emoji: nextMilestone.emoji
    };
  }

  /**
   * Generate celebration message
   */
  generateCelebration(achievement) {
    const { handle, name, emoji, message } = achievement;
    
    return {
      dm: `${emoji} **${name}** achievement unlocked!\\n\\n${message}\\n\\nKeep building that streak, ${handle}! 🌟`,
      boardPost: achievement.boardAnnounce ? 
        `🎉 ${handle} just earned the **${name}** ${emoji} achievement! ${message}` : null
    };
  }

  /**
   * Get achievement summary for user
   */
  getUserSummary(handle, currentStreak, bestStreak) {
    const userAchievements = this.userAchievements.get(handle) || new Set();
    const progress = this.getProgress(handle, currentStreak);
    
    const milestoneCount = Array.from(userAchievements)
      .filter(a => a.startsWith('milestone_')).length;
    
    const specialCount = Array.from(userAchievements)
      .filter(a => !a.startsWith('milestone_')).length;

    return {
      handle,
      currentStreak,
      bestStreak,
      totalAchievements: userAchievements.size,
      milestoneAchievements: milestoneCount,
      specialAchievements: specialCount,
      nextProgress: progress,
      allAchievements: Array.from(userAchievements)
    };
  }
}

module.exports = StreakAchievementEngine;

// CLI usage for testing
if (require.main === module) {
  const engine = new StreakAchievementEngine();
  
  // Test with current users
  console.log('🏆 Testing Achievement Engine\\n');
  
  const users = [
    { handle: '@demo_user', streak: 1, best: 1 },
    { handle: '@vibe_champion', streak: 1, best: 1 }
  ];

  users.forEach(user => {
    console.log(`\\n--- ${user.handle} ---`);
    const achievements = engine.checkAchievements(user.handle, user.streak, user.best);
    const summary = engine.getUserSummary(user.handle, user.streak, user.best);
    
    console.log(`Streak: ${user.streak} days`);
    console.log(`New achievements: ${achievements.length}`);
    
    achievements.forEach(achievement => {
      const celebration = engine.generateCelebration(achievement);
      console.log(`\\n${achievement.emoji} ${achievement.name}`);
      console.log(`Message: ${celebration.dm}`);
    });
    
    if (summary.nextProgress) {
      const p = summary.nextProgress;
      console.log(`\\nNext: ${p.nextMilestone} ${p.emoji} (${p.daysRemaining} days, ${p.progressPercent}%)`);
    }
  });
}