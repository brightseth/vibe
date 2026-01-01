/**
 * Presence API - Who's vibing right now
 *
 * Uses Vercel KV (Redis) for persistence across cold starts
 * Falls back to in-memory if KV not configured
 *
 * POST /api/presence - Update your presence (heartbeat)
 * GET /api/presence - See who's active
 */

// Check if KV is configured via environment variables
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Presence TTL in seconds (5 minutes - auto-expires inactive users)
const PRESENCE_TTL = 300;

// Session TTL in seconds (1 hour - sessions are more persistent than presence)
const SESSION_TTL = 3600;

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

async function getPresence(username) {
  const kv = await getKV();
  if (kv) {
    return await kv.get(`presence:${username}`);
  }
  return memoryPresence[username] || null;
}

async function setPresence(username, data, options = {}) {
  const kv = await getKV();
  if (kv) {
    await kv.set(`presence:${username}`, data, options);
  }
  memoryPresence[username] = data;
}

async function getAllPresence() {
  const kv = await getKV();
  if (kv) {
    const keys = await kv.keys('presence:*');
    if (keys.length === 0) return [];
    const data = await kv.mget(...keys);
    return data.filter(p => p !== null);
  }
  return Object.values(memoryPresence);
}

async function deletePresence(username) {
  const kv = await getKV();
  if (kv) {
    await kv.del(`presence:${username}`);
  }
  delete memoryPresence[username];
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

function generateSessionId() {
  return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
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

      // Session registration - register a sessionId → handle mapping
      if (action === 'register') {
        if (!sessionId || !username) {
          return res.status(400).json({
            success: false,
            error: "Session registration requires sessionId and username (handle)"
          });
        }
        const handle = username.toLowerCase().replace('@', '');
        const session = await registerSession(sessionId, handle);
        return res.status(200).json({
          success: true,
          action: 'register',
          sessionId,
          handle,
          expiresIn: `${SESSION_TTL}s`,
          message: `Session registered: ${sessionId} → @${handle}`
        });
      }

      // Session lookup - resolve sessionId to handle
      if (sessionId && !username) {
        const session = await getSession(sessionId);
        if (!session) {
          return res.status(400).json({
            success: false,
            error: "Session not found. Run /vibe init to register.",
            sessionId
          });
        }
        // Use the handle from the session
        req.body.username = session.handle;
        // Refresh session TTL
        await refreshSession(sessionId);
      }

      const { username: resolvedUsername } = req.body;

      // Typing indicator - separate short-lived key
      if (typingTo) {
        const user = (resolvedUsername || username).toLowerCase().replace('@', '');
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

      const finalUsername = resolvedUsername || username;
      if (!finalUsername) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: username (or valid sessionId)"
        });
      }

      const user = finalUsername.toLowerCase().replace('@', '');

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

      // Infer mood from context if not explicitly set
      const inferred = inferMood(sessionContext, existing);

      // Build mood fields - explicit mood wins over inferred
      const moodValue = sessionContext?.mood || inferred?.mood || existing.mood || null;
      const moodInferred = !sessionContext?.mood && inferred !== null;
      const moodReason = inferred?.reason || null;

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
      return res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
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

  // DELETE - Remove presence (cleanup test accounts)
  if (req.method === 'DELETE') {
    const { username } = req.query;

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
