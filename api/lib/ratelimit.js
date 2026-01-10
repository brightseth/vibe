/**
 * Rate Limiting — The Floodgate
 *
 * Protects endpoints from spam and abuse.
 * Uses Vercel KV (Redis) with atomic increment + expire.
 *
 * Strategies:
 * - Per-handle rate limiting for authenticated users
 * - Per-IP rate limiting for unauthenticated requests
 * - Sliding window using INCR + EXPIRE
 */

import crypto from 'crypto';

// Rate limit configurations
const LIMITS = {
  // Registration: prevent handle squatting
  register: {
    window: 3600,   // 1 hour
    limit: 5,       // 5 registrations per IP per hour
    message: 'Too many registration attempts. Try again later.'
  },

  // Authenticated messaging: 1 per second average
  message_auth: {
    window: 60,     // 1 minute
    limit: 60,      // 60 messages per minute
    message: 'Slow down. You\'re sending messages too fast.'
  },

  // Unauthenticated/new user messaging: stricter
  message_unauth: {
    window: 60,     // 1 minute
    limit: 10,      // 10 messages per minute
    message: 'Rate limit exceeded. Verify your identity to send more.'
  },

  // Presence updates: prevent heartbeat spam
  presence: {
    window: 10,     // 10 seconds
    limit: 5,       // 5 updates per 10 seconds
    message: 'Presence updates too frequent.'
  },

  // Handle availability checks: prevent enumeration
  check: {
    window: 60,     // 1 minute
    limit: 30,      // 30 checks per minute
    message: 'Too many handle checks. Slow down.'
  },

  // System accounts: very high limits (not bypass - prevent accidental floods)
  system_message: {
    window: 60,     // 1 minute
    limit: 1000,    // 1000 messages per minute for system accounts
    message: 'System rate limit exceeded.'
  },

  system_presence: {
    window: 10,     // 10 seconds
    limit: 100,     // 100 updates per 10 seconds for system accounts
    message: 'System presence updates too frequent.'
  },

  // Key rotation: AIRC v0.2 security operation
  key_rotation: {
    window: 3600,   // 1 hour
    limit: 1,       // 1 rotation per hour per handle
    message: 'Key rotation limited to once per hour. Contact support if locked out.'
  },

  // Identity revocation: AIRC v0.2 security operation
  identity_revoke: {
    window: 86400,  // 24 hours
    limit: 1,       // Only 1 attempt per day
    message: 'Only 1 revocation attempt allowed per 24 hours per handle.'
  }
};

/**
 * Hash an IP address for privacy
 * @param {string} ip - Raw IP address
 * @param {string} salt - Salt for hashing
 * @returns {string} - Hashed IP (first 16 chars)
 */
export function hashIP(ip, salt = process.env.VIBE_AUTH_SECRET || 'default-salt') {
  return crypto
    .createHash('sha256')
    .update(ip + salt)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Extract client IP from request headers
 * @param {object} req - HTTP request
 * @returns {string} - Client IP or 'unknown'
 */
export function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         'unknown';
}

/**
 * Check rate limit for a given type and identifier
 * @param {object} kv - Vercel KV instance
 * @param {string} type - Rate limit type (register, message_auth, etc.)
 * @param {string} identifier - User handle or hashed IP
 * @returns {{ success: boolean, limit: number, remaining: number, reset: number, message?: string }}
 */
export async function checkRateLimit(kv, type, identifier) {
  const config = LIMITS[type];

  if (!config) {
    console.warn(`[ratelimit] Unknown type: ${type}`);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  if (!kv) {
    // No KV = no rate limiting (dev mode)
    return { success: true, limit: config.limit, remaining: config.limit, reset: 0 };
  }

  const key = `ratelimit:${type}:${identifier}`;

  try {
    // Atomic increment
    const count = await kv.incr(key);

    // Set expiry on first hit
    if (count === 1) {
      await kv.expire(key, config.window);
    }

    const remaining = Math.max(0, config.limit - count);
    const reset = Math.floor(Date.now() / 1000) + config.window;

    if (count > config.limit) {
      console.log(`[ratelimit] ${type} limit exceeded for ${identifier}: ${count}/${config.limit}`);
      return {
        success: false,
        limit: config.limit,
        remaining: 0,
        reset,
        message: config.message
      };
    }

    return {
      success: true,
      limit: config.limit,
      remaining,
      reset
    };
  } catch (e) {
    console.error(`[ratelimit] Error checking ${type} for ${identifier}:`, e.message);
    // Fail open on errors (don't block users due to KV issues)
    return { success: true, limit: config.limit, remaining: config.limit, reset: 0 };
  }
}

/**
 * Set rate limit headers on response
 * @param {object} res - HTTP response
 * @param {object} rateInfo - Rate limit info from checkRateLimit
 */
export function setRateLimitHeaders(res, rateInfo) {
  if (rateInfo.limit > 0) {
    res.setHeader('X-RateLimit-Limit', rateInfo.limit);
    res.setHeader('X-RateLimit-Remaining', rateInfo.remaining);
    res.setHeader('X-RateLimit-Reset', rateInfo.reset);
  }
}

/**
 * Return 429 Too Many Requests response
 * @param {object} res - HTTP response
 * @param {object} rateInfo - Rate limit info
 * @returns {object} - Response
 */
export function rateLimitResponse(res, rateInfo) {
  setRateLimitHeaders(res, rateInfo);
  res.setHeader('Retry-After', rateInfo.reset - Math.floor(Date.now() / 1000));

  return res.status(429).json({
    success: false,
    error: 'rate_limited',
    message: rateInfo.message || 'Too many requests. Please slow down.',
    retryAfter: rateInfo.reset
  });
}
