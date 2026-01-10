#!/usr/bin/env node
/**
 * Node.js migration runner (alternative to bash script for systems without psql)
 * Runs 001_add_recovery_keys.sql migration
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
console.log('║  AIRC v0.2 Migration Runner (Node.js)                     ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

async function runMigration() {
  const sql = neon(DATABASE_URL);

  console.log('📋 Reading migration file...');
  const migrationPath = path.join(__dirname, '001_add_recovery_keys.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual statements (simple split on semicolon + newline)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`✓ Found ${statements.length} SQL statements\n`);

  console.log('🔍 Pre-migration check...');
  try {
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    const columnNames = columns.map(c => c.column_name);
    const hasRecoveryKey = columnNames.includes('recovery_key');

    if (hasRecoveryKey) {
      console.log('⚠️  Migration appears to already be applied (recovery_key column exists)');
      console.log('   Columns:', columnNames.join(', '));
      console.log('');
      console.log('Skipping migration.');
      return;
    }

    console.log('✓ Current columns:', columnNames.join(', '));
    console.log('');
  } catch (error) {
    console.error('❌ Pre-migration check failed:', error.message);
    process.exit(1);
  }

  console.log('🚀 Running migration...');

  try {
    // Read and execute the entire migration file as raw SQL
    // Neon's sql`` template doesn't work for DDL with variables, so we use the connection directly
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
    const newColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('recovery_key', 'registry', 'key_rotated_at', 'status')
      ORDER BY column_name
    `;

    console.log('✓ New columns added:');
    newColumns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    console.log('');

    // Check user status
    const statusCheck = await sql`
      SELECT status, COUNT(*) as count FROM users GROUP BY status
    `;
    console.log('✓ User status distribution:');
    statusCheck.forEach(row => {
      console.log(`   - ${row.status}: ${row.count} users`);
    });
    console.log('');

  } catch (error) {
    console.error('⚠️  Post-migration verification failed:', error.message);
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Migration completed successfully! ✓                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run backwards compatibility tests:');
  console.log('     node migrations/test_migration.js');
  console.log('');
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
