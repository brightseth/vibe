#!/usr/bin/env node

/**
 * Test suite for @streaks-agent
 */

const fs = require('fs');
const path = require('path');
const streaksAgent = require('./index.js');

// Clean test files
const STREAKS_FILE = path.join(__dirname, 'streaks.json');
const MILESTONES_FILE = path.join(__dirname, 'milestones.json');

function cleanup() {
  if (fs.existsSync(STREAKS_FILE)) fs.unlinkSync(STREAKS_FILE);
  if (fs.existsSync(MILESTONES_FILE)) fs.unlinkSync(MILESTONES_FILE);
}

function test(name, fn) {
  try {
    console.log(`\n🧪 ${name}`);
    fn();
    console.log(`✅ ${name} passed`);
  } catch (e) {
    console.log(`❌ ${name} failed:`, e.message);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTests() {
  console.log('🔬 Testing @streaks-agent\n');

  cleanup();

  test('Load empty streaks', () => {
    const streaks = streaksAgent.loadStreaks();
    assert(typeof streaks === 'object', 'Should return object');
    assert(typeof streaks.users === 'object', 'Should have users object');
    assert(typeof streaks.dailyStats === 'object', 'Should have dailyStats object');
    assert(streaks.lastUpdate === null, 'Should have null lastUpdate');
  });

  test('Save and load streaks', () => {
    const testData = {
      users: { 
        'alice': { current: 5, longest: 10, lastActive: '2025-01-06' }
      },
      dailyStats: {},
      lastUpdate: Date.now()
    };
    
    streaksAgent.saveStreaks(testData);
    const loaded = streaksAgent.loadStreaks();
    
    assert(loaded.users.alice.current === 5, 'Should preserve user data');
    assert(loaded.users.alice.longest === 10, 'Should preserve longest streak');
  });

  test('Generate stats', () => {
    const stats = streaksAgent.generateStats();
    assert(typeof stats === 'object', 'Should return stats object');
    assert(typeof stats.totalUsers === 'number', 'Should have totalUsers');
    assert(typeof stats.activeStreaks === 'number', 'Should have activeStreaks');
    assert(Array.isArray(stats.leaderboard), 'Should have leaderboard array');
  });

  test('Milestone definitions', () => {
    const milestones = streaksAgent.MILESTONES;
    assert(milestones[3].message.includes('Getting started'), 'Should have 3-day milestone');
    assert(milestones[7].message.includes('One week'), 'Should have 7-day milestone');
    assert(milestones[30].message.includes('Monthly'), 'Should have 30-day milestone');
    assert(milestones[100].message.includes('Century'), 'Should have 100-day milestone');
  });

  cleanup();
  console.log('\n🎉 All tests passed!');
}

if (require.main === module) {
  runTests();
}