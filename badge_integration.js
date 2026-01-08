// Integration between achievement badges and streak tracking
// For @streaks-agent to use

const AchievementSystem = require('./achievements.js');

class BadgeTracker {
  constructor() {
    this.achievements = new AchievementSystem();
    this.lastCelebrated = new Set(); // Prevent duplicate celebrations
  }

  // Call this after updating streaks
  async processAchievements(streakData, agentFunctions) {
    const updates = this.achievements.updateFromStreakData(streakData);
    
    for (const { handle, badges } of updates) {
      for (const badge of badges) {
        const celebrationKey = `${handle}_${badge.id}`;
        
        if (!this.lastCelebrated.has(celebrationKey)) {
          // Send DM celebration
          await agentFunctions.dm_user(
            handle,
            `🎉 Achievement unlocked: ${badge.name}\n${badge.description}\n\nKeep up the great work!`
          );
          
          // Post notable milestones to board
          if (badge.id === 'week_streak' || badge.id === 'community_champion' || badge.id === 'game_master') {
            await agentFunctions.announce_ship(
              `🏆 ${handle} earned ${badge.name} badge! ${badge.description}`
            );
          }
          
          this.lastCelebrated.add(celebrationKey);
        }
      }
    }
    
    return updates.length > 0 ? updates : null;
  }

  getBadgeSummary() {
    const allUsers = Array.from(this.achievements.userBadges.keys());
    return allUsers.map(handle => ({
      handle,
      badges: this.achievements.getUserBadges(handle),
      display: this.achievements.getBadgeDisplay(handle)
    }));
  }

  // Generate leaderboard by badges earned
  getBadgeLeaderboard() {
    const summary = this.getBadgeSummary();
    return summary
      .sort((a, b) => b.badges.length - a.badges.length)
      .slice(0, 10);
  }
}

module.exports = BadgeTracker;

// Usage example for streaks-agent:
/*
const badgeTracker = new BadgeTracker();

// After observe_vibe updates streaks:
const agentFunctions = { dm_user, announce_ship };
const achievements = await badgeTracker.processAchievements(streakData, agentFunctions);

if (achievements) {
  console.log(`Celebrated ${achievements.length} new achievements!`);
}
*/