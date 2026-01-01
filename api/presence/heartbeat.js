/**
 * POST /api/presence/heartbeat
 *
 * Register or update presence for a user
 * Now with presence inference!
 */

const { kv } = require('@vercel/kv');

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
    const { handle, one_liner, file, branch, error, note, mood } = req.body;

    if (!handle) {
      return res.status(400).json({ error: 'handle required' });
    }

    const h = handle.toLowerCase().replace('@', '');
    const now = Date.now();

    // Get previous state for inference
    const previous = await kv.hgetall(`presence:${h}`);

    // Track file changes for burst detection
    let fileChanges = [];
    if (previous && previous.file_changes) {
      try {
        fileChanges = JSON.parse(previous.file_changes);
      } catch (e) {
        fileChanges = [];
      }
    }

    // If file changed, record the timestamp
    if (file && (!previous || file !== previous.file)) {
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

    // Build presence data
    const presenceData = {
      handle: h,
      one_liner: one_liner || '',
      last_heartbeat: now,
      visible: true,
      file: current.file,
      branch: current.branch,
      error: current.error,
      note: current.note,
      mood: current.mood || (inferred ? inferred.mood : null),
      mood_inferred: inferred ? true : false,
      mood_reason: inferred ? inferred.reason : null,
      file_changes: JSON.stringify(fileChanges)
    };

    // Store in KV
    await kv.hset(`presence:${h}`, presenceData);

    // Add to active users set with timestamp as score
    await kv.zadd('presence:active', { score: now, member: h });

    return res.status(200).json({
      success: true,
      handle: h,
      timestamp: now,
      mood: presenceData.mood,
      mood_inferred: presenceData.mood_inferred,
      mood_reason: presenceData.mood_reason
    });

  } catch (error) {
    console.error('Heartbeat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
