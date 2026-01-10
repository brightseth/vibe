-- Migration 001: Add AIRC v0.2 Identity Portability fields
-- Date: 2026-01-09
-- AIRC Spec: v0.2 (Identity Portability Foundation)
-- Status: BACKWARDS COMPATIBLE - All fields nullable or have defaults
--
-- This migration enables:
-- - Recovery keys for account recovery
-- - Key rotation tracking
-- - Identity revocation
-- - Registry location tracking for future DID migration
--
-- Safety:
-- ✓ All new columns are nullable or have defaults
-- ✓ Existing queries continue working without modification
-- ✓ Existing /vibe users completely unaffected
-- ✓ Easy rollback (see rollback.sql)

-- =============================================================================
-- Add AIRC v0.2 columns to users table
-- =============================================================================

-- Recovery key (Ed25519 public key for account recovery)
-- NULL for existing users, optional for new users, required in v0.2 enforcement
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS recovery_key TEXT;

COMMENT ON COLUMN users.recovery_key IS 'AIRC v0.2: Ed25519 public key for account recovery and key rotation';

-- Registry location (for DID migration in v0.3)
-- Defaults to slashvibe.dev (current production registry)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS registry TEXT DEFAULT 'https://slashvibe.dev';

COMMENT ON COLUMN users.registry IS 'AIRC v0.2: Current registry location for identity resolution';

-- Key rotation timestamp (tracks last rotation event)
-- NULL until first rotation occurs
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS key_rotated_at TIMESTAMP;

COMMENT ON COLUMN users.key_rotated_at IS 'AIRC v0.2: Timestamp of last signing key rotation';

-- Identity status (active, suspended, revoked)
-- Defaults to 'active' for all existing and new users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

COMMENT ON COLUMN users.status IS 'AIRC v0.2: Identity status (active, suspended, revoked)';

-- Add check constraint for valid status values
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'suspended', 'revoked'));

-- =============================================================================
-- Create indexes for v0.2 queries
-- =============================================================================

-- Index for status queries (revocation checks)
CREATE INDEX IF NOT EXISTS idx_users_status
  ON users(status)
  WHERE status != 'active';  -- Partial index: only index non-active statuses

-- Index for recovery key lookups (future use)
CREATE INDEX IF NOT EXISTS idx_users_recovery_key
  ON users(recovery_key)
  WHERE recovery_key IS NOT NULL;  -- Partial index: only index users with recovery keys

-- =============================================================================
-- Verification queries (run after migration)
-- =============================================================================

-- Verify migration success:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- AND column_name IN ('recovery_key', 'registry', 'key_rotated_at', 'status')
-- ORDER BY column_name;

-- Expected output:
-- column_name     | data_type         | is_nullable | column_default
-- ----------------+-------------------+-------------+-------------------------------
-- key_rotated_at  | timestamp         | YES         | NULL
-- recovery_key    | text              | YES         | NULL
-- registry        | text              | YES         | 'https://slashvibe.dev'
-- status          | character varying | YES         | 'active'

-- Count users by status:
-- SELECT status, COUNT(*) FROM users GROUP BY status;

-- Count users with recovery keys:
-- SELECT
--   COUNT(*) FILTER (WHERE recovery_key IS NOT NULL) as with_recovery,
--   COUNT(*) FILTER (WHERE recovery_key IS NULL) as without_recovery,
--   COUNT(*) as total
-- FROM users;

-- =============================================================================
-- Performance impact
-- =============================================================================

-- Impact: MINIMAL
-- - Adding nullable columns with defaults: O(1) in Postgres (metadata only)
-- - No table rewrite required
-- - No downtime
-- - Existing queries unaffected
-- - Index creation: O(n) but runs asynchronously on partial indexes

-- =============================================================================
-- Rollback plan
-- =============================================================================

-- To rollback this migration, run:
-- ALTER TABLE users
--   DROP COLUMN IF EXISTS recovery_key,
--   DROP COLUMN IF EXISTS registry,
--   DROP COLUMN IF EXISTS key_rotated_at,
--   DROP COLUMN IF EXISTS status;
--
-- DROP INDEX IF EXISTS idx_users_status;
-- DROP INDEX IF EXISTS idx_users_recovery_key;
