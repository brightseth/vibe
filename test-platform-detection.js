#!/usr/bin/env node
/**
 * Test platform detection logic
 * Shows which platform each recipient format maps to
 */

const router = require('./lib/messaging/router');

const testRecipients = [
  // Gmail
  'seth@vibecodings.com',
  'founder@startup.com',
  'user@example.org',

  // X/Twitter
  '@naval',
  '@elonmusk',
  '@sama',

  // Farcaster
  '@dwr.farcaster',
  '@vitalik.fc',
  'user.farcaster',

  // Telegram
  '123456789',
  '-1001234567890',
  't.me/username',

  // Discord
  '987654321098765432',
  'user#1234',

  // WhatsApp
  '+14155551234',
  '+442071234567',

  // /vibe internal
  '@alice',
  '@bob',
  'charlie'
];

console.log('🔍 Platform Detection Test\n');
console.log('Recipient → Platform\n');

for (const recipient of testRecipients) {
  const platform = router.detectPlatform(recipient);
  const emoji = {
    gmail: '📧',
    x: '🐦',
    farcaster: '🎭',
    telegram: '📱',
    discord: '🎮',
    whatsapp: '💬',
    vibe: '💬'
  }[platform] || '●';

  console.log(`${emoji} ${recipient.padEnd(30)} → ${platform}`);
}

console.log('\n✓ Platform detection logic working!');
console.log('\nRestart Claude Code, then test with:');
console.log('  vibe dm seth@vibecodings.com "Test message"');
