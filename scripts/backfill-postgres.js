#!/usr/bin/env node
/**
 * Backfill Script: KV → Postgres Migration
 *
 * Reads existing data from Vercel KV and inserts into Neon Postgres.
 * Safe to run multiple times (uses ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   node scripts/backfill-postgres.js
 *
 * Requires environment variables:
 *   - KV_REST_API_URL
 *   - KV_REST_API_TOKEN
 *   - POSTGRES_DATABASE_URL (or DATABASE_URL)
 */

const { createClient } = require('@vercel/kv');
const { neon } = require('@neondatabase/serverless');

// Initialize clients
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const DATABASE_URL = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// Stats
const stats = {
  board: { found: 0, inserted: 0, skipped: 0, errors: 0 },
  streaks: { found: 0, inserted: 0, skipped: 0, errors: 0 },
  messages: { found: 0, inserted: 0, skipped: 0, errors: 0 },
};

async function backfillBoard() {
  console.log('\n📋 Backfilling board entries...');

  try {
    // Get all board entry IDs
    const entryIds = await kv.lrange('board:entries', 0, -1);
    console.log(`   Found ${entryIds.length} entry IDs in KV`);
    stats.board.found = entryIds.length;

    for (const id of entryIds) {
      try {
        const entry = await kv.get(`board:entry:${id}`);
        if (!entry) {
          stats.board.skipped++;
          continue;
        }

        // Insert into Postgres
        await sql`
          INSERT INTO board_entries (id, author, content, category, tags, created_at)
          VALUES (
            ${entry.id || id},
            ${entry.author},
            ${entry.content},
            ${entry.category || 'general'},
            ${entry.tags || []},
            ${entry.timestamp ? new Date(entry.timestamp) : new Date()}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        stats.board.inserted++;
        process.stdout.write('.');
      } catch (e) {
        stats.board.errors++;
        console.error(`\n   Error inserting ${id}: ${e.message}`);
      }
    }
    console.log(`\n   ✓ Board: ${stats.board.inserted} inserted, ${stats.board.skipped} skipped, ${stats.board.errors} errors`);
  } catch (e) {
    console.error('   Board backfill failed:', e.message);
  }
}

async function backfillStreaks() {
  console.log('\n🔥 Backfilling streaks...');

  try {
    // Get all streak keys
    const keys = await kv.keys('streak:*');
    console.log(`   Found ${keys.length} streak records in KV`);
    stats.streaks.found = keys.length;

    for (const key of keys) {
      try {
        const username = key.replace('streak:', '');
        const data = await kv.hgetall(key);

        if (!data) {
          stats.streaks.skipped++;
          continue;
        }

        // Insert into Postgres
        await sql`
          INSERT INTO streaks (username, current_streak, longest_streak, total_days, last_active)
          VALUES (
            ${username},
            ${parseInt(data.current || '0')},
            ${parseInt(data.longest || '0')},
            ${parseInt(data.totalDays || '0')},
            ${data.lastActive || null}
          )
          ON CONFLICT (username) DO UPDATE SET
            current_streak = GREATEST(streaks.current_streak, EXCLUDED.current_streak),
            longest_streak = GREATEST(streaks.longest_streak, EXCLUDED.longest_streak),
            total_days = GREATEST(streaks.total_days, EXCLUDED.total_days),
            last_active = COALESCE(EXCLUDED.last_active, streaks.last_active)
        `;
        stats.streaks.inserted++;
        process.stdout.write('.');
      } catch (e) {
        stats.streaks.errors++;
        console.error(`\n   Error inserting ${key}: ${e.message}`);
      }
    }
    console.log(`\n   ✓ Streaks: ${stats.streaks.inserted} inserted, ${stats.streaks.skipped} skipped, ${stats.streaks.errors} errors`);
  } catch (e) {
    console.error('   Streaks backfill failed:', e.message);
  }
}

async function backfillMessages() {
  console.log('\n💬 Backfilling messages...');
  console.log('   (Messages already dual-writing, checking for any missed...)');

  try {
    // Get all message keys - this is trickier because messages are stored per-user
    const keys = await kv.keys('messages:*');
    console.log(`   Found ${keys.length} message lists in KV`);

    const seenIds = new Set();

    for (const key of keys) {
      try {
        const messages = await kv.lrange(key, 0, -1);
        stats.messages.found += messages.length;

        for (const msgRaw of messages) {
          const msg = typeof msgRaw === 'string' ? JSON.parse(msgRaw) : msgRaw;

          // Skip if already seen (messages appear in multiple lists)
          if (seenIds.has(msg.id)) {
            stats.messages.skipped++;
            continue;
          }
          seenIds.add(msg.id);

          // Insert into Postgres
          await sql`
            INSERT INTO messages (id, from_user, to_user, text, read, payload, created_at)
            VALUES (
              ${msg.id},
              ${msg.from},
              ${msg.to},
              ${msg.body || msg.text},
              ${msg.read_at ? true : false},
              ${JSON.stringify({ type: msg.type || 'dm' })},
              ${msg.timestamp ? new Date(msg.timestamp) : new Date()}
            )
            ON CONFLICT (id) DO NOTHING
          `;
          stats.messages.inserted++;
          process.stdout.write('.');
        }
      } catch (e) {
        stats.messages.errors++;
      }
    }
    console.log(`\n   ✓ Messages: ${stats.messages.inserted} inserted, ${stats.messages.skipped} skipped (dupes), ${stats.messages.errors} errors`);
  } catch (e) {
    console.error('   Messages backfill failed:', e.message);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  /vibe Backfill: KV → Postgres');
  console.log('═══════════════════════════════════════════');

  // Check connections
  if (!DATABASE_URL) {
    console.error('❌ POSTGRES_DATABASE_URL or DATABASE_URL not set');
    process.exit(1);
  }

  if (!process.env.KV_REST_API_URL) {
    console.error('❌ KV_REST_API_URL not set');
    process.exit(1);
  }

  console.log('✓ Postgres URL configured');
  console.log('✓ KV URL configured');

  // Test Postgres connection
  try {
    const result = await sql`SELECT NOW() as time`;
    console.log(`✓ Postgres connected: ${result[0].time}`);
  } catch (e) {
    console.error('❌ Postgres connection failed:', e.message);
    process.exit(1);
  }

  // Run backfills
  await backfillBoard();
  await backfillStreaks();
  await backfillMessages();

  // Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════');
  console.log(`  Board:    ${stats.board.inserted}/${stats.board.found} migrated`);
  console.log(`  Streaks:  ${stats.streaks.inserted}/${stats.streaks.found} migrated`);
  console.log(`  Messages: ${stats.messages.inserted}/${stats.messages.found} migrated`);
  console.log('═══════════════════════════════════════════');

  const total = stats.board.inserted + stats.streaks.inserted + stats.messages.inserted;
  if (total > 0) {
    console.log(`\n✅ Backfill complete! ${total} records migrated to Postgres.`);
  } else {
    console.log('\n⚠️  No records migrated. Data may already be in Postgres or KV is empty.');
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
