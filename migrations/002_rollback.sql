-- Migration 002 Rollback: Remove audit logging tables and revoked_at column
-- AIRC v0.2: Rollback key rotation infrastructure
-- WARNING: This will DELETE all audit log data permanently

-- Drop cleanup function
DROP FUNCTION IF EXISTS cleanup_expired_nonces;

-- Drop tables (CASCADE to remove dependent objects)
DROP TABLE IF EXISTS nonce_tracker CASCADE;
DROP TABLE IF EXISTS admin_access_log CASCADE;
DROP TABLE IF NOT EXISTS audit_log CASCADE;

-- Remove revoked_at column from users
ALTER TABLE users DROP COLUMN IF EXISTS revoked_at;

-- Verification query
SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'revoked_at'
    ) THEN '✓ revoked_at column removed'
    ELSE '✗ revoked_at column still exists'
  END as revoked_at_status,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'audit_log'
    ) THEN '✓ audit_log table removed'
    ELSE '✗ audit_log table still exists'
  END as audit_log_status,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'nonce_tracker'
    ) THEN '✓ nonce_tracker table removed'
    ELSE '✗ nonce_tracker table still exists'
  END as nonce_tracker_status;
