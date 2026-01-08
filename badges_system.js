/**
 * Achievement Badges System for /vibe Workshop
 * Tracks and awards badges for workshop participation milestones
 */

class BadgeSystem {
  constructor() {
    this.badges = {
      // Shipping Badges
      'first_ship': {
        name: 'First Ship',
        emoji: '🚀',
        description: 'Shipped your first project!',
        criteria: 'Ship 1 project',
        tier: 'bronze'
      },
      'consistent_shipper': {
        name: 'Consistent Shipper', 
        emoji: '📦',
        description: 'Shipped 5 projects',
        criteria: 'Ship 5 projects',
        tier: 'silver'
      },
      'shipping_legend': {
        name: 'Shipping Legend',
        emoji: '🏆',
        description: 'Shipped 25+ projects',
        criteria: 'Ship 25 projects', 
        tier: 'gold'
      },

      // Streak Badges
      'week_streak': {
        name: 'Week Streak',
        emoji: '🔥',
        description: 'Active for 7 consecutive days',
        criteria: '7 day streak',
        tier: 'bronze'
      },
      'month_warrior': {
        name: 'Month Warrior',
        emoji: '⚔️',
        description: 'Active for 30 consecutive days', 
        criteria: '30 day streak',
        tier: 'silver'
      },
      'century_club': {
        name: 'Century Club',
        emoji: '👑',
        description: 'Active for 100 consecutive days',
        criteria: '100 day streak',
        tier: 'gold'
      },

      // Game Badges
      'game_master': {
        name: 'Game Master',
        emoji: '🎮',
        description: 'Created a game in the workshop',
        criteria: 'Ship 1 game project',
        tier: 'silver'
      },
      'game_innovator': {
        name: 'Game Innovator', 
        emoji: '🎯',
        description: 'Created 5+ games',
        criteria: 'Ship 5 games',
        tier: 'gold'
      },

      // Community Badges
      'early_adopter': {
        name: 'Early Adopter',
        emoji: '🌱',
        description: 'Joined the workshop in its early days',
        criteria: 'Join before user #50',
        tier: 'bronze'
      },
      'mentor': {
        name: 'Mentor',
        emoji: '🎓',
        description: 'Helped onboard 3+ new members',
        criteria: 'Mentor 3 users',
        tier: 'silver'
      },
      'vibe_champion': {
        name: 'Vibe Champion',
        emoji: '✨',
        description: 'Embodies the workshop spirit',
        criteria: 'Special recognition',
        tier: 'legendary'
      }
    };

    this.userBadges = new Map(); // handle -> Set of badge IDs
    this.badgeHistory = new Map(); // handle -> array of {badge, date, milestone}
  }

  /**
   * Check if user qualifies for any new badges
   * @param {string} handle - User handle
   * @param {Object} userData - User's activity data
   */
  checkBadgeEligibility(handle, userData) {
    const newBadges = [];
    const userBadgeSet = this.userBadges.get(handle) || new Set();

    // Shipping badges
    if (userData.ships >= 1 && !userBadgeSet.has('first_ship')) {
      newBadges.push('first_ship');
    }
    if (userData.ships >= 5 && !userBadgeSet.has('consistent_shipper')) {
      newBadges.push('consistent_shipper');
    }
    if (userData.ships >= 25 && !userBadgeSet.has('shipping_legend')) {
      newBadges.push('shipping_legend');
    }

    // Streak badges
    if (userData.currentStreak >= 7 && !userBadgeSet.has('week_streak')) {
      newBadges.push('week_streak');
    }
    if (userData.currentStreak >= 30 && !userBadgeSet.has('month_warrior')) {
      newBadges.push('month_warrior');
    }
    if (userData.currentStreak >= 100 && !userBadgeSet.has('century_club')) {
      newBadges.push('century_club');
    }

    // Game badges
    if (userData.games >= 1 && !userBadgeSet.has('game_master')) {
      newBadges.push('game_master');
    }
    if (userData.games >= 5 && !userBadgeSet.has('game_innovator')) {
      newBadges.push('game_innovator');
    }

    return newBadges;
  }

  /**
   * Award badge to user
   * @param {string} handle - User handle
   * @param {string} badgeId - Badge identifier
   */
  awardBadge(handle, badgeId) {
    if (!this.badges[badgeId]) return false;

    let userBadgeSet = this.userBadges.get(handle) || new Set();
    if (userBadgeSet.has(badgeId)) return false; // Already has badge

    userBadgeSet.add(badgeId);
    this.userBadges.set(handle, userBadgeSet);

    // Add to history
    let history = this.badgeHistory.get(handle) || [];
    history.push({
      badge: badgeId,
      date: new Date().toISOString(),
      milestone: this.badges[badgeId].criteria
    });
    this.badgeHistory.set(handle, history);

    return true;
  }

  /**
   * Get user's badges with display info
   * @param {string} handle - User handle
   */
  getUserBadges(handle) {
    const userBadgeSet = this.userBadges.get(handle) || new Set();
    return Array.from(userBadgeSet).map(badgeId => ({
      id: badgeId,
      ...this.badges[badgeId],
      earnedDate: this.badgeHistory.get(handle)?.find(h => h.badge === badgeId)?.date
    }));
  }

  /**
   * Generate badge display string for user
   * @param {string} handle - User handle
   */
  getBadgeDisplay(handle) {
    const badges = this.getUserBadges(handle);
    if (badges.length === 0) return '';

    const badgeEmojis = badges.map(b => b.emoji).join(' ');
    return `${badgeEmojis} (${badges.length} badges)`;
  }

  /**
   * Get leaderboard of badge collectors
   */
  getBadgeLeaderboard() {
    const leaderboard = [];
    
    for (const [handle, badgeSet] of this.userBadges) {
      const badges = this.getUserBadges(handle);
      const tierCounts = {
        legendary: badges.filter(b => b.tier === 'legendary').length,
        gold: badges.filter(b => b.tier === 'gold').length,
        silver: badges.filter(b => b.tier === 'silver').length,
        bronze: badges.filter(b => b.tier === 'bronze').length
      };

      leaderboard.push({
        handle,
        totalBadges: badges.length,
        tierCounts,
        badges: badges.map(b => ({ name: b.name, emoji: b.emoji, tier: b.tier }))
      });
    }

    // Sort by total badges, then by tier quality
    return leaderboard.sort((a, b) => {
      if (a.totalBadges !== b.totalBadges) return b.totalBadges - a.totalBadges;
      
      const aScore = a.tierCounts.legendary * 4 + a.tierCounts.gold * 3 + 
                     a.tierCounts.silver * 2 + a.tierCounts.bronze * 1;
      const bScore = b.tierCounts.legendary * 4 + b.tierCounts.gold * 3 + 
                     b.tierCounts.silver * 2 + b.tierCounts.bronze * 1;
      return bScore - aScore;
    });
  }

  /**
   * Create celebration message for new badge
   * @param {string} handle - User handle
   * @param {string} badgeId - Badge ID
   */
  createCelebrationMessage(handle, badgeId) {
    const badge = this.badges[badgeId];
    if (!badge) return '';

    const tierMessages = {
      bronze: "Nice work!",
      silver: "Impressive dedication!",
      gold: "Legendary achievement!",
      legendary: "You're workshop royalty! 👑"
    };

    return `🎉 ${handle} earned the "${badge.name}" badge! ${badge.emoji}

${badge.description}
${tierMessages[badge.tier]}

Keep up the amazing work! ✨`;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BadgeSystem;
}

// Initialize global badge system
const workshopBadges = new BadgeSystem();

// Example usage and API
console.log('Achievement Badges System initialized! 🏆');
console.log('Available badges:', Object.keys(workshopBadges.badges).length);
console.log('Tiers: Bronze 🥉, Silver 🥈, Gold 🥇, Legendary 👑');