#!/usr/bin/env node
/**
 * Run database migration for wallet columns
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Running wallet schema migration...\n');

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../api/migrations/add-wallet-columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log('Executing SQL migration...');
    const result = await pool.query(sql);

    console.log('\n✅ Migration completed successfully!\n');

    // Verify columns were added
    const verify = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('wallet_address', 'wallet_created_at', 'github_id')
      ORDER BY column_name;
    `);

    if (verify.rows.length > 0) {
      console.log('Verified new columns in users table:');
      verify.rows.forEach(row => {
        console.log(`  - ${row.column_name.padEnd(20)} ${row.data_type.padEnd(30)} (nullable: ${row.is_nullable})`);
      });
      console.log();
    }

    // Check wallet_events table
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'wallet_events'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('✅ wallet_events table created successfully\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Columns may already exist. Checking...\n');

      const check = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name IN ('wallet_address', 'wallet_created_at', 'github_id');
      `);

      console.log('Existing wallet columns:', check.rows.map(r => r.column_name).join(', '));
      console.log('\n✓ Wallet schema already in place.');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
