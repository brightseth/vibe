/**
 * /vibe Authentication
 *
 * HMAC-signed session tokens to prevent spoofing.
 *
 * Token format: sessionId.signature
 * Signature: HMAC-SHA256(secret, sessionId + ":" + handle)
 */

import crypto from 'crypto';

// Secret for signing tokens - MUST be set in production
const AUTH_SECRET = process.env.VIBE_AUTH_SECRET || 'dev-secret-change-in-production';

/**
 * Generate a signed token for a session
 * @param {string} sessionId - Unique session identifier
 * @param {string} handle - User's handle (without @)
 * @returns {string} Signed token: sessionId.signature
 */
export function generateToken(sessionId, handle) {
  const payload = `${sessionId}:${handle.toLowerCase()}`;
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');

  return `${sessionId}.${signature}`;
}

/**
 * Verify a token and extract the session info
 * @param {string} token - Token to verify (sessionId.signature)
 * @param {string} expectedHandle - Handle to verify against
 * @returns {{ valid: boolean, sessionId?: string, error?: string }}
 */
export function verifyToken(token, expectedHandle) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid token format' };
  }

  const [sessionId, providedSignature] = parts;
  const handle = expectedHandle.toLowerCase().replace('@', '');

  // Compute expected signature
  const payload = `${sessionId}:${handle}`;
  const expectedSignature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');

  // Timing-safe comparison
  if (!crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature)
  )) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true, sessionId };
}

/**
 * Extract token from request headers
 * Supports: Authorization: Bearer <token>
 *           X-Vibe-Token: <token>
 * @param {object} req - HTTP request
 * @returns {string|null} Token or null
 */
export function extractToken(req) {
  // Check Authorization header
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check X-Vibe-Token header
  const vibeToken = req.headers?.['x-vibe-token'] || req.headers?.['X-Vibe-Token'];
  if (vibeToken) {
    return vibeToken;
  }

  // Check query param (for testing)
  if (req.query?.token) {
    return req.query.token;
  }

  return null;
}

/**
 * Middleware-style auth check for write operations
 * @param {object} req - HTTP request
 * @param {string} handle - Handle being written to
 * @returns {{ authenticated: boolean, error?: string }}
 */
export function requireAuth(req, handle) {
  const token = extractToken(req);

  if (!token) {
    return {
      authenticated: false,
      error: 'Authentication required. Include token in Authorization header.'
    };
  }

  const result = verifyToken(token, handle);

  if (!result.valid) {
    return {
      authenticated: false,
      error: `Authentication failed: ${result.error}`
    };
  }

  return { authenticated: true, sessionId: result.sessionId };
}

/**
 * Generate a random session ID
 * @returns {string} Random session ID
 */
export function generateSessionId() {
  return `sess_${crypto.randomBytes(12).toString('base64url')}`;
}
