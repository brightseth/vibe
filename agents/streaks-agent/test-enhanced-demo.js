#!/usr/bin/env node

/**
 * Demo the enhanced streak system with simulated data
 */

const { runEnhancedStreakTracking, generateDailyStatsMessage } = require('./enhanced-mcp-runner.js');
const { DailyStatsTracker } = require('./daily-stats-enhanced.js');
const { AchievementSystem } = require('./achievements.js');

async function demo() {
  console.log('🎮 Demonstrating Enhanced Streak System\\n');
  
  // Simulate some user activity
  const statsTracker = new DailyStatsTracker();
  
  // Add some demo activity for a user
  console.log('📝 Simulating user activity...');
  
  statsTracker.recordActivity('demo_user', 'message', { content: 'Hello /vibe!' });
  statsTracker.recordActivity('demo_user', 'message', { content: 'How is everyone?' });
  statsTracker.recordActivity('demo_user', 'game', { game: 'word-association' });
  statsTracker.recordActivity('demo_user', 'online');
  
  statsTracker.recordActivity('vibe_champion', 'message', { content: 'Building something cool!' });
  statsTracker.recordActivity('vibe_champion', 'ship', { project: 'streak-tracker' });
  statsTracker.recordActivity('vibe_champion', 'online');
  
  console.log('✅ Simulated activity recorded\\n');
  
  // Run the enhanced tracking
  await runEnhancedStreakTracking();
  
  // Demo daily stats message
  console.log('\\n📧 Sample Daily Stats Message:');
  console.log('=' .repeat(50));
  const dailyMessage = generateDailyStatsMessage('demo_user');
  console.log(dailyMessage);
  console.log('=' .repeat(50));
  
  console.log('\\n🎉 Enhanced streak system demo complete!');
}

demo().catch(console.error);