/**
 * API Store — Messages and presence via remote API
 *
 * Uses VIBE_API_URL environment variable
 */

const https = require('https');
const http = require('http');

const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'vibe-mcp/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);

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

async function registerSession(sessionId, handle) {
  try {
    const result = await request('POST', '/api/presence', {
      action: 'register',
      sessionId,
      username: handle
    });
    if (result.success) {
      currentSessionId = sessionId;
    }
    return result;
  } catch (e) {
    console.error('Session registration failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function heartbeat(handle, one_liner, context = null) {
  try {
    // Use sessionId if available, otherwise fall back to handle
    const payload = currentSessionId
      ? { sessionId: currentSessionId, workingOn: one_liner }
      : { username: handle, workingOn: one_liner };

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
    await request('POST', '/api/presence', {
      username: handle,
      typingTo: toHandle
    });
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
      mood: u.context?.mood || null,
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
    const data = { from, to, text: body };
    if (payload) {
      data.payload = payload;
    }
    const result = await request('POST', '/api/messages', data);
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

  // Helpers
  formatTimeAgo
};
