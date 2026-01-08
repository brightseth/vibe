// Achievement Badges System for /vibe Workshop
// Track and display key participation milestones

class BadgeSystem {
  constructor() {
    this.badges = {
      'first_ship': {
        name: 'First Ship 🚢',
        description: 'Shipped your first creation!',
        condition: 'ship_count >= 1'
      },
      'week_streak': {
        name: 'Week Warrior ⚡',
        description: '7 days of consistent participation',
        condition: 'streak >= 7'
      },
      'game_master': {
        name: 'Game Master 🎮',
        description: 'Created or played in workshop games',
        condition: 'game_participation >= 1'
      },
      'month_legend': {
        name: 'Monthly Legend 🏆',
        description: '30 days of dedication',
        condition: 'streak >= 30'
      },
      'vibe_keeper': {
        name: 'Vibe Keeper ✨',
        description: 'Consistently maintains positive workshop energy',
        condition: 'positive_interactions >= 10'
      }
    };
    
    this.userBadges = new Map(); // user -> Set of earned badges
    this.loadBadgeData();
  }

  loadBadgeData() {
    // In a real system, this would load from persistent storage
    // For now, initialize empty badge collections for tracked users
    this.userBadges.set('@demo_user', new Set());
    this.userBadges.set('@vibe_champion', new Set());
  }

  checkAndAwardBadges(user, stats) {
    if (!this.userBadges.has(user)) {
      this.userBadges.set(user, new Set());
    }

    const userBadgeSet = this.userBadges.get(user);
    const newBadges = [];

    // Check each badge condition
    for (const [badgeId, badge] of Object.entries(this.badges)) {
      if (!userBadgeSet.has(badgeId)) {
        if (this.evaluateCondition(badge.condition, stats)) {
          userBadgeSet.add(badgeId);
          newBadges.push({id: badgeId, ...badge});
        }
      }
    }

    return newBadges;
  }

  evaluateCondition(condition, stats) {
    // Simple condition evaluator
    // In practice, you'd want a more robust parser
    const { streak = 0, ship_count = 0, game_participation = 0, positive_interactions = 0 } = stats;
    
    return eval(condition.replace(/(\w+)/g, (match) => {
      return stats[match] !== undefined ? stats[match] : 0;
    }));
  }

  getUserBadges(user) {
    if (!this.userBadges.has(user)) return [];
    
    const badgeIds = Array.from(this.userBadges.get(user));
    return badgeIds.map(id => ({id, ...this.badges[id]}));
  }

  generateBadgeHTML(user) {
    const badges = this.getUserBadges(user);
    
    if (badges.length === 0) {
      return `<div class="no-badges">🌱 Start participating to earn badges!</div>`;
    }

    return `
      <div class="badge-collection">
        <h3>${user}'s Achievements</h3>
        <div class="badges">
          ${badges.map(badge => `
            <div class="badge">
              <span class="badge-icon">${badge.name.split(' ')[1] || '🏅'}</span>
              <div class="badge-info">
                <strong>${badge.name}</strong>
                <small>${badge.description}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

// Integration with existing streak system
function updateUserWithBadgeCheck(user, streakData) {
  const badgeSystem = new BadgeSystem();
  
  // Convert streak data to stats format for badge checking
  const stats = {
    streak: streakData.current,
    ship_count: streakData.ships || 0,
    game_participation: streakData.games || 0,
    positive_interactions: streakData.interactions || 0
  };

  const newBadges = badgeSystem.checkAndAwardBadges(user, stats);
  
  // Celebrate new badges!
  newBadges.forEach(badge => {
    console.log(`🎉 ${user} earned: ${badge.name}!`);
    // Could trigger celebration DM here
  });

  return {
    streakData,
    newBadges,
    allBadges: badgeSystem.getUserBadges(user)
  };
}

module.exports = { BadgeSystem, updateUserWithBadgeCheck };