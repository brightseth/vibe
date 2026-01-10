/**
 * Key Rotation Endpoint - AIRC v0.2
 * POST /api/identity/:handle/rotate
 *
 * Rotate signing key using recovery key proof
 * Requires: recovery key signature, timestamp, nonce
 * Rate limit: 1/hour per handle
 */

import { sql, isPostgresEnabled } from '../../lib/db.js';
import {
  verifyRecoveryKeyProof,
  auditRotation,
  invalidateAllSessions
} from '../../lib/key-rotation.js';
import {
  checkRateLimit,
  rateLimitResponse,
  setRateLimitHeaders,
  getClientIP,
  hashIP
} from '../../lib/ratelimit.js';

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

/**
 * Get user from database
 */
async function getUser(username) {
  if (!isPostgresEnabled() || !sql) {
    return null;
  }

  try {
    const result = await sql`
      SELECT username, public_key, recovery_key, key_rotated_at, status
      FROM users
      WHERE username = ${username}
      LIMIT 1
    `;

    if (result && result.length > 0) {
      const row = result[0];
      return {
        username: row.username,
        publicKey: row.public_key,
        recoveryKey: row.recovery_key,
        keyRotatedAt: row.key_rotated_at?.toISOString() || null,
        status: row.status || 'active'
      };
    }
  } catch (e) {
    console.error('[rotate] Database read error:', e.message);
  }

  return null;
}

/**
 * Update user's public key (atomic)
 */
async function rotateUserKey(username, newPublicKey) {
  if (!isPostgresEnabled() || !sql) {
    throw new Error('Database not available');
  }

  try {
    await sql`
      UPDATE users
      SET public_key = ${newPublicKey},
          key_rotated_at = NOW(),
          updated_at = NOW()
      WHERE username = ${username}
    `;

    return true;
  } catch (e) {
    console.error('[rotate] Database update error:', e.message);
    throw e;
  }
}

/**
 * Generate new session token (HMAC-based)
 */
function generateSessionToken(handle) {
  const crypto = require('crypto');
  const secret = process.env.VIBE_AUTH_SECRET || 'default-secret-change-me';
  const payload = `${handle}:${Date.now()}:${Math.random()}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only POST requests allowed'
    });
  }

  // Extract handle from URL path
  const { handle: rawHandle } = req.query;
  const handle = rawHandle?.toLowerCase().replace('@', '');

  if (!handle) {
    return res.status(400).json({
      success: false,
      error: 'missing_handle',
      message: 'Handle parameter required'
    });
  }

  // Parse request body
  const { new_public_key, proof } = req.body;

  if (!new_public_key || !proof) {
    return res.status(400).json({
      success: false,
      error: 'bad_request',
      message: 'Missing required fields: new_public_key, proof'
    });
  }

  // Validate new_public_key format
  if (!new_public_key.startsWith('ed25519:')) {
    return res.status(400).json({
      success: false,
      error: 'invalid_key_format',
      message: 'new_public_key must start with "ed25519:"'
    });
  }

  // Rate limiting (1/hour per handle)
  const kv = await getKV();
  const rateLimit = await checkRateLimit(kv, 'key_rotation', handle);
  setRateLimitHeaders(res, rateLimit);

  if (!rateLimit.success) {
    await auditRotation(handle, false, 'rate_limited', req, null, new_public_key);
    return rateLimitResponse(res, rateLimit);
  }

  // Fetch user
  const user = await getUser(handle);

  if (!user) {
    await auditRotation(handle, false, 'user_not_found', req, null, new_public_key);
    return res.status(404).json({
      success: false,
      error: 'user_not_found',
      message: `User @${handle} not found`
    });
  }

  // Check if user has recovery key (v0.1 users cannot rotate)
  if (!user.recoveryKey) {
    await auditRotation(handle, false, 'no_recovery_key', req, user.publicKey, new_public_key);
    return res.status(403).json({
      success: false,
      error: 'no_recovery_key',
      message: 'Recovery key required for rotation. Add recovery key first.',
      code: 'AIRC_V02_RECOVERY_REQUIRED',
      upgrade_url: 'https://airc.dev/recovery-keys'
    });
  }

  // Check if user is revoked
  if (user.status === 'revoked') {
    await auditRotation(handle, false, 'identity_revoked', req, user.publicKey, new_public_key);
    return res.status(403).json({
      success: false,
      error: 'identity_revoked',
      message: 'Identity has been revoked and cannot rotate keys'
    });
  }

  // Check if new key is same as current key (no-op)
  if (new_public_key === user.publicKey) {
    await auditRotation(handle, false, 'key_already_set', req, user.publicKey, new_public_key);
    return res.status(409).json({
      success: false,
      error: 'key_already_set',
      message: 'New key is same as current key (no rotation needed)'
    });
  }

  // Verify recovery key proof
  const proofValid = await verifyRecoveryKeyProof(proof, user.recoveryKey, new_public_key);

  if (!proofValid.valid) {
    await auditRotation(handle, false, proofValid.error, req, user.publicKey, new_public_key);

    // Return different status codes based on error type
    if (proofValid.error?.includes('Timestamp')) {
      return res.status(401).json({
        success: false,
        error: 'invalid_timestamp',
        message: proofValid.error,
        server_time: proofValid.server_time,
        client_time: proofValid.client_time,
        skew_seconds: proofValid.skew_seconds
      });
    }

    if (proofValid.error?.includes('Nonce')) {
      return res.status(401).json({
        success: false,
        error: 'replay_attack',
        message: proofValid.error
      });
    }

    return res.status(401).json({
      success: false,
      error: 'invalid_recovery_proof',
      message: proofValid.error || 'Recovery key proof verification failed'
    });
  }

  // Atomic key rotation
  try {
    await rotateUserKey(handle, new_public_key);
  } catch (error) {
    await auditRotation(handle, false, `database_error: ${error.message}`, req, user.publicKey, new_public_key);
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Key rotation failed due to database error'
    });
  }

  // Invalidate all sessions (timestamp-based)
  const sessionsInvalidated = await invalidateAllSessions(handle);

  // Generate new session token
  const newToken = generateSessionToken(handle);

  // Audit successful rotation
  await auditRotation(handle, true, null, req, user.publicKey, new_public_key);

  // Success response
  return res.status(200).json({
    success: true,
    message: 'Key rotated successfully',
    handle,
    new_public_key,
    key_rotated_at: new Date().toISOString(),
    sessions_invalidated: sessionsInvalidated,
    token: newToken,
    warning: proofValid.warning || null
  });
}
