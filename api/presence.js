/**
 * Presence API - Who's vibing right now
 *
 * Storage: Postgres-first with KV fallback
 * - Writes to both Postgres and KV for redundancy
 * - Reads from Postgres first, KV if Postgres fails
 * - Falls back to in-memory if both unavailable
 *
 * POST /api/presence - Update your presence (heartbeat)
 * GET /api/presence - See who's active
 *
 * Authentication:
 * - Register returns a signed token (sessionId.signature)
 * - Write operations require valid token in Authorization header
 */

import crypto from 'crypto';
import { normalizeHandle, claimHandle, getHandleRecord, isHandleAvailable, recordActivity, incrementMessageCount } from './lib/handles.js';

// Postgres connection
const { sql, isPostgresEnabled } = require('./lib/db.js');
import {
  checkRateLimit,
  setRateLimitHeaders,
  rateLimitResponse,
  hashIP,
  getClientIP
} from './lib/ratelimit.js';

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
    try {
      return await kv.get(`presence:data:${username}`);
    } catch (e) {
      console.error('[presence] KV getPresence failed:', e.message);
    }
  }
  return memoryPresence[username] || null;
}

async function setPresence(username, data, options = {}) {
  const kv = await getKV();
  const timestamp = Date.now();
  let stored = false;

  // Try Postgres first (primary storage)
  if (isPostgresEnabled() && sql) {
    try {
      const context = data.context ? JSON.stringify(data.context) : null;
      const dna = data.dna ? JSON.stringify(data.dna) : null;

      await sql`
        INSERT INTO presence (username, working_on, project, location, context, mood, mood_inferred, mood_reason, first_seen, last_seen, dna, builder_mode, x_handle, status, updated_at)
        VALUES (
          ${username},
          ${data.workingOn || null},
          ${data.project || null},
          ${data.location || null},
          ${context}::jsonb,
          ${data.mood || null},
          ${data.mood_inferred || false},
          ${data.mood_reason || null},
          ${data.firstSeen || new Date().toISOString()},
          ${data.lastSeen || new Date().toISOString()},
          ${dna}::jsonb,
          ${data.builderMode || null},
          ${data.x || username},
          'active',
          NOW()
        )
        ON CONFLICT (username) DO UPDATE SET
          working_on = EXCLUDED.working_on,
          project = EXCLUDED.project,
          location = EXCLUDED.location,
          context = EXCLUDED.context,
          mood = EXCLUDED.mood,
          mood_inferred = EXCLUDED.mood_inferred,
          mood_reason = EXCLUDED.mood_reason,
          last_seen = EXCLUDED.last_seen,
          dna = EXCLUDED.dna,
          builder_mode = EXCLUDED.builder_mode,
          updated_at = NOW()
      `;
      stored = true;
    } catch (e) {
      console.error('[presence] Postgres setPresence failed:', e.message);
    }
  }

  // Also write to KV (backup) - ASYNC, don't block response
  // Postgres is primary, KV is fire-and-forget for redundancy
  if (kv) {
    const kvWrite = async () => {
      try {
        const pipeline = kv.pipeline();
        pipeline.set(`presence:data:${username}`, data, options);
        pipeline.zadd(PRESENCE_INDEX, { score: timestamp, member: username });
        await pipeline.exec();
      } catch (e) {
        console.error('[presence] KV setPresence failed:', e.message);
      }
    };
    // Fire and forget - don't await, don't block
    kvWrite().catch(() => {});
    if (!stored) stored = true; // KV queued counts as stored
  }

  // Memory fallback
  if (!stored) {
    memoryPresence[username] = { ...data, _timestamp: timestamp };
  }
}

async function getAllPresence() {
  // Try Postgres first (primary storage)
  if (isPostgresEnabled() && sql) {
    try {
      // Get users active in last 2 hours, ordered by last_seen
      const rows = await sql`
        SELECT username, working_on, project, location, context, mood, mood_inferred, mood_reason,
               first_seen, last_seen, dna, builder_mode, x_handle, status
        FROM presence
        WHERE last_seen > NOW() - INTERVAL '2 hours'
        ORDER BY last_seen DESC
        LIMIT 100
      `;

      return rows.map(r => ({
        username: r.username,
        workingOn: r.working_on,
        project: r.project,
        location: r.location,
        context: r.context,
        mood: r.mood,
        mood_inferred: r.mood_inferred,
        mood_reason: r.mood_reason,
        firstSeen: r.first_seen,
        lastSeen: r.last_seen,
        dna: r.dna,
        builderMode: r.builder_mode,
        x: r.x_handle
      }));
    } catch (e) {
      console.error('[presence] Postgres getAllPresence failed:', e.message);
      // Fall through to KV
    }
  }

  // Try KV as fallback
  const kv = await getKV();
  if (kv) {
    try {
      const usernames = await kv.zrange(PRESENCE_INDEX, 0, -1, { rev: true });
      if (!usernames || usernames.length === 0) return [];

      const keys = usernames.map(u => `presence:data:${u}`);
      const data = await kv.mget(...keys);

      const validData = [];
      const staleUsers = [];

      for (let i = 0; i < usernames.length; i++) {
        if (data[i]) {
          validData.push(data[i]);
        } else {
          staleUsers.push(usernames[i]);
        }
      }

      if (staleUsers.length > 0) {
        await kv.zrem(PRESENCE_INDEX, ...staleUsers).catch(() => {});
      }

      return validData;
    } catch (e) {
      console.error('[presence] KV getAllPresence failed:', e.message);
    }
  }

  // Memory fallback
  return Object.values(memoryPresence)
    .sort((a, b) => (b._timestamp || 0) - (a._timestamp || 0));
}

// Get only active users (seen within cutoff period) - O(log N)
async function getActivePresence(cutoffSeconds = 1800) {
  const kv = await getKV();
  const cutoffTime = Date.now() - (cutoffSeconds * 1000);

  if (kv) {
    try {
      // Get users with score > cutoffTime (active within cutoff)
      const usernames = await kv.zrangebyscore(PRESENCE_INDEX, cutoffTime, '+inf');

      if (!usernames || usernames.length === 0) return [];

      const keys = usernames.map(u => `presence:data:${u}`);
      const data = await kv.mget(...keys);
      return data.filter(d => d !== null);
    } catch (e) {
      console.error('[presence] KV getActivePresence failed:', e.message);
      // Fall through to memory fallback
    }
  }

  // Memory fallback
  return Object.values(memoryPresence)
    .filter(p => p._timestamp && p._timestamp > cutoffTime);
}

async function deletePresence(username) {
  const kv = await getKV();
  if (kv) {
    try {
      const pipeline = kv.pipeline();
      pipeline.del(`presence:data:${username}`);
      pipeline.zrem(PRESENCE_INDEX, username);
      await pipeline.exec();
    } catch (e) {
      console.error('[presence] KV deletePresence failed:', e.message);
    }
  }
  delete memoryPresence[username];
}

// Migration: move old presence:${user} keys to new schema
async function migratePresence() {
  const kv = await getKV();
  if (!kv) return { success: false, error: 'KV not configured' };

  try {
    // Check if index exists with wrong type, delete it
    try {
      const indexType = await kv.type(PRESENCE_INDEX);
      if (indexType && indexType !== 'zset' && indexType !== 'none') {
        await kv.del(PRESENCE_INDEX);
      }
    } catch (e) {
      // Ignore type check errors
    }

    // Find old-style keys
    const oldKeys = await kv.keys('presence:*');
    const keysToMigrate = oldKeys.filter(k =>
      !k.startsWith('presence:data:') &&
      k !== PRESENCE_INDEX
    );

    if (keysToMigrate.length === 0) {
      return { success: true, migrated: 0, message: 'No old presence keys to migrate' };
    }

    let migrated = 0;
    let errors = [];

    for (const oldKey of keysToMigrate) {
      try {
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
      } catch (e) {
        errors.push({ key: oldKey, error: e.message });
      }
    }

    return {
      success: true,
      migrated,
      total: keysToMigrate.length,
      errors: errors.length > 0 ? errors : undefined,
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
    try {
      await kv.set(`session:${sessionId}`, data, { ex: SESSION_TTL });
    } catch (e) {
      console.error('[presence] KV registerSession failed:', e.message);
    }
  }
  memorySessions[sessionId] = data;
  return data;
}

async function getSession(sessionId) {
  const kv = await getKV();
  if (kv) {
    try {
      return await kv.get(`session:${sessionId}`);
    } catch (e) {
      console.error('[presence] KV getSession failed:', e.message);
    }
  }
  return memorySessions[sessionId] || null;
}

async function refreshSession(sessionId) {
  const kv = await getKV();
  if (kv) {
    try {
      const session = await kv.get(`session:${sessionId}`);
      if (session) {
        await kv.set(`session:${sessionId}`, session, { ex: SESSION_TTL });
      }
      return session;
    } catch (e) {
      console.error('[presence] KV refreshSession failed:', e.message);
    }
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
 * Send welcome DM from @vibe to new users
 * @param {string} handle - New user's handle
 * @param {object} claimResult - Result from claimHandle with genesis info
 */
async function sendWelcomeDM(handle, claimResult) {
  const kv = await getKV();
  if (!kv) return;

  const genesisNum = claimResult?.genesis_number || '?';
  const spotsLeft = claimResult?.spots_remaining;

  let text = `Hey @${handle}! Welcome to /vibe. You're Genesis #${genesisNum}.\n\n`;
  text += `Quick start:\n`;
  text += `• "who's around?" — see active builders\n`;
  text += `• "message @seth hello" — say hi\n`;
  text += `• "I'm shipping auth" — share what you're working on\n\n`;
  text += `Your handle is yours forever. Have fun creating.`;

  if (spotsLeft && spotsLeft <= 20) {
    text += `\n\n(${spotsLeft} genesis spots remaining)`;
  }

  const message = {
    id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    from: 'vibe',
    to: handle,
    text,
    createdAt: new Date().toISOString(),
    read: false,
    system: true
  };

  // Store directly in KV (same structure as messages.js)
  const pipeline = kv.pipeline();
  pipeline.set(`msg:${message.id}`, message);
  pipeline.lpush(`inbox:${handle}`, message.id);
  pipeline.ltrim(`inbox:${handle}`, 0, 99999);
  await pipeline.exec();

  console.log(`[presence] Welcome DM sent to @${handle}`);
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Vibe-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Update presence (heartbeat), typing indicator, or session registration
  if (req.method === 'POST') {
    try {
      const { username, workingOn, project, location, typingTo, context, sessionId, action } = req.body;

      // Handle availability check - no auth required, but rate limited
      if (action === 'check') {
        if (!username) {
          return res.status(400).json({
            success: false,
            error: "Handle check requires username"
          });
        }

        const handle = normalizeHandle(username);
        const kv = await getKV();

        // Rate limit handle checks to prevent enumeration
        if (kv) {
          try {
            const ipHash = hashIP(getClientIP(req));
            const rateResult = await checkRateLimit(kv, 'check', ipHash);
            setRateLimitHeaders(res, rateResult);

            if (!rateResult.success) {
              return rateLimitResponse(res, rateResult);
            }

            const availability = await isHandleAvailable(kv, handle);
            return res.status(200).json({
              success: true,
              handle,
              available: availability.available,
              reason: availability.reason || null
            });
          } catch (e) {
            console.error('[presence] KV check failed:', e.message);
            // Fall through to dev mode response
          }
        }

        // Dev mode / KV unavailable - optimistically available
        return res.status(200).json({
          success: true,
          handle,
          available: true,
          reason: null
        });
      }

      // Session registration - generate server-side sessionId and signed token
      if (action === 'register') {
        if (!username) {
          return res.status(400).json({
            success: false,
            error: "Session registration requires username (handle)"
          });
        }

        const handle = normalizeHandle(username);
        const kv = await getKV();
        let claimResult = null;

        // Try KV-based registration (rate limiting + handle claim)
        if (kv) {
          try {
            // ============ RATE LIMITING ============
            const ipHash = hashIP(getClientIP(req));
            const rateResult = await checkRateLimit(kv, 'register', ipHash);
            setRateLimitHeaders(res, rateResult);

            if (!rateResult.success) {
              console.warn(`[presence] Registration rate limit exceeded for IP hash ${ipHash}`);
              return rateLimitResponse(res, rateResult);
            }

            // ============ HANDLE AVAILABILITY CHECK ============
            // Check if this is a new registration or existing user
            const existingHandle = await getHandleRecord(kv, handle);

            if (existingHandle) {
              // Handle exists - create new session for existing user
              const serverSessionId = generateServerSessionId();
              const token = generateToken(serverSessionId, handle);
              await registerSession(serverSessionId, handle);

              console.log(`[presence] Existing handle @${handle} logged in with new session`);
              return res.status(200).json({
                success: true,
                action: 'login',
                sessionId: serverSessionId,
                handle,
                token,
                expiresIn: `${SESSION_TTL}s`,
                message: `Welcome back, @${handle}!`,
                registered: false
              });
            }

            // ============ ATOMIC HANDLE CLAIM ============
            claimResult = await claimHandle(kv, handle, {
              isAgent: false,
              operator: null
            });

            if (!claimResult.success) {
              const statusCode = claimResult.error === 'handle_taken' ? 409 : 400;
              return res.status(statusCode).json({
                success: false,
                error: claimResult.error,
                message: claimResult.message,
                suggestions: claimResult.suggestions || []
              });
            }

            console.log(`[presence] New handle @${handle} registered`);

            // Send welcome DM from @vibe (async, don't block registration)
            sendWelcomeDM(handle, claimResult).catch(e => {
              console.error(`[presence] Failed to send welcome DM to @${handle}:`, e.message);
            });
          } catch (e) {
            console.error('[presence] KV registration failed:', e.message);
            // Fall through to dev-mode registration
          }
        }

        // Generate session for new or dev-mode registration
        const serverSessionId = generateServerSessionId();
        const token = generateToken(serverSessionId, handle);
        await registerSession(serverSessionId, handle);

        // Build welcome message with genesis info
        let welcomeMessage = `Welcome to /vibe, @${handle}!`;
        if (claimResult && claimResult.genesis_number) {
          welcomeMessage = `Welcome to /vibe, @${handle}! You're Genesis #${claimResult.genesis_number} of ${claimResult.genesis_cap}.`;
          if (claimResult.spots_remaining > 0 && claimResult.spots_remaining <= 20) {
            welcomeMessage += ` Only ${claimResult.spots_remaining} spots left!`;
          }
        }

        return res.status(201).json({
          success: true,
          action: 'register',
          sessionId: serverSessionId,
          handle,
          token,
          expiresIn: `${SESSION_TTL}s`,
          message: welcomeMessage,
          registered: true,
          genesis: claimResult ? {
            number: claimResult.genesis_number,
            cap: claimResult.genesis_cap,
            spots_remaining: claimResult.spots_remaining
          } : null
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
              // AIRC v0.2: Check session timestamp against key rotation
              const { validateSessionTimestamp } = await import('./lib/auth.js');
              const sessionCreatedAt = new Date(session.registeredAt).getTime();
              const timestampValid = await validateSessionTimestamp(sql, session.handle, sessionCreatedAt);

              if (!timestampValid.valid) {
                return res.status(401).json({
                  success: false,
                  error: 'session_invalidated',
                  message: timestampValid.error,
                  reason: timestampValid.reason
                });
              }

              authenticatedHandle = session.handle;
              // Refresh session TTL
              await refreshSession(tokenSessionId);
            }
          }
        }
      }

      // DEPRECATED: Legacy fallback - sessionId without token
      // TODO: Remove after Jan 15, 2026 once all clients have migrated to token auth
      if (!authenticatedHandle && sessionId && !username) {
        const session = await getSession(sessionId);
        if (session) {
          console.warn(`[presence] DEPRECATED: Unauthenticated session access: ${sessionId} - migrate to token auth`);
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

      // ============ PRESENCE RATE LIMITING ============
      // Prevent heartbeat spam (5 updates per 10 seconds)
      const kv = await getKV();
      if (kv && authenticatedHandle) {
        const rateResult = await checkRateLimit(kv, 'presence', authenticatedHandle);
        // Don't set headers for heartbeats (they're frequent and expected)
        if (!rateResult.success) {
          // Silently drop excessive heartbeats - don't error
          return res.status(200).json({
            success: true,
            message: 'Heartbeat throttled',
            throttled: true
          });
        }
      }

      // Typing indicator - requires auth
      if (typingTo) {
        if (!authenticatedHandle) {
          return res.status(401).json({
            success: false,
            error: "Typing indicator requires authentication"
          });
        }
        const recipient = typingTo.toLowerCase().replace('@', '');
        // kv already available from rate limit check above
        if (kv) {
          try {
            await kv.set(`typing:${user}:${recipient}`, Date.now(), { ex: 5 }); // 5 second TTL
          } catch (e) {
            console.error('[presence] KV typing indicator failed:', e.message);
          }
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

      // Record activity in handle registry (for namespace management)
      // Note: kv already declared above in rate limiting section
      if (kv) {
        await recordActivity(kv, user).catch(() => {}); // Best-effort, don't fail heartbeat
      }

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
        try {
          const keys = await kv.keys(`typing:*:${forUser}`);
          const typingUsers = keys.map(k => k.split(':')[1]);
          return res.status(200).json({
            success: true,
            typingTo: forUser,
            typingUsers,
            count: typingUsers.length
          });
        } catch (e) {
          console.error('[presence] KV typing query failed:', e.message);
        }
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
