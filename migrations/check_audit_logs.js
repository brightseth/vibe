#!/usr/bin/env node
/**
 * Check audit logs for recent rotation events
 */

const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_DATABASE_URL not set');
  process.exit(1);
}

async function checkAuditLogs() {
  const sql = neon(DATABASE_URL);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Audit Log Verification                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Check recent audit logs
  console.log('📋 Recent rotation events (last 10):');
  console.log('');

  try {
    const logs = await sql`
      SELECT id, event_type, handle, details, created_at
      FROM audit_log
      WHERE event_type = 'key_rotation'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    if (logs.length === 0) {
      console.log('⚠️  No audit logs found');
      console.log('   This could mean:');
      console.log('   - No rotations have been performed yet');
      console.log('   - Audit logging is not working');
      console.log('');
      return;
    }

    logs.forEach(log => {
      const details = log.details;
      const timestamp = new Date(log.created_at).toISOString();

      console.log(`  ${log.id} (@${log.handle})`);
      console.log(`    Time: ${timestamp}`);
      console.log(`    Success: ${details.success}`);

      if (details.success) {
        console.log(`    Old Key: ${details.old_public_key?.substring(0, 30)}...`);
        console.log(`    New Key: ${details.new_public_key?.substring(0, 30)}...`);
      } else {
        console.log(`    Failure: ${details.failure_reason}`);
      }

      console.log('');
    });

    // Summary statistics
    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE (details->>'success')::boolean = true) as successful,
        COUNT(*) FILTER (WHERE (details->>'success')::boolean = false) as failed,
        COUNT(*) as total
      FROM audit_log
      WHERE event_type = 'key_rotation'
    `;

    console.log('📊 Statistics:');
    console.log(`   Total rotations: ${stats[0].total}`);
    console.log(`   Successful: ${stats[0].successful}`);
    console.log(`   Failed: ${stats[0].failed}`);
    console.log('');

    // Check failure reasons
    const failures = await sql`
      SELECT details->>'failure_reason' as reason, COUNT(*) as count
      FROM audit_log
      WHERE event_type = 'key_rotation'
      AND (details->>'success')::boolean = false
      GROUP BY details->>'failure_reason'
      ORDER BY count DESC
      LIMIT 5
    `;

    if (failures.length > 0) {
      console.log('🔍 Top failure reasons:');
      failures.forEach(f => {
        console.log(`   ${f.reason}: ${f.count}`);
      });
      console.log('');
    }

    // Check nonce tracker
    const nonces = await sql`
      SELECT COUNT(*) as count,
             COUNT(*) FILTER (WHERE expires_at > NOW()) as active
      FROM nonce_tracker
    `;

    console.log('🔐 Nonce tracker:');
    console.log(`   Total nonces: ${nonces[0].count}`);
    console.log(`   Active (not expired): ${nonces[0].active}`);
    console.log('');

    console.log('✅ Audit logging is working correctly!');

  } catch (error) {
    console.error('❌ Error querying audit logs:', error.message);
    process.exit(1);
  }
}

checkAuditLogs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
