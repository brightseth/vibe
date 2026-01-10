/**
 * Test script for AIRC v0.2 migration
 *
 * This script verifies:
 * 1. Migration runs without errors
 * 2. Backwards compatibility (old registrations still work)
 * 3. New registrations with recovery keys work
 * 4. Existing users are unaffected
 *
 * Usage:
 *   node migrations/test_migration.js
 */

const REGISTRY_URL = process.env.TEST_REGISTRY || 'http://localhost:3000';

async function testOldRegistration() {
  console.log('\n=== Test 1: Old Registration (v0.1 - no recovery key) ===');

  const response = await fetch(`${REGISTRY_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'test_old_user',
      building: 'testing v0.1 compatibility',
      publicKey: 'ed25519:MCowBQYDK2VwAyEAhT4X...'  // Dummy key
    })
  });

  const data = await response.json();

  if (!data.success) {
    console.error('❌ FAILED: Old registration failed');
    console.error(data);
    return false;
  }

  // Verify user was created WITHOUT recovery key
  if (data.user.recoveryKey !== null && data.user.recoveryKey !== undefined) {
    console.error('❌ FAILED: Recovery key should be null for v0.1 registration');
    return false;
  }

  console.log('✅ PASSED: Old registration works, recovery key is null');
  console.log(`   User: @${data.user.username}`);
  console.log(`   Building: ${data.user.building}`);
  console.log(`   Public Key: ${data.user.publicKey?.substring(0, 20)}...`);
  console.log(`   Recovery Key: ${data.user.recoveryKey}`);
  console.log(`   Status: ${data.user.status}`);
  return true;
}

async function testNewRegistration() {
  console.log('\n=== Test 2: New Registration (v0.2 - with recovery key) ===');

  const response = await fetch(`${REGISTRY_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'test_new_user',
      building: 'testing v0.2 with recovery keys',
      publicKey: 'ed25519:MCowBQYDK2VwAyEAhT4X...',      // Dummy signing key
      recoveryKey: 'ed25519:MCowBQYDK2VwAyEA9xKp...'    // Dummy recovery key
    })
  });

  const data = await response.json();

  if (!data.success) {
    console.error('❌ FAILED: New registration failed');
    console.error(data);
    return false;
  }

  // Verify user was created WITH recovery key
  if (!data.user.recoveryKey) {
    console.error('❌ FAILED: Recovery key should be present for v0.2 registration');
    return false;
  }

  console.log('✅ PASSED: New registration with recovery key works');
  console.log(`   User: @${data.user.username}`);
  console.log(`   Building: ${data.user.building}`);
  console.log(`   Public Key: ${data.user.publicKey?.substring(0, 20)}...`);
  console.log(`   Recovery Key: ${data.user.recoveryKey?.substring(0, 20)}...`);
  console.log(`   Registry: ${data.user.registry}`);
  console.log(`   Status: ${data.user.status}`);
  return true;
}

async function testUserRetrieval() {
  console.log('\n=== Test 3: User Retrieval (verify fields are returned) ===');

  const response = await fetch(`${REGISTRY_URL}/api/users?user=test_new_user`);
  const data = await response.json();

  if (!data.success) {
    console.error('❌ FAILED: User retrieval failed');
    console.error(data);
    return false;
  }

  // Verify all v0.2 fields are present
  const requiredFields = ['username', 'building', 'publicKey', 'recoveryKey', 'registry', 'status', 'createdAt'];
  const missingFields = requiredFields.filter(field => !(field in data.user));

  if (missingFields.length > 0) {
    console.error('❌ FAILED: Missing fields in user response:', missingFields);
    return false;
  }

  console.log('✅ PASSED: User retrieval includes all v0.2 fields');
  console.log(`   Username: ${data.user.username}`);
  console.log(`   Recovery Key: ${data.user.recoveryKey ? 'Present' : 'Null'}`);
  console.log(`   Registry: ${data.user.registry}`);
  console.log(`   Status: ${data.user.status}`);
  console.log(`   Key Rotated At: ${data.user.keyRotatedAt || 'Never'}`);
  return true;
}

async function testUpdateWithoutRecoveryKey() {
  console.log('\n=== Test 4: Update Existing User (v0.1 user updates without recovery key) ===');

  // Update the old user's building
  const response = await fetch(`${REGISTRY_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'test_old_user',
      building: 'updated building - still no recovery key'
    })
  });

  const data = await response.json();

  if (!data.success) {
    console.error('❌ FAILED: User update failed');
    console.error(data);
    return false;
  }

  // Verify recovery key is still null after update
  if (data.user.recoveryKey !== null && data.user.recoveryKey !== undefined) {
    console.error('❌ FAILED: Recovery key should remain null for v0.1 user');
    return false;
  }

  console.log('✅ PASSED: v0.1 user can update without providing recovery key');
  console.log(`   Building: ${data.user.building}`);
  console.log(`   Recovery Key: ${data.user.recoveryKey}`);
  return true;
}

async function testListUsers() {
  console.log('\n=== Test 5: List All Users (verify mixed v0.1/v0.2 users) ===');

  const response = await fetch(`${REGISTRY_URL}/api/users?all=true`);
  const data = await response.json();

  if (!data.success) {
    console.error('❌ FAILED: User listing failed');
    console.error(data);
    return false;
  }

  const usersWithRecovery = data.users.filter(u => u.recoveryKey).length;
  const usersWithoutRecovery = data.users.filter(u => !u.recoveryKey).length;

  console.log('✅ PASSED: User listing works with mixed v0.1/v0.2 users');
  console.log(`   Total users: ${data.users.length}`);
  console.log(`   With recovery key: ${usersWithRecovery}`);
  console.log(`   Without recovery key: ${usersWithoutRecovery}`);
  return true;
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  AIRC v0.2 Migration Test Suite                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nRegistry: ${REGISTRY_URL}`);
  console.log('Testing backwards compatibility and new features...\n');

  const tests = [
    testOldRegistration,
    testNewRegistration,
    testUserRetrieval,
    testUpdateWithoutRecoveryKey,
    testListUsers
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ FAILED: ${test.name} threw error:`, error.message);
      failed++;
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Results                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTotal: ${tests.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Migration is backwards compatible.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
