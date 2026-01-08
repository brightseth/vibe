// Achievement Badges System for /vibe Workshop
// Track and celebrate workshop participation milestones

class AchievementSystem {
  constructor() {
    this.badges = {
      'first_ship': {
        name: 'First Ship 🚢',
        description: 'Posted your first project to the board',
        criteria: 'ship_count >= 1'
      },
      'week_streak': {
        name: 'Week Streak 🔥',
        description: 'Stayed active for 7 consecutive days',
        criteria: 'streak_current >= 7'
      },
      'game_master': {
        name: 'Game Master 🎮',
        description: 'Created or contributed to a game project',
        criteria: 'game_projects >= 1'
      },
      'consistent_creator': {
        name: 'Consistent Creator ⭐',
        description: 'Shipped 5 projects',
        criteria: 'ship_count >= 5'
      },
      'community_champion': {
        name: 'Community Champion 👑',
        description: 'Reached 30-day streak',
        criteria: 'streak_current >= 30'
      }
    };
    
    this.userBadges = new Map(); // user -> Set of badge_ids
    this.userStats = new Map();  // user -> stats object
  }

  // Check if user has earned new badges
  checkAchievements(handle, stats) {
    const currentBadges = this.userBadges.get(handle) || new Set();
    const newBadges = [];

    for (const [badgeId, badge] of Object.entries(this.badges)) {
      if (!currentBadges.has(badgeId) && this.meetsRequirements(stats, badge.criteria)) {
        currentBadges.add(badgeId);
        newBadges.push({ id: badgeId, ...badge });
      }
    }

    this.userBadges.set(handle, currentBadges);
    this.userStats.set(handle, stats);
    
    return newBadges;
  }

  meetsRequirements(stats, criteria) {
    // Simple criteria parser - can be expanded
    const conditions = {
      'ship_count >= 1': stats.ships >= 1,
      'ship_count >= 5': stats.ships >= 5,
      'streak_current >= 7': stats.currentStreak >= 7,
      'streak_current >= 30': stats.currentStreak >= 30,
      'game_projects >= 1': stats.gameProjects >= 1
    };
    
    return conditions[criteria] || false;
  }

  getUserBadges(handle) {
    const badgeIds = this.userBadges.get(handle) || new Set();
    return Array.from(badgeIds).map(id => ({ id, ...this.badges[id] }));
  }

  getBadgeDisplay(handle) {
    const badges = this.getUserBadges(handle);
    if (badges.length === 0) return '';
    
    return badges.map(badge => badge.name).join(' ');
  }

  // Integration with existing streak system
  updateFromStreakData(streakData) {
    const updates = [];
    
    for (const [handle, streakInfo] of Object.entries(streakData)) {
      const stats = {
        currentStreak: streakInfo.current || 0,
        bestStreak: streakInfo.best || 0,
        ships: streakInfo.ships || 0,
        gameProjects: streakInfo.gameProjects || 0
      };
      
      const newBadges = this.checkAchievements(handle, stats);
      if (newBadges.length > 0) {
        updates.push({ handle, badges: newBadges });
      }
    }
    
    return updates;
  }
}

// Export for use by streaks-agent
module.exports = AchievementSystem;

// Example usage:
/*
const achievements = new AchievementSystem();

// When someone ships something:
const newBadges = achievements.checkAchievements('@user', {
  ships: 1,
  currentStreak: 5,
  gameProjects: 0
});

// Celebrate new achievements:
newBadges.forEach(badge => {
  console.log(`🎉 @user earned: ${badge.name} - ${badge.description}`);
});
*/