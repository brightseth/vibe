/**
 * API Store — Messages and presence via remote API
 *
 * Uses VIBE_API_URL environment variable
 * Uses HMAC-signed tokens for authentication
 */

const https = require('https');
const http = require('http');
const config = require('../config');

const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

// Default timeout for API requests (10 seconds)
const REQUEST_TIMEOUT = 10000;

function request(method, path, data = null, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const timeout = options.timeout || REQUEST_TIMEOUT;

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'vibe-mcp/1.0'
    };

    // Add auth token if provided or if we have one stored
    const token = options.token || config.getAuthToken();
    if (token && options.auth !== false) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
      timeout
    };

    const req = client.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Handle non-2xx responses
        if (res.statusCode >= 400) {
          try {
            const parsed = JSON.parse(body);
            resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}`, statusCode: res.statusCode });
          } catch (e) {
            resolve({ success: false, error: `HTTP ${res.statusCode}`, statusCode: res.statusCode });
          }
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    // Handle timeout
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Request timeout', timeout: true });
    });

    req.on('error', (e) => {
      resolve({ success: false, error: e.message, network: true });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// ============ PRESENCE ============

// Session ID for this MCP instance
let currentSessionId = null;

function setSessionId(sessionId) {
  currentSessionId = sessionId;
}

function getSessionId() {
  return currentSessionId;
}

async function registerSession(sessionId, handle, building = null) {
  try {
    // Register session for presence - server generates sessionId and returns signed token
    const result = await request('POST', '/api/presence', {
      action: 'register',
      username: handle
    }, { auth: false });  // Don't send token for registration (we don't have one yet)

    if (result.success && result.token) {
      // Use server-issued sessionId and token (not client-generated)
      currentSessionId = result.sessionId;

      // Save token for future authenticated requests
      config.setAuthToken(result.token, result.sessionId);

      console.error(`[vibe] Registered @${handle} with session ${result.sessionId}`);
    } else if (result.success) {
      // Fallback for servers that don't yet return tokens
      currentSessionId = sessionId;
      console.error(`[vibe] Registered @${handle} (legacy mode)`);
    }

    // Also register user in users DB (for @vibe welcome tracking)
    try {
      await request('POST', '/api/users', {
        username: handle,
        building: building || 'something cool'
      }, { auth: false });  // User registration doesn't need auth
    } catch (e) {
      // Non-fatal if user registration fails
    }

    return result;
  } catch (e) {
    console.error('Session registration failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function heartbeat(handle, one_liner, context = null) {
  try {
    // Token-based auth: server extracts handle from token
    // Only need to send workingOn and context
    const payload = { workingOn: one_liner };

    // Fallback: if no token, send username (legacy support)
    if (!config.getAuthToken()) {
      payload.username = handle;
    }

    // Add context (mood, file, etc.) if provided
    if (context) {
      payload.context = context;
    }

    await request('POST', '/api/presence', payload);
  } catch (e) {
    console.error('Heartbeat failed:', e.message);
  }
}

async function sendTypingIndicator(handle, toHandle) {
  try {
    // Token auth: server extracts sender from token
    const payload = { typingTo: toHandle };

    // Fallback for legacy
    if (!config.getAuthToken()) {
      payload.username = handle;
    }

    await request('POST', '/api/presence', payload);
  } catch (e) {
    console.error('Typing indicator failed:', e.message);
  }
}

async function getTypingUsers(forHandle) {
  try {
    const result = await request('GET', `/api/presence?user=${forHandle}&typing=true`);
    return result.typingUsers || [];
  } catch (e) {
    return [];
  }
}

async function getActiveUsers() {
  try {
    const result = await request('GET', '/api/presence');
    // Combine active and away users
    const users = [...(result.active || []), ...(result.away || [])];
    return users.map(u => ({
      handle: u.username,
      one_liner: u.workingOn,
      lastSeen: new Date(u.lastSeen).getTime(),
      status: u.status,
      // Mood: explicit (context.mood) or inferred (u.mood)
      mood: u.context?.mood || u.mood || null,
      mood_inferred: u.mood_inferred || false,
      mood_reason: u.mood_reason || null,
      builderMode: u.builderMode || null,
      // Context sharing fields
      file: u.context?.file || null,
      branch: u.context?.branch || null,
      repo: u.context?.repo || null,
      error: u.context?.error || null,
      note: u.context?.note || null
    }));
  } catch (e) {
    console.error('Who failed:', e.message);
    return [];
  }
}

async function setVisibility(handle, visible) {
  // TODO: implement visibility toggle API
}

// ============ MESSAGES ============

async function sendMessage(from, to, body, type = 'dm', payload = null) {
  try {
    // Always include 'from' for the API (it will be verified against token)
    const data = { from, to, text: body };
    if (payload) {
      data.payload = payload;
    }
    const result = await request('POST', '/api/messages', data);

    // Handle auth errors
    if (!result.success && result.error?.includes('Authentication')) {
      console.error('[vibe] Auth failed for message. Try `vibe init` to re-register.');
      return null;
    }

    return result.message;
  } catch (e) {
    console.error('Send failed:', e.message);
    return null;
  }
}

async function getInbox(handle) {
  try {
    const result = await request('GET', `/api/messages?user=${handle}`);
    // Group messages by sender into threads
    const bySender = result.bySender || {};
    return Object.entries(bySender).map(([sender, messages]) => ({
      handle: sender,
      messages: messages.map(m => ({
        from: m.from,
        body: m.text,
        timestamp: new Date(m.createdAt).getTime(),
        read: m.read
      })),
      unread: messages.filter(m => !m.read).length,
      lastMessage: messages[0]?.text,
      lastTimestamp: new Date(messages[0]?.createdAt).getTime()
    }));
  } catch (e) {
    console.error('Inbox failed:', e.message);
    return [];
  }
}

async function getUnreadCount(handle) {
  try {
    const result = await request('GET', `/api/messages?user=${handle}`);
    return result.unread || 0;
  } catch (e) {
    return 0;
  }
}

async function getThread(myHandle, theirHandle) {
  try {
    const result = await request('GET', `/api/messages?user=${myHandle}&with=${theirHandle}`);
    return (result.thread || []).map(m => ({
      from: m.from,
      body: m.text,
      payload: m.payload || null,
      timestamp: new Date(m.createdAt).getTime(),
      direction: m.direction
    }));
  } catch (e) {
    console.error('Thread failed:', e.message);
    return [];
  }
}

async function markThreadRead(myHandle, theirHandle) {
  // Reading thread via API already marks as read
}

// ============ CONSENT ============

async function getConsentStatus(from, to) {
  try {
    const result = await request('GET', `/api/consent?from=${from}&to=${to}`);
    return result;
  } catch (e) {
    console.error('Consent check failed:', e.message);
    return { status: 'none' };
  }
}

async function getPendingConsents(handle) {
  try {
    const result = await request('GET', '/api/consent');
    return result.pending || [];
  } catch (e) {
    console.error('Pending consents failed:', e.message);
    return [];
  }
}

async function acceptConsent(from, to) {
  try {
    const result = await request('POST', '/api/consent', {
      action: 'accept',
      from,
      to
    });
    return result;
  } catch (e) {
    console.error('Accept consent failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function blockUser(from, to) {
  try {
    const result = await request('POST', '/api/consent', {
      action: 'block',
      from,
      to
    });
    return result;
  } catch (e) {
    console.error('Block failed:', e.message);
    return { success: false, error: e.message };
  }
}

// ============ HELPERS ============

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

module.exports = {
  // Session
  registerSession,
  setSessionId,
  getSessionId,

  // Presence
  heartbeat,
  getActiveUsers,
  setVisibility,
  sendTypingIndicator,
  getTypingUsers,

  // Messages
  sendMessage,
  getInbox,
  getUnreadCount,
  getThread,
  markThreadRead,

  // Consent
  getConsentStatus,
  getPendingConsents,
  acceptConsent,
  blockUser,

  // Helpers
  formatTimeAgo
};
