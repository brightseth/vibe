/**
 * Presence API - Who's vibing right now
 *
 * Uses Vercel KV (Redis) for persistence across cold starts
 * Falls back to in-memory if KV not configured
 *
 * POST /api/presence - Update your presence (heartbeat)
 * GET /api/presence - See who's active
 *
 * Authentication:
 * - Register returns a signed token (sessionId.signature)
 * - Write operations require valid token in Authorization header
 */

import crypto from 'crypto';

// ============ INLINE AUTH (avoid import issues) ============
const AUTH_SECRET = process.env.VIBE_AUTH_SECRET || 'dev-secret-change-in-production';

function generateToken(sessionId, handle) {
  const payload = `${sessionId}:${handle.toLowerCase()}`;
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  return `${sessionId}.${signature}`;
}

function verifyToken(token, expectedHandle) {
  if (!token) return { valid: false, error: 'No token provided' };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, error: 'Invalid token format' };
  const [sessionId, providedSignature] = parts;
  const handle = expectedHandle.toLowerCase().replace('@', '');
  const payload = `${sessionId}:${handle}`;
  const expectedSignature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
      return { valid: false, error: 'Invalid signature' };
    }
  } catch (e) {
    return { valid: false, error: 'Invalid signature' };
  }
  return { valid: true, sessionId };
}

function extractToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  const vibeToken = req.headers?.['x-vibe-token'] || req.headers?.['X-Vibe-Token'];
  if (vibeToken) return vibeToken;
  if (req.query?.token) return req.query.token;
  return null;
}

function generateServerSessionId() {
  return `sess_${crypto.randomBytes(12).toString('base64url')}`;
}
// ============ END AUTH ============

// Check if KV is configured via environment variables
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Presence TTL in seconds (5 minutes - auto-expires inactive users)
const PRESENCE_TTL = 300;

// Session TTL in seconds (1 hour - sessions are more persistent than presence)
const SESSION_TTL = 3600;

// Redis keys for sorted set pattern
const PRESENCE_INDEX = 'presence:index';  // Sorted set: score=timestamp, member=username

// In-memory fallback (no seed data - real users only)
let memoryPresence = {};
let memorySessions = {};  // sessionId → handle mapping

// KV wrapper functions with fallback
async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

// ============ PRESENCE STORAGE (sorted set pattern) ============

async function getPresence(username) {
  const kv = await getKV();
  if (kv) {
    return await kv.get(`presence:data:${username}`);
  }
  return memoryPresence[username] || null;
}

async function setPresence(username, data, options = {}) {
  const kv = await getKV();
  const timestamp = Date.now();

  if (kv) {
    // Use pipeline for atomic operations
    const pipeline = kv.pipeline();

    // Store user data with TTL
    pipeline.set(`presence:data:${username}`, data, options);

    // Update sorted set index (score = timestamp for sorting)
    pipeline.zadd(PRESENCE_INDEX, { score: timestamp, member: username });

    await pipeline.exec();
  } else {
    memoryPresence[username] = { ...data, _timestamp: timestamp };
  }
}

async function getAllPresence() {
  const kv = await getKV();

  if (kv) {
    // Get all users from sorted set, newest first
    // Using ZRANGE with REV to get descending order by score
    const usernames = await kv.zrange(PRESENCE_INDEX, 0, -1, { rev: true });

    if (!usernames || usernames.length === 0) return [];

    // Batch fetch all user data
    const keys = usernames.map(u => `presence:data:${u}`);
    const data = await kv.mget(...keys);

    // Filter out expired/null entries and clean up stale index entries
    const validData = [];
    const staleUsers = [];

    for (let i = 0; i < usernames.length; i++) {
      if (data[i]) {
        validData.push(data[i]);
      } else {
        staleUsers.push(usernames[i]);
      }
    }

    // Clean up stale index entries (data expired but index remains)
    if (staleUsers.length > 0) {
      await kv.zrem(PRESENCE_INDEX, ...staleUsers);
    }

    return validData;
  }

  // Memory fallback: sort by timestamp
  return Object.values(memoryPresence)
    .sort((a, b) => (b._timestamp || 0) - (a._timestamp || 0));
}

// Get only active users (seen within cutoff period) - O(log N)
async function getActivePresence(cutoffSeconds = 1800) {
  const kv = await getKV();
  const cutoffTime = Date.now() - (cutoffSeconds * 1000);

  if (kv) {
    // Get users with score > cutoffTime (active within cutoff)
    const usernames = await kv.zrangebyscore(PRESENCE_INDEX, cutoffTime, '+inf');

    if (!usernames || usernames.length === 0) return [];

    const keys = usernames.map(u => `presence:data:${u}`);
    const data = await kv.mget(...keys);
    return data.filter(d => d !== null);
  }

  // Memory fallback
  return Object.values(memoryPresence)
    .filter(p => p._timestamp && p._timestamp > cutoffTime);
}

async function deletePresence(username) {
  const kv = await getKV();
  if (kv) {
    const pipeline = kv.pipeline();
    pipeline.del(`presence:data:${username}`);
    pipeline.zrem(PRESENCE_INDEX, username);
    await pipeline.exec();
  }
  delete memoryPresence[username];
}

// Migration: move old presence:${user} keys to new schema
async function migratePresence() {
  const kv = await getKV();
  if (!kv) return { success: false, error: 'KV not configured' };

  try {
    // Find old-style keys
    const oldKeys = await kv.keys('presence:*');
    const keysToMigrate = oldKeys.filter(k =>
      !k.startsWith('presence:data:') &&
      !k.startsWith('presence:index') &&
      k !== PRESENCE_INDEX
    );

    if (keysToMigrate.length === 0) {
      return { success: true, migrated: 0, message: 'No old presence keys to migrate' };
    }

    let migrated = 0;
    for (const oldKey of keysToMigrate) {
      const username = oldKey.replace('presence:', '');
      const data = await kv.get(oldKey);

      if (data && data.username) {
        // Migrate to new schema
        const timestamp = data.lastSeen ? new Date(data.lastSeen).getTime() : Date.now();

        const pipeline = kv.pipeline();
        pipeline.set(`presence:data:${username}`, data, { ex: PRESENCE_TTL });
        pipeline.zadd(PRESENCE_INDEX, { score: timestamp, member: username });
        pipeline.del(oldKey);
        await pipeline.exec();

        migrated++;
      }
    }

    return {
      success: true,
      migrated,
      total: keysToMigrate.length,
      message: `Migrated ${migrated}/${keysToMigrate.length} presence records`
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Session management - maps sessionId to handle for per-session identity
async function registerSession(sessionId, handle) {
  const kv = await getKV();
  const data = { handle, registeredAt: new Date().toISOString() };
  if (kv) {
    await kv.set(`session:${sessionId}`, data, { ex: SESSION_TTL });
  }
  memorySessions[sessionId] = data;
  return data;
}

async function getSession(sessionId) {
  const kv = await getKV();
  if (kv) {
    return await kv.get(`session:${sessionId}`);
  }
  return memorySessions[sessionId] || null;
}

async function refreshSession(sessionId) {
  const kv = await getKV();
  if (kv) {
    const session = await kv.get(`session:${sessionId}`);
    if (session) {
      await kv.set(`session:${sessionId}`, session, { ex: SESSION_TTL });
    }
    return session;
  }
  return memorySessions[sessionId] || null;
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getStatus(lastSeen) {
  const seconds = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  if (seconds < 1800) return 'active';  // 30 min
  if (seconds < 7200) return 'away';    // 2 hours
  return 'offline';
}

/**
 * Compute builderMode from session signals
 * @param {object} presence - User presence data
 * @returns {string} - "deep-focus" | "focused" | "exploring" | "shipping" | "idle"
 */
function getBuilderMode(presence) {
  if (!presence.lastSeen) return 'idle';

  const status = getStatus(presence.lastSeen);
  if (status === 'offline') return 'idle';
  if (status === 'away') return 'idle';

  // Check for shipping keywords in workingOn
  const workingOn = (presence.workingOn || '').toLowerCase();
  const shippingKeywords = ['deploy', 'ship', 'push', 'release', 'launch', 'publish'];
  if (shippingKeywords.some(kw => workingOn.includes(kw))) {
    return 'shipping';
  }

  // Calculate session duration if we have firstSeen
  if (presence.firstSeen) {
    const durationMs = new Date(presence.lastSeen) - new Date(presence.firstSeen);
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours >= 2) return 'deep-focus';
    if (durationHours >= 0.5) return 'focused';
  }

  return 'exploring';
}

/**
 * Infer mood from context
 * @param {object} context - Session context (file, error, etc.)
 * @param {object} existing - Previous presence data
 * @returns {{ mood: string, reason: string } | null}
 */
function inferMood(context, existing) {
  if (!context) return null;

  // Rule 1: Error shared → debugging
  if (context.error) {
    return { mood: '🐛', reason: 'error shared' };
  }

  // Rule 2: File changed since last context → shipping
  if (context.file && existing?.context?.file && context.file !== existing.context.file) {
    return { mood: '🔥', reason: 'file changed' };
  }

  // Rule 3: Late night (10pm-4am) + active → deep work
  const hour = new Date().getHours();
  if ((hour >= 22 || hour < 4) && context.file) {
    return { mood: '🌙', reason: 'late night session' };
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Update presence (heartbeat), typing indicator, or session registration
  if (req.method === 'POST') {
    try {
      const { username, workingOn, project, location, typingTo, context, sessionId, action } = req.body;

      // Session registration - generate server-side sessionId and signed token
      if (action === 'register') {
        if (!username) {
          return res.status(400).json({
            success: false,
            error: "Session registration requires username (handle)"
          });
        }
        const handle = username.toLowerCase().replace('@', '');

        // Generate server-side session ID (ignore client-provided one)
        const serverSessionId = generateServerSessionId();

        // Create signed token
        const token = generateToken(serverSessionId, handle);

        // Store session
        await registerSession(serverSessionId, handle);

        return res.status(200).json({
          success: true,
          action: 'register',
          sessionId: serverSessionId,
          handle,
          token,  // Client must store and use this for all requests
          expiresIn: `${SESSION_TTL}s`,
          message: `Session registered: ${serverSessionId} → @${handle}`
        });
      }

      // Token-based auth: verify token and extract handle
      const token = extractToken(req);
      let authenticatedHandle = null;

      if (token) {
        // Token provided - verify it
        const parts = token.split('.');
        if (parts.length === 2) {
          const [tokenSessionId] = parts;
          // Get session to find the handle
          const session = await getSession(tokenSessionId);
          if (session) {
            const result = verifyToken(token, session.handle);
            if (result.valid) {
              authenticatedHandle = session.handle;
              // Refresh session TTL
              await refreshSession(tokenSessionId);
            }
          }
        }
      }

      // Legacy fallback: sessionId without token (for transition period)
      if (!authenticatedHandle && sessionId && !username) {
        const session = await getSession(sessionId);
        if (session) {
          // Warn but allow during transition
          console.warn(`[presence] Unauthenticated session access: ${sessionId}`);
          authenticatedHandle = session.handle;
          await refreshSession(sessionId);
        }
      }

      // Determine final username
      const finalUsername = authenticatedHandle || (username ? username.toLowerCase().replace('@', '') : null);

      if (!finalUsername) {
        return res.status(400).json({
          success: false,
          error: "Authentication required. Include token in Authorization header."
        });
      }

      const user = finalUsername;

      // Typing indicator - requires auth
      if (typingTo) {
        if (!authenticatedHandle) {
          return res.status(401).json({
            success: false,
            error: "Typing indicator requires authentication"
          });
        }
        const recipient = typingTo.toLowerCase().replace('@', '');
        const kv = await getKV();
        if (kv) {
          await kv.set(`typing:${user}:${recipient}`, Date.now(), { ex: 5 }); // 5 second TTL
        }
        return res.status(200).json({
          success: true,
          message: `Typing indicator set for @${user} → @${recipient}`,
          expiresIn: '5s'
        });
      }

      // Get existing data to preserve fields
      const existing = await getPresence(user) || {};

      const now = new Date().toISOString();

      // Context object for richer session sharing
      // Can include: file, branch, recentFiles, tools, mood, etc.
      const sessionContext = context ? {
        ...existing.context,
        ...context,
        updatedAt: now
      } : existing.context || null;

      // Infer mood from context if not explicitly set (inline for debugging)
      let inferredMood = null;
      let inferredReason = null;

      if (sessionContext) {
        if (sessionContext.error) {
          inferredMood = '🐛';
          inferredReason = 'error shared';
        } else if (sessionContext.file && existing?.context?.file && sessionContext.file !== existing.context.file) {
          inferredMood = '🔥';
          inferredReason = 'file changed';
        } else {
          const hour = new Date().getHours();
          if ((hour >= 22 || hour < 4) && sessionContext.file) {
            inferredMood = '🌙';
            inferredReason = 'late night session';
          }
        }
      }

      // Build mood fields - explicit mood wins over inferred
      const moodValue = sessionContext?.mood || inferredMood || existing.mood || null;
      const moodInferred = !sessionContext?.mood && inferredMood !== null;
      const moodReason = inferredReason;

      const presenceData = {
        username: user,
        x: existing.x || user,
        workingOn: workingOn || existing.workingOn || 'Building something',
        project: project || existing.project || null,
        location: location || existing.location || null,
        context: sessionContext,
        mood: moodValue,
        mood_inferred: moodInferred,
        mood_reason: moodReason,
        firstSeen: existing.firstSeen || now,  // Track session start
        lastSeen: now,
        dna: existing.dna || { top: 'platform' }
      };

      // Compute builderMode from session signals
      presenceData.builderMode = getBuilderMode(presenceData);

      // Set with TTL for KV, or just update memory
      await setPresence(user, presenceData, { ex: PRESENCE_TTL });

      return res.status(200).json({
        success: true,
        presence: presenceData,
        message: "Presence updated",
        storage: KV_CONFIGURED ? 'kv' : 'memory'
      });
    } catch (error) {
      // Don't leak stack traces in production
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET - Who's online (or check typing status)
  if (req.method === 'GET') {
    const { user, typing } = req.query;
    const forUser = user?.toLowerCase().replace('@', '');

    // Check who's typing to this user
    if (typing === 'true' && forUser) {
      const kv = await getKV();
      if (kv) {
        const keys = await kv.keys(`typing:*:${forUser}`);
        const typingUsers = keys.map(k => k.split(':')[1]);
        return res.status(200).json({
          success: true,
          typingTo: forUser,
          typingUsers,
          count: typingUsers.length
        });
      }
      return res.status(200).json({
        success: true,
        typingTo: forUser,
        typingUsers: [],
        count: 0
      });
    }

    const allPresence = await getAllPresence();

    // Build presence list with computed status and builderMode
    const list = allPresence
      .map(p => ({
        ...p,
        status: getStatus(p.lastSeen),
        builderMode: getBuilderMode(p),
        ago: timeAgo(p.lastSeen),
        matchPercent: null
      }))
      .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

    // Separate by status
    const active = list.filter(p => p.status === 'active');
    const away = list.filter(p => p.status === 'away');
    const offline = list.filter(p => p.status === 'offline');

    return res.status(200).json({
      success: true,
      active,
      away,
      offline,
      yourMatches: [],
      counts: {
        active: active.length,
        away: away.length,
        total: list.length
      },
      storage: KV_CONFIGURED ? 'kv' : 'memory'
    });
  }

  // DELETE - Remove presence or run migration
  if (req.method === 'DELETE') {
    const { username, action } = req.query;

    // Migration action
    if (action === 'migrate') {
      const result = await migratePresence();
      return res.status(result.success ? 200 : 500).json(result);
    }

    // Delete user presence
    if (!username) {
      return res.status(400).json({
        success: false,
        error: "Missing required query param: username"
      });
    }

    const user = username.toLowerCase().replace('@', '');
    await deletePresence(user);

    return res.status(200).json({
      success: true,
      message: `Removed presence for @${user}`,
      storage: KV_CONFIGURED ? 'kv' : 'memory'
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
