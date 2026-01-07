/**
 * KV Cache Layer
 *
 * Reduces Vercel KV calls with in-memory caching.
 * Vercel serverless functions are short-lived, so this cache
 * helps within a single request and across rapid successive requests.
 *
 * For Vercel KV Hobby (3k/day limit), this is critical.
 */

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = {
  presence: 30 * 1000,      // 30 seconds for presence data
  who: 15 * 1000,           // 15 seconds for who's online
  inbox: 60 * 1000,         // 1 minute for inbox
  handle: 5 * 60 * 1000,    // 5 minutes for handle lookups
  default: 30 * 1000        // 30 seconds default
};

// Stats for monitoring
const stats = {
  hits: 0,
  misses: 0,
  errors: 0
};

/**
 * Get item from cache
 */
function cacheGet(key) {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }

  stats.hits++;
  return item.value;
}

/**
 * Set item in cache
 */
function cacheSet(key, value, ttlMs = CACHE_TTL.default) {
  cache.set(key, {
    value,
    expires: Date.now() + ttlMs
  });
}

/**
 * Invalidate cache entry
 */
function cacheInvalidate(key) {
  cache.delete(key);
}

/**
 * Invalidate all entries matching prefix
 */
function cacheInvalidatePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Get cache stats
 */
function getCacheStats() {
  return {
    ...stats,
    size: cache.size,
    hitRate: stats.hits + stats.misses > 0
      ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(1) + '%'
      : 'N/A'
  };
}

/**
 * Cached KV wrapper
 *
 * Usage:
 *   const { cachedKV } = require('./lib/kv-cache');
 *   const kv = await cachedKV();
 *   const data = await kv.get('key'); // Uses cache
 */
async function cachedKV() {
  const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  if (!KV_CONFIGURED) {
    return createFallbackKV();
  }

  try {
    const { kv } = await import('@vercel/kv');
    return createCachedWrapper(kv);
  } catch (e) {
    console.error('[kv-cache] Failed to load @vercel/kv:', e.message);
    stats.errors++;
    return createFallbackKV();
  }
}

/**
 * Create cached wrapper around KV
 */
function createCachedWrapper(kv) {
  return {
    // GET with caching
    async get(key, options = {}) {
      const ttl = options.ttl || CACHE_TTL.default;
      const cached = cacheGet(key);
      if (cached !== null) return cached;

      stats.misses++;
      try {
        const value = await kv.get(key);
        if (value !== null) {
          cacheSet(key, value, ttl);
        }
        return value;
      } catch (e) {
        stats.errors++;
        console.error('[kv-cache] GET error:', e.message);
        return null;
      }
    },

    // SET with cache invalidation
    async set(key, value, options) {
      cacheSet(key, value, CACHE_TTL.default);
      try {
        return await kv.set(key, value, options);
      } catch (e) {
        stats.errors++;
        console.error('[kv-cache] SET error:', e.message);
        return null;
      }
    },

    // HGET with caching
    async hget(hash, field) {
      const cacheKey = `${hash}:${field}`;
      const cached = cacheGet(cacheKey);
      if (cached !== null) return cached;

      stats.misses++;
      try {
        const value = await kv.hget(hash, field);
        if (value !== null) {
          cacheSet(cacheKey, value, CACHE_TTL.default);
        }
        return value;
      } catch (e) {
        stats.errors++;
        console.error('[kv-cache] HGET error:', e.message);
        return null;
      }
    },

    // HSET with cache invalidation
    async hset(hash, data) {
      // Invalidate cached entries for this hash
      for (const field of Object.keys(data)) {
        cacheInvalidate(`${hash}:${field}`);
      }
      try {
        return await kv.hset(hash, data);
      } catch (e) {
        stats.errors++;
        console.error('[kv-cache] HSET error:', e.message);
        return null;
      }
    },

    // HGETALL with caching
    async hgetall(hash) {
      const cacheKey = `hgetall:${hash}`;
      const cached = cacheGet(cacheKey);
      if (cached !== null) return cached;

      stats.misses++;
      try {
        const value = await kv.hgetall(hash);
        if (value !== null) {
          cacheSet(cacheKey, value, CACHE_TTL.default);
        }
        return value;
      } catch (e) {
        stats.errors++;
        console.error('[kv-cache] HGETALL error:', e.message);
        return null;
      }
    },

    // ZRANGE with caching (for presence)
    async zrange(key, start, stop, options) {
      const cacheKey = `zrange:${key}:${start}:${stop}:${JSON.stringify(options || {})}`;
      const cached = cacheGet(cacheKey);
      if (cached !== null) return cached;

      stats.misses++;
      try {
        const value = await kv.zrange(key, start, stop, options);
        cacheSet(cacheKey, value, CACHE_TTL.presence);
        return value;
      } catch (e) {
        stats.errors++;
        console.error('[kv-cache] ZRANGE error:', e.message);
        return [];
      }
    },

    // Pass-through for other operations (no caching)
    async incr(key) {
      cacheInvalidate(key);
      try {
        return await kv.incr(key);
      } catch (e) {
        stats.errors++;
        return 0;
      }
    },

    async hincrby(hash, field, increment) {
      cacheInvalidate(`${hash}:${field}`);
      try {
        return await kv.hincrby(hash, field, increment);
      } catch (e) {
        stats.errors++;
        return 0;
      }
    },

    async lpush(key, ...values) {
      cacheInvalidatePrefix(`list:${key}`);
      try {
        return await kv.lpush(key, ...values);
      } catch (e) {
        stats.errors++;
        return 0;
      }
    },

    async lrange(key, start, stop) {
      const cacheKey = `list:${key}:${start}:${stop}`;
      const cached = cacheGet(cacheKey);
      if (cached !== null) return cached;

      stats.misses++;
      try {
        const value = await kv.lrange(key, start, stop);
        cacheSet(cacheKey, value, CACHE_TTL.inbox);
        return value;
      } catch (e) {
        stats.errors++;
        return [];
      }
    },

    async zadd(key, ...args) {
      cacheInvalidatePrefix(`zrange:${key}`);
      try {
        return await kv.zadd(key, ...args);
      } catch (e) {
        stats.errors++;
        return 0;
      }
    },

    async expire(key, seconds) {
      try {
        return await kv.expire(key, seconds);
      } catch (e) {
        stats.errors++;
        return 0;
      }
    },

    async hsetnx(hash, field, value) {
      try {
        const result = await kv.hsetnx(hash, field, value);
        if (result) {
          cacheSet(`${hash}:${field}`, value, CACHE_TTL.handle);
        }
        return result;
      } catch (e) {
        stats.errors++;
        return 0;
      }
    },

    // Direct access for operations not covered
    raw: kv,

    // Cache management
    invalidate: cacheInvalidate,
    invalidatePrefix: cacheInvalidatePrefix,
    stats: getCacheStats
  };
}

/**
 * Create fallback KV that returns empty/null values
 * Used when KV is unavailable (graceful degradation)
 */
function createFallbackKV() {
  console.warn('[kv-cache] Using fallback KV (no persistence)');

  // Simple in-memory store for fallback
  const fallbackStore = new Map();

  return {
    async get(key) { return fallbackStore.get(key) || null; },
    async set(key, value) { fallbackStore.set(key, value); return 'OK'; },
    async hget(hash, field) {
      const h = fallbackStore.get(hash) || {};
      return h[field] || null;
    },
    async hset(hash, data) {
      const h = fallbackStore.get(hash) || {};
      Object.assign(h, data);
      fallbackStore.set(hash, h);
      return Object.keys(data).length;
    },
    async hgetall(hash) { return fallbackStore.get(hash) || null; },
    async zrange() { return []; },
    async incr(key) {
      const v = (fallbackStore.get(key) || 0) + 1;
      fallbackStore.set(key, v);
      return v;
    },
    async hincrby(hash, field, inc) {
      const h = fallbackStore.get(hash) || {};
      h[field] = (h[field] || 0) + inc;
      fallbackStore.set(hash, h);
      return h[field];
    },
    async lpush(key, ...values) {
      const list = fallbackStore.get(key) || [];
      list.unshift(...values);
      fallbackStore.set(key, list);
      return list.length;
    },
    async lrange(key, start, stop) {
      const list = fallbackStore.get(key) || [];
      return list.slice(start, stop === -1 ? undefined : stop + 1);
    },
    async zadd() { return 0; },
    async expire() { return 1; },
    async hsetnx(hash, field, value) {
      const h = fallbackStore.get(hash) || {};
      if (h[field] !== undefined) return 0;
      h[field] = value;
      fallbackStore.set(hash, h);
      return 1;
    },
    raw: null,
    invalidate: cacheInvalidate,
    invalidatePrefix: cacheInvalidatePrefix,
    stats: getCacheStats,
    isFallback: true
  };
}

module.exports = {
  cachedKV,
  cacheGet,
  cacheSet,
  cacheInvalidate,
  cacheInvalidatePrefix,
  getCacheStats,
  CACHE_TTL
};
