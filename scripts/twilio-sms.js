#!/usr/bin/env node
/**
 * Twilio SMS helper for /vibe
 *
 * Usage:
 *   node scripts/twilio-sms.js list      - List available numbers to buy
 *   node scripts/twilio-sms.js buy       - Buy a number
 *   node scripts/twilio-sms.js numbers   - List your numbers
 *   node scripts/twilio-sms.js inbox     - Check incoming SMS
 */

const twilio = require('twilio');

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;

if (!TWILIO_SID || !TWILIO_AUTH) {
  console.error('Error: TWILIO_SID and TWILIO_AUTH_TOKEN environment variables required');
  process.exit(1);
}

const client = twilio(TWILIO_SID, TWILIO_AUTH);

async function listAvailable() {
  console.log('🔍 Searching for available US numbers...\n');

  const numbers = await client.availablePhoneNumbers('US')
    .local
    .list({ smsEnabled: true, limit: 5 });

  if (numbers.length === 0) {
    console.log('No numbers available. Try a different area code.');
    return;
  }

  console.log('Available numbers:');
  numbers.forEach((n, i) => {
    console.log(`  ${i + 1}. ${n.phoneNumber} (${n.locality}, ${n.region})`);
  });

  console.log('\nRun with "buy" to purchase the first one, or buy manually at console.twilio.com');
}

async function buyNumber() {
  console.log('🛒 Finding and buying a number...\n');

  const available = await client.availablePhoneNumbers('US')
    .local
    .list({ smsEnabled: true, limit: 1 });

  if (available.length === 0) {
    console.log('No numbers available!');
    return;
  }

  const number = available[0].phoneNumber;
  console.log(`Buying: ${number}...`);

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: number,
    friendlyName: 'vibe-social'
  });

  console.log(`✅ Purchased: ${purchased.phoneNumber}`);
  console.log(`   SID: ${purchased.sid}`);
  console.log(`   Friendly Name: ${purchased.friendlyName}`);
  console.log('\nUse this number for Twitter verification!');
}

async function listMyNumbers() {
  console.log('📱 Your Twilio numbers:\n');

  const numbers = await client.incomingPhoneNumbers.list({ limit: 10 });

  if (numbers.length === 0) {
    console.log('No numbers yet. Run with "buy" to get one.');
    return;
  }

  numbers.forEach(n => {
    console.log(`  ${n.phoneNumber} (${n.friendlyName || 'no name'})`);
    console.log(`    SID: ${n.sid}`);
    console.log(`    SMS URL: ${n.smsUrl || 'not configured'}`);
    console.log('');
  });
}

async function checkInbox() {
  console.log('📨 Recent incoming SMS:\n');

  const messages = await client.messages.list({
    limit: 10
  });

  const incoming = messages.filter(m => m.direction === 'inbound');

  if (incoming.length === 0) {
    console.log('No incoming messages yet.');
    console.log('After requesting Twitter verification, run this again to see the code.');
    return;
  }

  incoming.forEach(m => {
    const date = new Date(m.dateCreated).toLocaleString();
    console.log(`  From: ${m.from}`);
    console.log(`  To: ${m.to}`);
    console.log(`  Date: ${date}`);
    console.log(`  Body: ${m.body}`);
    console.log('  ---');
  });
}

// Main
const command = process.argv[2] || 'numbers';

(async () => {
  try {
    switch (command) {
      case 'list':
        await listAvailable();
        break;
      case 'buy':
        await buyNumber();
        break;
      case 'numbers':
        await listMyNumbers();
        break;
      case 'inbox':
        await checkInbox();
        break;
      default:
        console.log('Usage: node scripts/twilio-sms.js [list|buy|numbers|inbox]');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
