import { sql, isPostgresEnabled } from './api/lib/db.js';

async function cleanup() {
  if (!isPostgresEnabled() || !sql) {
    console.log('Postgres not enabled');
    return;
  }

  try {
    // Show current users
    const before = await sql`SELECT username, building FROM users ORDER BY created_at`;
    console.log('\n📋 Current users in database:');
    before.forEach(u => console.log(`  @${u.username}: ${u.building}`));

    // Delete test and seed users
    const deleted = await sql`
      DELETE FROM users 
      WHERE username IN ('gene', 'stan', 'testuser123', 'testuser456')
      RETURNING username
    `;
    
    console.log('\n🗑️  Deleted:', deleted.map(u => '@' + u.username).join(', '));

    // Show remaining users
    const after = await sql`SELECT username, building FROM users ORDER BY created_at`;
    console.log('\n✓ Remaining users:', after.length);
    after.forEach(u => console.log(`  @${u.username}: ${u.building}`));

  } catch (e) {
    console.error('Error:', e.message);
  }
  
  process.exit(0);
}

cleanup();
