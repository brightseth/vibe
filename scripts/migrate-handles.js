#!/usr/bin/env node
/**
 * Handle Registry Migration
 *
 * Migrates existing users to the new handle registry.
 * Run this BEFORE launching publicly to grandfather existing users.
 *
 * Usage:
 *   node scripts/migrate-handles.js
 *   node scripts/migrate-handles.js --dry-run
 */

const { createClient } = require('@vercel/kv');

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
  console.error('❌ Missing KV environment variables');
  console.error('   Set KV_REST_API_URL and KV_REST_API_TOKEN');
  process.exit(1);
}

const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN
});

const dryRun = process.argv.includes('--dry-run');

async function migrate() {
  console.log(dryRun ? '🔍 DRY RUN MODE' : '🚀 MIGRATION MODE');
  console.log('');

  // 1. Get all existing sessions to find active handles
  console.log('📋 Scanning existing sessions...');
  const sessionKeys = await kv.keys('session:*');
  console.log(`   Found ${sessionKeys.length} sessions`);

  const activeHandles = new Set();
  for (const key of sessionKeys) {
    const session = await kv.get(key);
    if (session?.handle) {
      activeHandles.add(session.handle.toLowerCase());
    }
  }
  console.log(`   Found ${activeHandles.size} unique handles`);

  // 2. Get all existing presence data
  console.log('📋 Scanning presence data...');
  const presenceKeys = await kv.keys('presence:data:*');
  for (const key of presenceKeys) {
    const handle = key.replace('presence:data:', '');
    activeHandles.add(handle.toLowerCase());
  }
  console.log(`   Total unique handles: ${activeHandles.size}`);

  // 3. Check existing handle registry
  const existingRegistry = await kv.hgetall('vibe:handles') || {};
  const existingHandles = Object.keys(existingRegistry);
  console.log(`   Already registered: ${existingHandles.length}`);

  // 4. Migrate handles not yet in registry
  const toMigrate = [...activeHandles].filter(h => !existingHandles.includes(h));
  console.log(`   Need to migrate: ${toMigrate.length}`);
  console.log('');

  if (toMigrate.length === 0) {
    console.log('✅ All handles already migrated!');
    return;
  }

  console.log('📝 Migrating handles:');
  let migrated = 0;
  let failed = 0;

  for (const handle of toMigrate) {
    const record = {
      handle,
      registeredAt: new Date().toISOString(),
      registeredAtTs: Date.now(),
      verified: 'none',
      isAgent: false,
      operator: null,
      status: 'active',
      migrated: true,
      migratedAt: new Date().toISOString()
    };

    if (dryRun) {
      console.log(`   [DRY] Would register: @${handle}`);
      migrated++;
    } else {
      try {
        // Use HSETNX for atomic claim (won't overwrite existing)
        const success = await kv.hsetnx('vibe:handles', handle, JSON.stringify(record));
        if (success) {
          console.log(`   ✓ Registered: @${handle}`);
          migrated++;
        } else {
          console.log(`   - Skipped (already exists): @${handle}`);
        }
      } catch (e) {
        console.log(`   ✗ Failed: @${handle} - ${e.message}`);
        failed++;
      }
    }
  }

  console.log('');
  console.log('📊 Summary:');
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total in registry: ${existingHandles.length + migrated}`);

  // 5. Pre-seed system accounts
  console.log('');
  console.log('🔒 Pre-seeding system accounts...');

  const systemAccounts = ['vibe', 'system', 'solienne', 'scout', 'echo'];
  for (const handle of systemAccounts) {
    const record = {
      handle,
      registeredAt: new Date().toISOString(),
      registeredAtTs: Date.now(),
      verified: 'team',
      isAgent: true,
      operator: 'system',
      status: 'active',
      system: true
    };

    if (dryRun) {
      console.log(`   [DRY] Would reserve: @${handle}`);
    } else {
      const success = await kv.hsetnx('vibe:handles', handle, JSON.stringify(record));
      if (success) {
        console.log(`   ✓ Reserved: @${handle}`);
      } else {
        console.log(`   - Already reserved: @${handle}`);
      }
    }
  }

  console.log('');
  console.log('✅ Migration complete!');
}

migrate().catch(e => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
