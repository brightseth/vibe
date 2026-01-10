/**
 * Key Rotation Utilities
 * AIRC v0.2: Recovery key proof verification, audit logging, session invalidation
 */

import crypto from 'crypto';
import { sql, isPostgresEnabled } from './db.js';
import { verifySignature, canonicalJSON } from './crypto.js';

// Rate limiting windows
export const ROTATION_RATE_LIMIT = {
  window: 3600,  // 1 hour
  limit: 1,
  message: 'Key rotation limited to once per hour. Contact support if locked out.'
};

// Timestamp validation
const MAX_TIMESTAMP_SKEW = 300;  // 5 minutes
const WARN_TIMESTAMP_SKEW = 60;  // Warn if >60 seconds

/**
 * Verify recovery key proof for key rotation
 * @param {Object} proof - Client-generated proof
 * @param {string} recoveryKeyBase64 - User's recovery key (ed25519:...)
 * @param {string} newPublicKey - New signing key to rotate to
 * @returns {Object} { valid: boolean, error?: string, warning?: string, server_time?: number }
 */
export async function verifyRecoveryKeyProof(proof, recoveryKeyBase64, newPublicKey) {
  // 1. Validate structure
  if (!proof || typeof proof !== 'object') {
    return { valid: false, error: 'Invalid proof structure' };
  }

  if (!proof.new_public_key || !proof.timestamp || !proof.nonce || !proof.signature) {
    return { valid: false, error: 'Missing required proof fields (new_public_key, timestamp, nonce, signature)' };
  }

  // Verify new_public_key matches parameter
  if (proof.new_public_key !== newPublicKey) {
    return { valid: false, error: 'new_public_key mismatch' };
  }

  // 2. Validate timestamp (check BEFORE expensive signature verification for efficiency)
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - proof.timestamp);

  if (diff > MAX_TIMESTAMP_SKEW) {
    return {
      valid: false,
      error: `Timestamp outside 5-minute window (${diff}s skew)`,
      server_time: now,
      client_time: proof.timestamp,
      skew_seconds: diff
    };
  }

  // 3. Signature verification FIRST (expensive - protects nonce check from timing attacks)
  const { signature, ...toVerify } = proof;
  const canonical = canonicalJSON(toVerify);

  try {
    const isValid = verifySignature(
      { ...toVerify, signature },
      recoveryKeyBase64
    );

    if (!isValid) {
      return { valid: false, error: 'Recovery key signature verification failed' };
    }
  } catch (error) {
    return { valid: false, error: `Signature verification error: ${error.message}` };
  }

  // 4. Nonce replay check (AFTER signature - now safe from timing attacks)
  const nonceUsed = await checkNonce(proof.nonce, 'rotation');
  if (nonceUsed) {
    return { valid: false, error: 'Nonce already used (replay attack detected)' };
  }

  // 5. Mark nonce as used (1-hour TTL)
  await markNonceUsed(proof.nonce, 'rotation');

  // Check for clock skew warning
  let warning = null;
  if (diff > WARN_TIMESTAMP_SKEW) {
    warning = `Clock skew detected (${diff}s). Consider syncing device clock.`;
  }

  return {
    valid: true,
    warning,
    server_time: now,
    skew_seconds: diff
  };
}

/**
 * Check if nonce has been used (replay protection)
 * @param {string} nonce - Nonce from client proof
 * @param {string} operation - Operation type (rotation, revocation)
 * @returns {boolean} True if nonce already used
 */
async function checkNonce(nonce, operation) {
  if (!isPostgresEnabled() || !sql) {
    // Fallback: Use in-memory set (dev only)
    if (!global._usedNonces) {
      global._usedNonces = new Set();
    }
    return global._usedNonces.has(`${operation}:${nonce}`);
  }

  try {
    const result = await sql`
      SELECT 1 FROM nonce_tracker
      WHERE nonce = ${nonce}
      AND operation = ${operation}
      AND expires_at > NOW()
      LIMIT 1
    `;
    return result.length > 0;
  } catch (error) {
    console.error('[key-rotation] Nonce check error:', error.message);
    // Fail open: Allow operation if DB unavailable (logged in audit)
    return false;
  }
}

/**
 * Mark nonce as used
 * @param {string} nonce - Nonce to mark
 * @param {string} operation - Operation type
 */
async function markNonceUsed(nonce, operation) {
  if (!isPostgresEnabled() || !sql) {
    // Fallback: In-memory set
    if (!global._usedNonces) {
      global._usedNonces = new Set();
    }
    global._usedNonces.add(`${operation}:${nonce}`);
    return;
  }

  try {
    const expiresAt = new Date(Date.now() + 3600 * 1000);  // 1 hour from now

    await sql`
      INSERT INTO nonce_tracker (nonce, operation, handle, expires_at)
      VALUES (${nonce}, ${operation}, 'unknown', ${expiresAt})
      ON CONFLICT (nonce) DO NOTHING
    `;
  } catch (error) {
    console.error('[key-rotation] Nonce storage error:', error.message);
    // Non-fatal: Rotation proceeds (replay risk accepted for this window)
  }
}

/**
 * Audit key rotation event
 * @param {string} handle - User handle
 * @param {boolean} success - Whether rotation succeeded
 * @param {string} failureReason - Reason for failure (if success=false)
 * @param {Object} req - HTTP request object
 * @param {string} oldKey - Old public key
 * @param {string} newKey - New public key
 * @returns {string} Audit ID
 */
export async function auditRotation(handle, success, failureReason, req, oldKey, newKey) {
  const auditId = `rot_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

  const details = {
    success,
    old_public_key: oldKey || null,
    new_public_key: newKey || null,
    failure_reason: failureReason || null
  };

  if (!isPostgresEnabled() || !sql) {
    console.log(`[AUDIT] ${auditId} - ${handle} - rotation - ${success ? 'SUCCESS' : 'FAILED'}`);
    return auditId;
  }

  try {
    const ipHash = hashIP(getClientIP(req));
    const userAgent = req.headers['user-agent'] || null;

    await sql`
      INSERT INTO audit_log (id, event_type, handle, details, ip_hash, user_agent, created_at)
      VALUES (
        ${auditId},
        'key_rotation',
        ${handle},
        ${JSON.stringify(details)}::jsonb,
        ${ipHash},
        ${userAgent},
        NOW()
      )
    `;
  } catch (error) {
    console.error('[key-rotation] Audit log write error:', error.message);
    // Non-fatal: Rotation proceeds (audit gap accepted)
  }

  return auditId;
}

/**
 * Invalidate all sessions for a user (post-rotation)
 * Uses timestamp-based invalidation via key_rotated_at
 * @param {string} handle - User handle
 * @returns {number} Count of sessions invalidated (best effort)
 */
export async function invalidateAllSessions(handle) {
  // Timestamp-based invalidation: Update key_rotated_at in users table
  // Sessions will be rejected on next validation (see api/lib/auth.js)

  if (!isPostgresEnabled() || !sql) {
    console.log(`[key-rotation] Would invalidate sessions for @${handle} (no Postgres)`);
    return 0;
  }

  try {
    await sql`
      UPDATE users
      SET key_rotated_at = NOW(),
          updated_at = NOW()
      WHERE username = ${handle}
    `;

    // Return estimate (actual invalidation happens lazily on next auth check)
    return 1;  // Placeholder: We don't track active session count
  } catch (error) {
    console.error('[key-rotation] Session invalidation error:', error.message);
    return 0;
  }
}

/**
 * Hash IP address for privacy-preserving logging
 * @param {string} ip - Client IP address
 * @returns {string} SHA-256 hash
 */
function hashIP(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Extract client IP from request (handles proxies)
 * @param {Object} req - HTTP request object
 * @returns {string} Client IP
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}
