#!/usr/bin/env node
/**
 * Node.js migration runner for 002_add_audit_log.sql
 */

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_DATABASE_URL not set');
  process.exit(1);
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  AIRC v0.2 Migration 002 Runner (Audit Logging)           ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

async function runMigration() {
  const sql = neon(DATABASE_URL);

  console.log('📋 Reading migration file...');
  const migrationPath = path.join(__dirname, '002_add_audit_log.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log('✓ Migration file loaded\n');

  console.log('🔍 Pre-migration check...');
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('audit_log', 'admin_access_log', 'nonce_tracker')
    `;

    const existing = tables.map(t => t.table_name);

    if (existing.includes('audit_log')) {
      console.log('⚠️  Migration appears to already be applied (audit_log table exists)');
      console.log('   Existing tables:', existing.join(', '));
      console.log('');
      console.log('Skipping migration.');
      return;
    }

    console.log('✓ Tables not yet created\n');
  } catch (error) {
    console.error('❌ Pre-migration check failed:', error.message);
    process.exit(1);
  }

  console.log('🚀 Running migration...');

  try {
    const { Pool } = require('@neondatabase/serverless');
    const pool = new Pool({ connectionString: DATABASE_URL });

    console.log('   Executing migration SQL...');
    await pool.query(migrationSQL);

    await pool.end();

    console.log('✓ Migration executed successfully\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }

  console.log('🔍 Post-migration verification...');
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('audit_log', 'admin_access_log', 'nonce_tracker')
      ORDER BY table_name
    `;

    console.log('✓ Tables created:');
    tables.forEach(t => {
      console.log(`   - ${t.table_name}`);
    });
    console.log('');

    // Check revoked_at column
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'revoked_at'
    `;

    if (columns.length > 0) {
      console.log('✓ Added revoked_at column to users table\n');
    }

  } catch (error) {
    console.error('⚠️  Post-migration verification failed:', error.message);
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Migration 002 completed successfully! ✓                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Test key rotation endpoint:');
  console.log('     node migrations/test_rotation.js');
  console.log('');
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
