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

// In-memory fallback (no seed data - real users only)
let memoryPresence = {};

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Update presence (heartbeat)
  if (req.method === 'POST') {
    try {
      const { username, workingOn, project, location } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: username"
        });
      }

      const user = username.toLowerCase().replace('@', '');

      // Get existing data to preserve fields
      const existing = await getPresence(user) || {};

      const now = new Date().toISOString();
      const presenceData = {
        username: user,
        x: existing.x || user,
        workingOn: workingOn || existing.workingOn || 'Building something',
        project: project || existing.project || null,
        location: location || existing.location || null,
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

  // GET - Who's online
  if (req.method === 'GET') {
    const { user } = req.query;
    const forUser = user?.toLowerCase().replace('@', '');

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
