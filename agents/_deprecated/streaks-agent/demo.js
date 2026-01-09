#!/usr/bin/env node

/**
 * Demo script to show streak tracking in action
 */

const { 
  updateUserStreak, 
  checkMilestone, 
  generateLeaderboard,
  generateStats 
} = require('./mcp-integration.js');

console.log('🔥 Streaks Agent Demo');
console.log('====================\n');

// Simulate some users being active
const demoUsers = ['alice', 'bob', 'charlie'];

console.log('📊 Initial state:');
console.log(generateStats());
console.log('\n');

// Day 1: Everyone starts
console.log('🌅 Day 1: New users join!');
demoUsers.forEach(handle => {
  const user = updateUserStreak(handle, 'active');
  const milestone = checkMilestone(handle);
  if (milestone) {
    console.log(`🎉 ${handle} hit milestone: ${milestone.milestone} days! ${milestone.emoji}`);
  }
});

console.log('\n📈 After Day 1:');
console.log('Leaderboard:', generateLeaderboard());

// Simulate Day 2 (alice continues, bob breaks streak)
console.log('\n🌅 Day 2: Some continue, some break...');
updateUserStreak('alice', 'active');
updateUserStreak('charlie', 'active');
// bob doesn't show up, streak will break

console.log('\n📈 After Day 2:');
console.log('Leaderboard:', generateLeaderboard());

// Simulate Alice hitting 3 day milestone
console.log('\n🌅 Day 3: Alice keeps going!');
const aliceDay3 = updateUserStreak('alice', 'active');
const aliceMilestone = checkMilestone('alice');
if (aliceMilestone) {
  console.log(`🎊 MILESTONE! Alice hit ${aliceMilestone.milestone} days: ${aliceMilestone.message}`);
}

console.log('\n🏆 Final Leaderboard:');
console.log(generateLeaderboard());

console.log('\n📊 Final Stats:');
console.log(generateStats());

console.log('\n✨ Demo complete! Streak tracking system ready to roll.');