// Achievement Badges System for /vibe workshop
// Tracks and awards badges for different milestones and activities

class AchievementSystem {
  constructor() {
    this.badges = {
      // Streak-based badges
      'getting_started': {
        name: 'Getting Started 🌱',
        description: 'Maintain a 3-day streak',
        threshold: 3,
        type: 'streak'
      },
      'week_warrior': {
        name: 'Week Warrior 💪',
        description: 'Maintain a 7-day streak',
        threshold: 7,
        type: 'streak'
      },
      'commitment_keeper': {
        name: 'Commitment Keeper 🔥',
        description: 'Maintain a 14-day streak',
        threshold: 14,
        type: 'streak'
      },
      'monthly_legend': {
        name: 'Monthly Legend 🏆',
        description: 'Maintain a 30-day streak',
        threshold: 30,
        type: 'streak'
      },
      'century_club': {
        name: 'Century Club 👑',
        description: 'Maintain a 100-day streak',
        threshold: 100,
        type: 'streak'
      },
      
      // Activity-based badges
      'first_ship': {
        name: 'First Ship ⛵',
        description: 'Ship your first project',
        type: 'activity'
      },
      'first_game': {
        name: 'Game Pioneer 🎮',
        description: 'Create your first game',
        type: 'activity'
      },
      'first_message': {
        name: 'Voice Heard 📢',
        description: 'Send your first message',
        type: 'activity'
      },
      'consistency_champion': {
        name: 'Consistency Champion 🎯',
        description: 'Visit 10 days in a month',
        type: 'consistency'
      },
      'comeback_kid': {
        name: 'Comeback Kid 🔄',
        description: 'Return after breaking a streak',
        type: 'recovery'
      }
    };
    
    this.userBadges = new Map(); // user -> Set of badge IDs
  }
  
  // Check if user qualifies for any new badges
  checkEligibility(handle, streakData, activityData = {}) {
    const earned = [];
    const userBadgeSet = this.userBadges.get(handle) || new Set();
    
    // Check streak-based badges
    Object.entries(this.badges).forEach(([badgeId, badge]) => {
      if (badge.type === 'streak' && !userBadgeSet.has(badgeId)) {
        if (streakData.current >= badge.threshold) {
          earned.push({ id: badgeId, badge });
          userBadgeSet.add(badgeId);
        }
      }
    });
    
    // Check activity-based badges
    if (activityData.firstShip && !userBadgeSet.has('first_ship')) {
      earned.push({ id: 'first_ship', badge: this.badges.first_ship });
      userBadgeSet.add('first_ship');
    }
    
    if (activityData.firstGame && !userBadgeSet.has('first_game')) {
      earned.push({ id: 'first_game', badge: this.badges.first_game });
      userBadgeSet.add('first_game');
    }
    
    if (activityData.firstMessage && !userBadgeSet.has('first_message')) {
      earned.push({ id: 'first_message', badge: this.badges.first_message });
      userBadgeSet.add('first_message');
    }
    
    this.userBadges.set(handle, userBadgeSet);
    return earned;
  }
  
  // Get all badges for a user
  getUserBadges(handle) {
    const badgeIds = this.userBadges.get(handle) || new Set();
    return Array.from(badgeIds).map(id => ({
      id,
      ...this.badges[id]
    }));
  }
  
  // Get leaderboard of most badges
  getBadgeLeaderboard() {
    const leaderboard = [];
    this.userBadges.forEach((badges, handle) => {
      leaderboard.push({
        handle,
        badgeCount: badges.size,
        badges: Array.from(badges).map(id => this.badges[id].name)
      });
    });
    
    return leaderboard.sort((a, b) => b.badgeCount - a.badgeCount);
  }
  
  // Format badge display for user
  formatBadgeDisplay(handle) {
    const badges = this.getUserBadges(handle);
    if (badges.length === 0) {
      return `${handle} - No badges yet! Keep building that streak! 🌟`;
    }
    
    const badgeList = badges.map(b => b.name).join(', ');
    return `${handle} - ${badges.length} badge${badges.length > 1 ? 's' : ''}: ${badgeList}`;
  }
}

module.exports = { AchievementSystem };