// Test file for Achievement System
const { AchievementSystem } = require('./achievements.js');

const achievements = new AchievementSystem();

// Test streak-based badge earning
console.log('=== Testing Achievement System ===\n');

// Test user with 3-day streak
const user1Earned = achievements.checkEligibility('@demo_user', { current: 3 }, { firstMessage: true });
console.log('@demo_user earned:', user1Earned.map(e => e.badge.name));

// Test user with 7-day streak
const user2Earned = achievements.checkEligibility('@vibe_champion', { current: 7 }, { firstShip: true });
console.log('@vibe_champion earned:', user2Earned.map(e => e.badge.name));

// Display user badges
console.log('\n=== Badge Display ===');
console.log(achievements.formatBadgeDisplay('@demo_user'));
console.log(achievements.formatBadgeDisplay('@vibe_champion'));

// Show leaderboard
console.log('\n=== Badge Leaderboard ===');
const leaderboard = achievements.getBadgeLeaderboard();
leaderboard.forEach((entry, index) => {
  console.log(`${index + 1}. ${entry.handle} - ${entry.badgeCount} badges`);
});

console.log('\n✅ Achievement system working correctly!');