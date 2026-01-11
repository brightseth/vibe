/**
 * Rate Limiting Utilities
 * Simple in-memory rate limiting (can upgrade to KV later)
 */

import crypto from 'crypto';

// In-memory store for rate limits
const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > 60000) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

/**
 * Check rate limit for a given key
 * @param {string} key - Unique identifier (usually IP hash or handle)
 * @param {string} action - Action name
 * @param {number} limit - Max requests allowed
 * @param {number} window - Time window in seconds
 */
export async function checkRateLimit(key, action, limit, window) {
  const rateLimitKey = `${key}:${action}`;
  const now = Date.now();
  const windowMs = window * 1000;

  let data = rateLimitStore.get(rateLimitKey);

  if (!data || now - data.resetTime > windowMs) {
    // New window
    data = {
      count: 1,
      resetTime: now,
      limit,
      window: windowMs
    };
    rateLimitStore.set(rateLimitKey, data);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs
    };
  }

  // Existing window
  if (data.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: data.resetTime + windowMs,
      retryAfter: Math.ceil((data.resetTime + windowMs - now) / 1000)
    };
  }

  data.count++;
  rateLimitStore.set(rateLimitKey, data);

  return {
    success: true,
    limit,
    remaining: limit - data.count,
    reset: data.resetTime + windowMs
  };
}

/**
 * Set rate limit headers on response
 */
export function setRateLimitHeaders(res, rateLimit) {
  res.setHeader('X-RateLimit-Limit', rateLimit.limit);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('X-RateLimit-Reset', rateLimit.reset);

  if (rateLimit.retryAfter) {
    res.setHeader('Retry-After', rateLimit.retryAfter);
  }
}

/**
 * Return rate limit exceeded response
 */
export function rateLimitResponse(res, rateLimit) {
  return res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: rateLimit.retryAfter,
    limit: rateLimit.limit,
    reset: rateLimit.reset
  });
}

/**
 * Hash IP address for privacy
 */
export function hashIP(ip) {
  return crypto.createHash('sha256').update(ip + 'salt').digest('hex').slice(0, 16);
}

/**
 * Get client IP from request
 */
export function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
