/**
 * POST /api/presence/heartbeat
 *
 * Register or update presence for a user
 * Now with presence inference!
 *
 * Uses cached KV to reduce Vercel KV calls (3k/day limit)
 */

const { cachedKV } = require('../lib/kv-cache');

/**
 * Infer mood from context and activity patterns
 * Returns { mood: string, reason: string } or null
 */
function inferMood(current, previous, now) {
  // If explicit mood is set, don't override
  if (current.mood) {
    return null;
  }

  // Rule 1: Error shared → debugging
  if (current.error) {
    return { mood: '🐛', reason: 'error shared' };
  }

  // Rule 2: File changed since last heartbeat → shipping
  if (current.file && previous && current.file !== previous.file) {
    return { mood: '🔥', reason: 'file changed' };
  }

  // Rule 3: Multiple file changes in short time → shipping
  if (previous && previous.file_changes) {
    const recentChanges = previous.file_changes.filter(
      t => now - t < 10 * 60 * 1000 // 10 minutes
    );
    if (recentChanges.length >= 3) {
      return { mood: '🔥', reason: `${recentChanges.length} files in 10m` };
    }
  }

  // Rule 4: Late night (10pm-4am local) + active → deep work
  const hour = new Date(now).getHours();
  if ((hour >= 22 || hour < 4) && current.file) {
    return { mood: '🌙', reason: 'late night session' };
  }

  return null;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const kv = await cachedKV();
    const { handle, one_liner, file, branch, error, note, mood } = req.body;

    if (!handle) {
      return res.status(400).json({ error: 'handle required' });
    }

    const h = handle.toLowerCase().replace('@', '');
    const now = Date.now();

    // Get previous state for inference (using main API's key pattern)
    const previous = await kv.get(`presence:data:${h}`);

    // Track file changes for burst detection
    let fileChanges = [];
    if (previous && previous.file_changes) {
      // file_changes is now stored as array directly
      fileChanges = Array.isArray(previous.file_changes) ? previous.file_changes : [];
    }

    // If file changed, record the timestamp
    const prevFile = previous?.context?.file;
    if (file && (!previous || file !== prevFile)) {
      fileChanges.push(now);
      // Keep only last 10 changes
      fileChanges = fileChanges.slice(-10);
    }

    // Current state
    const current = {
      file: file || null,
      branch: branch || null,
      error: error || null,
      note: note || null,
      mood: mood || null
    };

    // Infer mood if not explicitly set
    const inferred = inferMood(current, previous, now);

    // Build presence data (matching main presence.js format)
    const presenceData = {
      username: h,
      workingOn: one_liner || '',
      lastSeen: new Date(now).toISOString(),
      context: {
        file: current.file,
        branch: current.branch,
        error: current.error,
        note: current.note
      },
      mood: current.mood || (inferred ? inferred.mood : null),
      mood_inferred: inferred ? true : false,
      mood_reason: inferred ? inferred.reason : null,
      file_changes: fileChanges  // Keep array format
    };

    // Store in KV using main API's key pattern (JSON format)
    const PRESENCE_TTL = 300; // 5 minutes
    await kv.set(`presence:data:${h}`, presenceData, { ex: PRESENCE_TTL });

    // Add to presence:index (main API's sorted set)
    await kv.zadd('presence:index', { score: now, member: h });

    return res.status(200).json({
      success: true,
      handle: h,
      timestamp: now,
      mood: presenceData.mood,
      mood_inferred: presenceData.mood_inferred,
      mood_reason: presenceData.mood_reason,
      _cache: kv.stats ? kv.stats() : null,
      _fallback: kv.isFallback || false
    });

  } catch (error) {
    console.error('Heartbeat error:', error);
    // Graceful degradation - return success even if KV fails
    // The user can still use the app, just presence won't persist
    return res.status(200).json({
      success: true,
      handle: req.body?.handle || 'unknown',
      timestamp: Date.now(),
      _error: 'KV unavailable, presence not persisted',
      _fallback: true
    });
  }
};
