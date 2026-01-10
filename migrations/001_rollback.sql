-- Rollback for Migration 001: Add AIRC v0.2 Identity Portability fields
-- Date: 2026-01-09
-- Status: Safe to run - removes unused columns

-- =============================================================================
-- Rollback AIRC v0.2 columns
-- =============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_users_status;
DROP INDEX IF EXISTS idx_users_recovery_key;

-- Drop columns
ALTER TABLE users
  DROP COLUMN IF EXISTS recovery_key,
  DROP COLUMN IF EXISTS registry,
  DROP COLUMN IF EXISTS key_rotated_at,
  DROP COLUMN IF EXISTS status;

-- =============================================================================
-- Verification query (run after rollback)
-- =============================================================================

-- Verify rollback success:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- Expected output (original schema):
-- column_name  | data_type
-- -------------+-------------------
-- username     | character varying
-- building     | text
-- invited_by   | character varying
-- invite_code  | character varying
-- public_key   | text
-- created_at   | timestamp
-- updated_at   | timestamp
