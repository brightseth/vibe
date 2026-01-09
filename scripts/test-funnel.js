#!/usr/bin/env node
/**
 * Test Funnel - Simulate fake agents going through /vibe onboarding
 *
 * Usage: node scripts/test-funnel.js [count]
 */

const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

const FAKE_AGENTS = [
  { handle: 'test_alice', building: 'AI art generator' },
  { handle: 'test_bob', building: 'crypto trading bot' },
  { handle: 'test_carol', building: 'social app for dogs' },
  { handle: 'test_dave', building: 'code review agent' },
  { handle: 'test_eve', building: 'music recommendation engine' },
];

async function post(endpoint, data) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function get(endpoint) {
  const res = await fetch(`${API_URL}${endpoint}`);
  return res.json();
}

async function simulateUser(agent, index) {
  console.log(`\n[${index + 1}] Simulating @${agent.handle}...`);

  // Step 1: Register presence (heartbeat)
  console.log('  → Registering presence...');
  try {
    const presRes = await post('/api/presence', {
      action: 'heartbeat',
      handle: agent.handle,
      workingOn: agent.building
    });
    console.log(`    ${presRes.success ? '✓' : '✗'} Presence: ${presRes.message || presRes.error || 'ok'}`);
  } catch (e) {
    console.log(`    ✗ Presence failed: ${e.message}`);
  }

  // Step 2: Track session_started event
  console.log('  → Tracking session_started...');
  try {
    const eventRes = await post('/api/events', {
      event: 'session_started',
      handle: agent.handle,
      metadata: { source: 'test-funnel' }
    });
    console.log(`    ${eventRes.success ? '✓' : '✗'} Event: ${eventRes.logged ? 'logged' : eventRes.error || 'failed'}`);
  } catch (e) {
    console.log(`    ✗ Event failed: ${e.message}`);
  }

  // Step 3: Track handle_claimed event
  console.log('  → Tracking handle_claimed...');
  try {
    const claimRes = await post('/api/events', {
      event: 'handle_claimed',
      handle: agent.handle,
      metadata: { source: 'test-funnel' }
    });
    console.log(`    ${claimRes.success ? '✓' : '✗'} Claim: ${claimRes.logged ? 'logged' : claimRes.error || 'failed'}`);
  } catch (e) {
    console.log(`    ✗ Claim failed: ${e.message}`);
  }

  // Step 4: Random chance of deeper engagement
  if (Math.random() > 0.5) {
    console.log('  → Tracking first_message_sent...');
    try {
      await post('/api/events', {
        event: 'first_message_sent',
        handle: agent.handle
      });
      console.log('    ✓ First message event logged');
    } catch (e) {
      console.log(`    ✗ Message event failed: ${e.message}`);
    }
  }

  if (Math.random() > 0.7) {
    console.log('  → Tracking first_game_played...');
    try {
      await post('/api/events', {
        event: 'first_game_played',
        handle: agent.handle
      });
      console.log('    ✓ Game event logged');
    } catch (e) {
      console.log(`    ✗ Game event failed: ${e.message}`);
    }
  }

  if (Math.random() > 0.8) {
    console.log('  → Tracking invite_generated...');
    try {
      await post('/api/events', {
        event: 'invite_generated',
        handle: agent.handle
      });
      console.log('    ✓ Invite event logged');
    } catch (e) {
      console.log(`    ✗ Invite event failed: ${e.message}`);
    }
  }

  // Small delay between users
  await new Promise(r => setTimeout(r, 500));
}

async function main() {
  const count = parseInt(process.argv[2]) || FAKE_AGENTS.length;
  const agents = FAKE_AGENTS.slice(0, count);

  console.log('╔════════════════════════════════════════╗');
  console.log('║     /vibe Funnel Test                  ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  API: ${API_URL.padEnd(32)}║`);
  console.log(`║  Testing ${count} fake agents              ║`);
  console.log('╚════════════════════════════════════════╝');

  // Run through each fake agent
  for (let i = 0; i < agents.length; i++) {
    await simulateUser(agents[i], i);
  }

  // Check results
  console.log('\n════════════════════════════════════════');
  console.log('Checking funnel stats...\n');

  try {
    const stats = await get('/api/stats');
    console.log(`Users: ${stats.users || stats.total_registered || '?'}`);
    console.log(`Active: ${stats.active_now || '?'}`);
  } catch (e) {
    console.log(`Stats check failed: ${e.message}`);
  }

  try {
    const events = await get('/api/events');
    console.log('\nToday\'s Funnel:');
    if (events.today) {
      console.log(`  session_started: ${events.today.session_started || 0}`);
      console.log(`  handle_claimed: ${events.today.handle_claimed || 0}`);
      console.log(`  first_message_sent: ${events.today.first_message_sent || 0}`);
      console.log(`  first_game_played: ${events.today.first_game_played || 0}`);
      console.log(`  invite_generated: ${events.today.invite_generated || 0}`);
    } else {
      console.log(`  (no data or error: ${events.error || 'unknown'})`);
    }
  } catch (e) {
    console.log(`Events check failed: ${e.message}`);
  }

  console.log('\n════════════════════════════════════════');
  console.log('Done! Check /dashboard for visualization.');
}

main().catch(console.error);
