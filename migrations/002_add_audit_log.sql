-- Migration 002: Add audit logging and revoked_at column
-- AIRC v0.2: Key rotation and revocation audit trail
-- Created: January 9, 2026
-- Backwards Compatible: Yes (adds new tables/columns only)

-- Add revoked_at timestamp for handle quarantine policy
ALTER TABLE users ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;

COMMENT ON COLUMN users.revoked_at IS 'AIRC v0.2: Timestamp when identity was revoked (90-day quarantine)';

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(50) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  handle VARCHAR(50) NOT NULL,
  details JSONB,
  ip_hash VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'AIRC v0.2: Permanent audit trail for security events (rotation, revocation)';
COMMENT ON COLUMN audit_log.event_type IS 'Event type: key_rotation, identity_revoked, recovery_key_reset';
COMMENT ON COLUMN audit_log.handle IS 'User handle affected by event';
COMMENT ON COLUMN audit_log.details IS 'Event-specific details (old_key, new_key, reason, etc.)';
COMMENT ON COLUMN audit_log.ip_hash IS 'SHA-256 hash of client IP (privacy-preserving)';
COMMENT ON COLUMN audit_log.created_at IS 'Immutable timestamp (never update)';

-- Indexes for performance and access patterns
CREATE INDEX IF NOT EXISTS idx_audit_handle ON audit_log(handle, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);

-- Create admin access log for SOC2 compliance
CREATE TABLE IF NOT EXISTS admin_access_log (
  id SERIAL PRIMARY KEY,
  admin_user VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  filters JSONB,
  accessed_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE admin_access_log IS 'SOC2: Audit log access tracking';
COMMENT ON COLUMN admin_access_log.admin_user IS 'Admin username who accessed audit logs';
COMMENT ON COLUMN admin_access_log.action IS 'Action performed: audit_log_read, audit_log_export';
COMMENT ON COLUMN admin_access_log.filters IS 'Filters applied to audit log query';

CREATE INDEX IF NOT EXISTS idx_admin_access_user ON admin_access_log(admin_user, accessed_at DESC);

-- Create nonce tracking table for replay protection
CREATE TABLE IF NOT EXISTS nonce_tracker (
  nonce VARCHAR(64) PRIMARY KEY,
  operation VARCHAR(50) NOT NULL,
  handle VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

COMMENT ON TABLE nonce_tracker IS 'AIRC v0.2: Replay protection for rotation/revocation proofs';
COMMENT ON COLUMN nonce_tracker.nonce IS 'Unique nonce from client proof';
COMMENT ON COLUMN nonce_tracker.operation IS 'Operation type: rotation, revocation';
COMMENT ON COLUMN nonce_tracker.handle IS 'User handle for debugging';
COMMENT ON COLUMN nonce_tracker.expires_at IS 'TTL: 1 hour (auto-cleanup)';

CREATE INDEX IF NOT EXISTS idx_nonce_expires ON nonce_tracker(expires_at);

-- Cleanup function for expired nonces (run via cron or trigger)
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM nonce_tracker WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_nonces IS 'Delete expired nonces (call periodically or via cron)';
