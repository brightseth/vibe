# AIRC v0.2 Database Migration Guide

## Overview

This migration adds **Identity Portability Foundation** fields to the `/vibe` database, enabling AIRC v0.2 features:

- **Recovery keys**: Dual-key system for account recovery
- **Key rotation**: Track when signing keys are rotated
- **Identity revocation**: Permanently disable compromised identities
- **Registry tracking**: Prepare for DID migration in v0.3

## Safety Guarantees

✅ **100% Backwards Compatible**
- All new columns are nullable or have defaults
- Existing queries continue working without modification
- Existing /vibe users completely unaffected
- No downtime required

✅ **Easy Rollback**
- Single SQL script to undo all changes
- No data loss (columns are unused initially)

✅ **Production-Safe**
- Postgres `ALTER TABLE` with nullable columns is O(1) (metadata-only)
- No table rewrite required
- Partial indexes only index necessary rows

## Files

```
migrations/
├── 001_add_recovery_keys.sql    # Forward migration
├── 001_rollback.sql             # Rollback migration
├── test_migration.js            # Backwards compatibility tests
├── run_migration.sh             # Migration runner script
└── README.md                    # This file
```

## Step-by-Step Deployment

### Phase 1: Local Testing (Development Environment)

**1. Start local dev server**
```bash
cd /Users/sethstudio1/Projects/vibe
npm run dev
```

**2. Run migration on local database**

If using local Postgres:
```bash
psql $DATABASE_URL -f migrations/001_add_recovery_keys.sql
```

If using Neon (recommended):
- Create a separate development database in Neon
- Run migration there first

**3. Run backwards compatibility tests**
```bash
node migrations/test_migration.js
```

Expected output:
```
✅ PASSED: Old registration works, recovery key is null
✅ PASSED: New registration with recovery key works
✅ PASSED: User retrieval includes all v0.2 fields
✅ PASSED: v0.1 user can update without providing recovery key
✅ PASSED: User listing works with mixed v0.1/v0.2 users

🎉 All tests passed! Migration is backwards compatible.
```

**4. Manual verification**

Test in your browser/API client:

**Old registration (v0.1 - should work)**:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "building": "something cool",
    "publicKey": "ed25519:MCowBQYDK2VwAyEA..."
  }'
```

Expected: `{ success: true, user: { recoveryKey: null, ... } }`

**New registration (v0.2 - should work)**:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user_v2",
    "building": "something cool",
    "publicKey": "ed25519:MCowBQYDK2VwAyEA...",
    "recoveryKey": "ed25519:MCowBQYDK2VwAyEB..."
  }'
```

Expected: `{ success: true, user: { recoveryKey: "ed25519:...", ... } }`

---

### Phase 2: Staging Deployment (Vercel Preview)

**1. Deploy updated code to staging**
```bash
git checkout -b airc-v0.2-migration
git add migrations/ api/users.js
git commit -m "Add AIRC v0.2 recovery key support (backwards compatible)"
git push origin airc-v0.2-migration
```

**2. Create Vercel preview deployment**
- Vercel will automatically create a preview deployment
- Get the preview URL (e.g., `vibe-preview-abc123.vercel.app`)

**3. Run migration on staging database**

Connect to staging Neon database:
```bash
# Using Neon SQL Editor or psql
psql "postgresql://staging-connection-string" \
  -f migrations/001_add_recovery_keys.sql
```

**4. Test on staging**
```bash
TEST_REGISTRY=https://vibe-preview-abc123.vercel.app \
  node migrations/test_migration.js
```

**5. Manual QA on staging**
- Test /vibe registration flow
- Test /vibe messaging
- Verify existing users work
- Verify new users can opt-in to recovery keys

---

### Phase 3: Production Deployment

**1. Schedule deployment window**
- Best time: Low-traffic window (e.g., 2am PST)
- Expected downtime: **0 seconds** (non-blocking migration)
- Expected migration time: <1 second

**2. Run migration on production database**

**IMPORTANT**: Connect to production Neon database carefully

```bash
# Backup first (Neon has automatic backups, but verify)
# Check Neon dashboard: Project Settings → Backups

# Run migration
psql "postgresql://production-connection-string" \
  -f migrations/001_add_recovery_keys.sql
```

**3. Verify migration**
```sql
-- Check columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('recovery_key', 'registry', 'key_rotated_at', 'status')
ORDER BY column_name;
```

Expected output:
```
 column_name    | data_type         | is_nullable | column_default
----------------+-------------------+-------------+-------------------------------
 key_rotated_at | timestamp         | YES         | NULL
 recovery_key   | text              | YES         | NULL
 registry       | text              | YES         | 'https://slashvibe.dev'
 status         | character varying | YES         | 'active'
```

**4. Deploy code to production**
```bash
# Merge to main
git checkout main
git merge airc-v0.2-migration
git push origin main

# Vercel will auto-deploy
```

**5. Monitor production**

Check Vercel dashboard for:
- Error rate (should be unchanged)
- Request latency (should be unchanged)
- Successful deployments

Test production:
```bash
TEST_REGISTRY=https://slashvibe.dev \
  node migrations/test_migration.js
```

**6. Verify existing /vibe users**
- Login as existing user
- Verify messages work
- Verify presence works
- Check error logs

---

## Verification Queries

After migration, run these queries to verify:

**1. Count users by recovery key status**
```sql
SELECT
  COUNT(*) FILTER (WHERE recovery_key IS NOT NULL) as with_recovery,
  COUNT(*) FILTER (WHERE recovery_key IS NULL) as without_recovery,
  COUNT(*) as total
FROM users;
```

**2. Check status distribution**
```sql
SELECT status, COUNT(*) FROM users GROUP BY status;
```

Expected: All users have `status = 'active'`

**3. Verify indexes**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND indexname IN ('idx_users_status', 'idx_users_recovery_key');
```

**4. Sample user with new fields**
```sql
SELECT username, public_key IS NOT NULL as has_signing_key,
       recovery_key IS NOT NULL as has_recovery_key,
       registry, status, key_rotated_at
FROM users
LIMIT 5;
```

---

## Rollback Procedure

If anything goes wrong, rollback is simple:

**1. Disable new code**
```bash
# Revert Vercel deployment to previous version
# Via Vercel dashboard: Deployments → Click previous → Promote to Production
```

**2. Remove database columns**
```bash
psql "postgresql://production-connection-string" \
  -f migrations/001_rollback.sql
```

**3. Verify rollback**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

Should NOT include: `recovery_key`, `registry`, `key_rotated_at`, `status`

---

## Common Issues

### Issue: "column already exists"
**Cause**: Migration was run twice
**Solution**: Safe to ignore (uses `IF NOT EXISTS`)

### Issue: "permission denied"
**Cause**: Database user lacks ALTER TABLE permission
**Solution**: Use Neon admin user or grant permissions

### Issue: Tests fail with 404
**Cause**: Registry URL is wrong
**Solution**: Verify `TEST_REGISTRY` environment variable

### Issue: Existing users show recoveryKey in response
**Cause**: Logic error in code
**Solution**: Check `users.js` - should return `null` for existing users

---

## Timeline Estimate

| Phase | Duration | Downtime |
|-------|----------|----------|
| Local testing | 30 minutes | 0 |
| Staging deployment | 1 hour | 0 |
| Production migration | 5 minutes | 0 |
| Production verification | 15 minutes | 0 |
| **Total** | **~2 hours** | **0** |

---

## Next Steps

After successful migration:

1. ✅ Schema supports recovery keys (optional)
2. ✅ /vibe continues working identically
3. ✅ Foundation laid for v0.2 features

**Week 2**: Implement key rotation endpoint
**Week 3**: Implement revocation endpoint
**Week 4**: Generate recovery keys for existing users
**Week 8+**: Flip `ENFORCE_SIGNATURES` flag (after grace period)

---

## Support

Questions or issues during migration?

1. Check this README
2. Review test output
3. Check Vercel logs
4. Check Neon query logs
5. Rollback if needed (safe and fast)

**Migration prepared by**: Seth Goldstein
**Date**: January 9, 2026
**AIRC Version**: v0.2 (Identity Portability Foundation)
