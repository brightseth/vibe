/**
 * Badge System Integration with Streak Tracking
 * Shows how @streaks-agent can use the badge system
 */

const BadgeSystem = require('./badges_system.js');

class StreaksBadgeIntegration {
  constructor() {
    this.badgeSystem = new BadgeSystem();
    this.userActivity = new Map(); // Cache user activity data
  }

  /**
   * Update user activity and check for new badges
   * Called when streaks are updated
   */
  async updateUserActivity(handle, activityData) {
    // Store activity data
    this.userActivity.set(handle, {
      ...activityData,
      lastUpdate: new Date().toISOString()
    });

    // Check for new badge eligibility
    const newBadges = this.badgeSystem.checkBadgeEligibility(handle, activityData);
    
    // Award new badges and celebrate
    for (const badgeId of newBadges) {
      const awarded = this.badgeSystem.awardBadge(handle, badgeId);
      if (awarded) {
        await this.celebrateBadge(handle, badgeId);
      }
    }

    return newBadges.length;
  }

  /**
   * Celebrate badge achievement
   */
  async celebrateBadge(handle, badgeId) {
    const message = this.badgeSystem.createCelebrationMessage(handle, badgeId);
    
    // Send DM to user
    await this.dmUser(handle, message);
    
    // Announce major badges to board
    const badge = this.badgeSystem.badges[badgeId];
    if (badge.tier === 'gold' || badge.tier === 'legendary') {
      await this.announceShip(`🏆 ${handle} earned "${badge.name}" badge! ${badge.emoji} ${badge.description}`);
    }
  }

  /**
   * Generate badge summary for user
   */
  getBadgeSummary(handle) {
    const badges = this.badgeSystem.getUserBadges(handle);
    if (badges.length === 0) {
      return "No badges yet - keep shipping to earn your first! 🚀";
    }

    const display = this.badgeSystem.getBadgeDisplay(handle);
    const recent = badges
      .sort((a, b) => new Date(b.earnedDate) - new Date(a.earnedDate))
      .slice(0, 3)
      .map(b => `${b.emoji} ${b.name}`)
      .join(', ');

    return `${display}\nRecent: ${recent}`;
  }

  /**
   * Create weekly badge leaderboard
   */
  getWeeklyBadgeReport() {
    const leaderboard = this.badgeSystem.getBadgeLeaderboard();
    
    if (leaderboard.length === 0) {
      return "No badges earned yet! Be the first to ship something! 🚀";
    }

    let report = "🏆 BADGE LEADERBOARD 🏆\n\n";
    
    leaderboard.slice(0, 5).forEach((user, index) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
      const badgeDisplay = user.badges.map(b => b.emoji).join('');
      report += `${medal} ${user.handle}: ${user.totalBadges} badges ${badgeDisplay}\n`;
    });

    report += `\nTotal badges in workshop: ${leaderboard.reduce((sum, u) => sum + u.totalBadges, 0)} 🎖️`;
    
    return report;
  }

  /**
   * Mock functions - replace with actual API calls
   */
  async dmUser(handle, message) {
    console.log(`DM to ${handle}: ${message}`);
    // In real implementation: dm_user(handle, message)
  }

  async announceShip(message) {
    console.log(`Board announcement: ${message}`);
    // In real implementation: announce_ship(message)
  }
}

// Example usage with streak data
const integration = new StreaksBadgeIntegration();

// Simulate streak updates triggering badge checks
async function exampleUsage() {
  console.log('\n=== Badge Integration Example ===\n');

  // User with first ship
  await integration.updateUserActivity('@demo_user', {
    currentStreak: 1,
    bestStreak: 1,
    ships: 1,
    games: 0,
    joinDate: '2026-01-01'
  });

  // User with week streak
  await integration.updateUserActivity('@vibe_champion', {
    currentStreak: 7,
    bestStreak: 7,
    ships: 3,
    games: 1,
    joinDate: '2025-12-15'
  });

  // Show badge summaries
  console.log('\n--- Badge Summaries ---');
  console.log('@demo_user:', integration.getBadgeSummary('@demo_user'));
  console.log('@vibe_champion:', integration.getBadgeSummary('@vibe_champion'));

  // Show leaderboard
  console.log('\n--- Leaderboard ---');
  console.log(integration.getWeeklyBadgeReport());
}

// Run example
exampleUsage();

module.exports = StreaksBadgeIntegration;